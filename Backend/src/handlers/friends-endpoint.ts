// src/handlers/friends-endpoint.ts
import { Env, UserPayload, FriendRequestPayload, FriendRespondPayload, Friend, User } from '../types';
import { json, error } from '../utils/response';

// Durum Sabitleri (Veritabanı ile uyumlu)
const STATUS_PENDING = 1;
const STATUS_ACCEPTED = 2;
const STATUS_REJECTED = 4;
const STATUS_BLOCKED = 8;
const STATUS_UNFRIENDED = 16; 

// Kullanıcı Görünürlük Ayarları
const USER_STATUS_INVISIBLE = 8;
const USER_STATUS_OFFLINE = 0; // Bizim atayacağımız "Bağlı Değil" değeri

// Deterministic ID
function generateFriendshipID(uid1: string, uid2: string): string {
  const [first, second] = [uid1, uid2].sort();
  return `${first}_${second}`;
}

// ---------------------------------------------------------
// SHARDING & PRESENCE YARDIMCILARI (GÜNCELLENDİ)
// ---------------------------------------------------------

// Sharding Helper: ID'nin son karakterine göre DO ismini bulur (0-9)
function getShardName(userId: string): string {
    const lastChar = userId.slice(-1);
    if (/[0-9]/.test(lastChar)) {
        return `shard-${lastChar}`;
    }
    return `shard-0`; // Rakamla bitmeyen garip ID'ler için fallback
}

// Helper: DO'lara Toplu Sorgu At (Fan-Out)
// Verilen ID listesini gruplara ayırır, paralel sorar ve sonuçları birleştirir.
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

// ---------------------------------------------------------
// 1. İSTEK GÖNDERME / RETRY
// ---------------------------------------------------------
export async function sendFriendRequest(request: Request, env: Env, user: UserPayload): Promise<Response> {
  let body: FriendRequestPayload;
  try {
    body = await request.json<FriendRequestPayload>();
  } catch {
    return error("Geçersiz veri formatı.", 400);
  }

  if (!body.target_username) return error("Kullanıcı adı gerekli.", 400);

  const targetUser = await env.DB.prepare("SELECT * FROM users WHERE username = ?")
    .bind(body.target_username.toLowerCase())
    .first<User>();

  if (!targetUser) return error("Kullanıcı bulunamadı.", 404);
  if (targetUser.id === user.uid) return error("Kendinize istek atamazsınız.", 400);

  const friendshipId = generateFriendshipID(user.uid, targetUser.id);
  const now = Date.now();

  try {
    const existing = await env.DB.prepare("SELECT * FROM friends WHERE friendship_id = ?")
      .bind(friendshipId).first<Friend>();

    // SENARYO A: Yeni Kayıt
    if (!existing) {
      const [u1, u2] = [user.uid, targetUser.id].sort();
      await env.DB.prepare(`
        INSERT INTO friends (friendship_id, user_1, user_2, status, is_seen, last_action_by, created_at, updated_at)
        VALUES (?, ?, ?, ?, 0, ?, ?, ?)
      `).bind(friendshipId, u1, u2, STATUS_PENDING, user.uid, now, now).run();

      return json({ message: "Arkadaşlık isteği gönderildi.", status: "SENT" }, 201);
    }

    // SENARYO B: Mevcut Kayıt Kontrolü
    if (existing.status === STATUS_ACCEPTED) {
      return error("Zaten arkadaşsınız.", 400);
    }

    if (existing.status === STATUS_PENDING) {
      if (existing.last_action_by === user.uid) {
        return error("Zaten bekleyen bir isteğiniz var.", 400);
      } else {
        return error("Bu kullanıcı size zaten istek göndermiş. Lütfen kabul edin.", 400);
      }
    }

    if (existing.status === STATUS_BLOCKED) {
      if (existing.last_action_by === user.uid) {
         return error("Bu kullanıcıyı engellemişsiniz.", 400);
      } else {
         return error("Bu kullanıcıya istek gönderilemiyor.", 403);
      }
    }

    // RETRY LOGIC (Reddedilmiş veya Silinmişse tekrar ekle)
    if (existing.status === STATUS_REJECTED || existing.status === STATUS_UNFRIENDED) {
      await env.DB.prepare(`
        UPDATE friends 
        SET status = ?, is_seen = 0, last_action_by = ?, updated_at = ?
        WHERE friendship_id = ?
      `).bind(STATUS_PENDING, user.uid, now, friendshipId).run();

      return json({ message: "Arkadaşlık isteği tekrar gönderildi.", status: "SENT" });
    }

    return error("Bilinmeyen durum.", 500);

  } catch (err: any) {
    return error("İşlem hatası.", 500, err.message);
  }
}

// ---------------------------------------------------------
// 2. YANIT VERME VE YÖNETME (Kabul/Red/Engel/Sil)
// ---------------------------------------------------------
export async function respondToFriendRequest(request: Request, env: Env, user: UserPayload): Promise<Response> {
  let body: FriendRespondPayload;
  try {
    body = await request.json<FriendRespondPayload>();
  } catch {
    return error("Geçersiz veri formatı.", 400);
  }

  if (!body.friendship_id || !body.action) return error("Eksik parametre.", 400);

  const existing = await env.DB.prepare("SELECT * FROM friends WHERE friendship_id = ?")
    .bind(body.friendship_id).first<Friend>();

  if (!existing) return error("İstek bulunamadı.", 404);

  // Kimlik Kontrolü
  if (existing.user_1 !== user.uid && existing.user_2 !== user.uid) {
    return error("Yetkisiz işlem.", 403);
  }

  const now = Date.now();
  let newStatus = existing.status;

  // --- AKSİYON MANTIĞI ---
  
  // 1. KABUL ET
  if (body.action === 'ACCEPT') {
    if (existing.status !== STATUS_PENDING) return error("Sadece bekleyen istekler kabul edilebilir.", 400);
    if (existing.last_action_by === user.uid) return error("Kendi isteğinizi kabul edemezsiniz.", 400);
    newStatus = STATUS_ACCEPTED;
  } 
  
  // 2. REDDET
  else if (body.action === 'REJECT') {
    if (existing.status !== STATUS_PENDING) return error("Sadece bekleyen istekler reddedilebilir.", 400);
    newStatus = STATUS_REJECTED;
  } 
  
  // 3. ENGELLE
  else if (body.action === 'BLOCK') {
    newStatus = STATUS_BLOCKED;
  } 
  
  // 4. ARKADAŞTAN ÇIKAR (REMOVE)
  else if (body.action === 'REMOVE') {
    if (existing.status !== STATUS_ACCEPTED) return error("Sadece arkadaş listesindekiler çıkarılabilir.", 400);
    newStatus = STATUS_UNFRIENDED;
  } 
  
  else {
    return error("Geçersiz aksiyon.", 400);
  }

  // Veritabanını Güncelle
  await env.DB.prepare(`
    UPDATE friends 
    SET status = ?, is_seen = 0, last_action_by = ?, updated_at = ?
    WHERE friendship_id = ?
  `).bind(newStatus, user.uid, now, body.friendship_id).run();

  return json({ message: "İşlem başarılı.", new_status: body.action });
}

// ---------------------------------------------------------
// 3. LİSTELEME (Initial Load - SQL + DO Entegrasyonlu)
// ---------------------------------------------------------
export async function getFriends(request: Request, env: Env, user: UserPayload): Promise<Response> {
  const url = new URL(request.url);
  const type = url.searchParams.get('type'); // 'all', 'pending', 'blocked'

  let query = `
    SELECT f.*, 
           u.id as friend_id, u.username, u.avatar_url, u.status as db_status
    FROM friends f
    JOIN users u ON (CASE WHEN f.user_1 = ? THEN f.user_2 ELSE f.user_1 END) = u.id
    WHERE (f.user_1 = ? OR f.user_2 = ?)
  `;
  
  const params: any[] = [user.uid, user.uid, user.uid];

  if (type === 'pending') {
    query += ` AND f.status = ${STATUS_PENDING} AND f.last_action_by != ?`;
    params.push(user.uid);
  } else if (type === 'blocked') {
    query += ` AND f.status = ${STATUS_BLOCKED} AND f.last_action_by = ?`;
    params.push(user.uid);
  } else {
    // Varsayılan: Sadece Kabul Edilmişler (Listede silinenler görünmez)
    query += ` AND f.status = ${STATUS_ACCEPTED}`;
  }

  const dbResults = await env.DB.prepare(query).bind(...params).all<any>();
  const friends = dbResults.results || [];

  // --- PRESENCE ENTEGRASYONU (GÜNCELLENDİ) ---
  
  // 1. Adayları Belirle
  // Sadece DB statüsü "Görünmez" (8) OLMAYANLARI presence'a soruyoruz.
  // Bu, görünmezlerin asla sorgulanmamasını garanti eder.
  const candidates = friends
    .filter(f => f.db_status !== USER_STATUS_INVISIBLE) 
    .map(f => f.friend_id);

  // 2. DO'ya Sor (Fan-Out)
  const onlineMap = candidates.length > 0 ? await queryPresence(env, candidates) : {};

  // 3. Sonuçları İşle (Fan-In)
  const finalData = friends.map(f => {
      // a) Veritabanında "Görünmez" (8) ise -> KESİNLİKLE OFFLINE
      if (f.db_status === USER_STATUS_INVISIBLE) {
          return { ...f, online_status: USER_STATUS_OFFLINE }; 
      }

      // b) Presence Map kontrolü
      // onlineMap[id] true ise -> online (DB statüsünü göster: Meşgul, Boşta vb.)
      // onlineMap[id] false veya yoksa -> offline
      const isOnline = onlineMap[f.friend_id];
      
      return { 
          ...f, 
          online_status: isOnline ? f.db_status : USER_STATUS_OFFLINE 
      };
  });

  return json({ data: finalData });
}

// ---------------------------------------------------------
// 4. DURUM KONTROLÜ (Polling Endpoint - SQL Korumalı)
// ---------------------------------------------------------
export async function checkFriendStatus(request: Request, env: Env, user: UserPayload): Promise<Response> {
    try {
        const body = await request.json() as { user_ids: string[] };
        if (!body.user_ids || !Array.isArray(body.user_ids)) return error("Liste gerekli", 400);

        // SQL'e gitmiyoruz! Frontend bize ID'leri veriyor.
        // Frontend'in buraya "Görünmez" olanları eklemediğini varsayıyoruz ama
        // DO zaten sadece bağlı olanlara "true" döneceği için güvenli.
        
        const onlineMap = await queryPresence(env, body.user_ids);
        
        return json({ online_status: onlineMap });

    } catch (e: any) {
        return error("Polling hatası", 500, e.message);
    }
}

// ---------------------------------------------------------
// 5. BİLDİRİMİ GÖRÜLDÜ YAPMA
// ---------------------------------------------------------
export async function markAsSeen(request: Request, env: Env, user: UserPayload): Promise<Response> {
  const now = Date.now();

  await env.DB.prepare(`
    UPDATE friends
    SET is_seen = 1,
        updated_at = ?
    WHERE (user_1 = ? OR user_2 = ?)
      AND last_action_by != ? 
      AND is_seen = 0
  `).bind(now, user.uid, user.uid, user.uid).run();

  return json({ success: true });
}