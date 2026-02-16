// src/handlers/members-endpoint.ts
import { Env, UserPayload } from '../types';
import { json, error } from '../utils/response';
import { hasPermission, PERMISSIONS } from '../utils/permissions';

// --- SABİTLER ---
const USER_STATUS_OFFLINE = 0;
const USER_STATUS_INVISIBLE = 8;

// =========================================================
// 🛠️ SHARDING & PRESENCE YARDIMCILARI (Helper Functions)
// =========================================================
// (Bu fonksiyonlar friends-endpoint ile aynı mantıktadır)

function getShardName(userId: string): string {
    const lastChar = userId.slice(-1);
    if (/[0-9]/.test(lastChar)) {
        return `shard-${lastChar}`;
    }
    return `shard-0`;
}

async function queryPresence(env: Env, userIds: string[]): Promise<Record<string, boolean>> {
    if (!env.PRESENCE) return {};

    // 1. Gruplama (Batching)
    const shards: Record<string, string[]> = {};
    userIds.forEach(uid => {
        const shardName = getShardName(uid);
        if (!shards[shardName]) shards[shardName] = [];
        shards[shardName].push(uid);
    });

    // 2. Paralel İstek (Fan-Out)
    const promises = Object.keys(shards).map(async (shardName) => {
        try {
            const doId = env.PRESENCE.idFromName(shardName);
            const stub = env.PRESENCE.get(doId);
            
            // Presence DO'ya soruyoruz: "Bu ID'ler online mı?"
            const res = await stub.fetch("http://presence?action=query", {
                method: "POST",
                body: JSON.stringify({ user_ids: shards[shardName] })
            });
            
            if (res.ok) {
                return await res.json() as Record<string, boolean>;
            }
        } catch (e) {
            console.error(`Presence Query Error (${shardName}):`, e);
        }
        return {};
    });

    // 3. Sonuçları Birleştir (Fan-In)
    const resultsArray = await Promise.all(promises);
    return Object.assign({}, ...resultsArray);
}

// =========================================================
// 🚀 1. ÜYE LİSTESİ (SQL + PRESENCE MERGE + SORTING)
// =========================================================
export async function getServerMembers(request: Request, env: Env, user: UserPayload, serverId: string): Promise<Response> {
  // Üyelik Kontrolü
  const isMember = await env.DB.prepare("SELECT 1 FROM server_members WHERE server_id = ? AND user_id = ?")
    .bind(serverId, user.uid).first();
  
  if (!isMember) return error("Sunucu üyesi değilsiniz.", 403);

  // 1. SQL'den Ham Veriyi Çek
  // (status: Kullanıcının DB'deki tercihi -> 1:Online, 2:DND, 4:Idle)
  const query = `
    SELECT sm.user_id, sm.joined_at, 
           u.username, u.avatar_url, u.status as db_status,
           r.name as role_name, r.color as role_color, r.position as role_position
    FROM server_members sm
    JOIN users u ON sm.user_id = u.id
    LEFT JOIN roles r ON sm.role_id = r.id
    WHERE sm.server_id = ?
  `;

  const { results } = await env.DB.prepare(query).bind(serverId).all<any>();
  if (!results) return json([]);

  // 2. Presence İçin Adayları Belirle
  // (Görünmez olanları sorgulamaya gerek yok, onlar zaten offline görünmeli)
  const candidates = results
    .filter(m => m.db_status !== USER_STATUS_INVISIBLE)
    .map(m => m.user_id);

  // 3. DO'ya Sor: "Kimler Gerçekten Bağlı?"
  const onlineMap = candidates.length > 0 ? await queryPresence(env, candidates) : {};

  // 4. Veriyi İşle (Merge)
  const finalMembers = results.map(member => {
      // Varsayılan: Offline
      let realStatus = USER_STATUS_OFFLINE; 

      // Eğer DB'de görünmez değilse VE DO'da kaydı varsa -> DB statüsünü kullan
      if (member.db_status !== USER_STATUS_INVISIBLE && onlineMap[member.user_id]) {
          realStatus = member.db_status;
      }

      return {
          ...member,
          status: realStatus, // Frontend artık bu 'status'u kullanacak (Gerçek Durum)
          is_online: realStatus !== USER_STATUS_OFFLINE // Kolay filtreleme için flag
      };
  });

  // 5. SIRALAMA MANTIĞI (GÜNCELLENDİ)
  // İstenen Öncelik Sırası:
  // 1. Online Durumu (Online olanlar en üstte)
  // 2. Rol Pozisyonu (Yetkisi yüksek olanlar üstte)
  // 3. İsim Sırası (A-Z)
  
  finalMembers.sort((a, b) => {
      // A) Önce Online Durumuna Bak
      // status > 0 ise online demektir.
      const onlineA = a.status > 0 ? 1 : 0;
      const onlineB = b.status > 0 ? 1 : 0;
      
      // Eğer durumları farklıysa, Online olan (1) öne geçer.
      if (onlineA !== onlineB) return onlineB - onlineA;

      // B) Sonra Rol Pozisyonuna Bak (Online durumları eşitse)
      const posA = a.role_position || 0;
      const posB = b.role_position || 0;
      
      // Eğer pozisyonları farklıysa, yüksek pozisyon öne geçer.
      if (posA !== posB) return posB - posA;

      // C) Sonra İsme Bak (Hem durumları hem rolleri eşitse)
      return a.username.localeCompare(b.username);
  });

  return json(finalMembers);
}

// =========================================================
// 2. ÜYE ATMA (KICK) - (Aynen Korundu)
// =========================================================
export async function kickMember(request: Request, env: Env, user: UserPayload, serverId: string, targetUserId: string): Promise<Response> {
  if (targetUserId === user.uid) return error("Kendinizi atamazsınız.", 400);

  // Yetki Kontrolü: KICK_MEMBERS (16)
  const canKick = await hasPermission(env, user.uid, serverId, "", PERMISSIONS.KICK_MEMBERS);
  if (!canKick) return error("Üye atma yetkiniz yok.", 403);

  const targetMember = await env.DB.prepare(`
    SELECT r.position 
    FROM server_members sm
    LEFT JOIN roles r ON sm.role_id = r.id
    WHERE sm.server_id = ? AND sm.user_id = ?
  `).bind(serverId, targetUserId).first<{ position: number }>();

  if (!targetMember) return error("Kullanıcı sunucuda bulunamadı.", 404);

  const myRole = await env.DB.prepare(`
    SELECT r.position 
    FROM server_members sm
    LEFT JOIN roles r ON sm.role_id = r.id
    WHERE sm.server_id = ? AND sm.user_id = ?
  `).bind(serverId, user.uid).first<{ position: number }>();

  const myPos = myRole?.position || 0;
  const targetPos = targetMember.position || 0;

  // Sunucu Sahibi Kontrolü
  const server = await env.DB.prepare("SELECT owner_id FROM servers WHERE id = ?").bind(serverId).first<{ owner_id: string }>();
  
  if (server?.owner_id !== user.uid) {
    if (targetPos >= myPos) {
      return error("Sizden yetkili veya aynı yetkideki birini atamazsınız.", 403);
    }
  }

  await env.DB.prepare("DELETE FROM server_members WHERE server_id = ? AND user_id = ?")
    .bind(serverId, targetUserId).run();

  return json({ message: "Üye sunucudan atıldı." });
}