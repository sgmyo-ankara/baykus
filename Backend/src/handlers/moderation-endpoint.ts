// src/handlers/moderation-endpoint.ts
import { Env, UserPayload, BanMemberRequest } from '../types';
import { json, error } from '../utils/response';
import { hasPermission, PERMISSIONS } from '../utils/permissions';

// 1. KULLANICIYI YASAKLA (BAN)
export async function banMember(request: Request, env: Env, user: UserPayload, serverId: string): Promise<Response> {
  let body: BanMemberRequest;
  try {
    body = await request.json<BanMemberRequest>();
  } catch {
    return error("Geçersiz veri formatı.", 400);
  }

  if (!body.user_id) return error("Hedef kullanıcı ID gerekli.", 400);
  if (body.user_id === user.uid) return error("Kendinizi banlayamazsınız.", 400);

  // Yetki Kontrolü: BAN_MEMBERS (32)
  const canBan = await hasPermission(env, user.uid, serverId, "", PERMISSIONS.BAN_MEMBERS);
  if (!canBan) return error("Yasaklama yetkiniz yok.", 403);

  // Hiyerarşi Kontrolü
  const targetMember = await env.DB.prepare(`
    SELECT r.position 
    FROM server_members sm
    LEFT JOIN roles r ON sm.role_id = r.id
    WHERE sm.server_id = ? AND sm.user_id = ? AND sm.left_at IS NULL
  `).bind(serverId, body.user_id).first<{ position: number }>();

  if (targetMember) {
    const myRole = await env.DB.prepare(`
      SELECT r.position 
      FROM server_members sm
      LEFT JOIN roles r ON sm.role_id = r.id
      WHERE sm.server_id = ? AND sm.user_id = ? AND sm.left_at IS NULL
    `).bind(serverId, user.uid).first<{ position: number }>();

    const myPos = myRole?.position || 0;
    const targetPos = targetMember.position || 0;
    
    // Sunucu sahibi kontrolü
    const server = await env.DB.prepare("SELECT owner_id FROM servers WHERE id = ?").bind(serverId).first<{owner_id: string}>();
    
    if (server?.owner_id !== user.uid) {
        if (targetPos >= myPos) return error("Sizden yetkili birini banlayamazsınız.", 403);
    }
  }

  try {
    // [GÜNCELLEME] Soft Delete Mantığı
    await env.DB.batch([
      // Ban Tablosuna Ekle
      env.DB.prepare(`
        INSERT INTO server_bans (server_id, user_id, reason, banned_by, created_at)
        VALUES (?, ?, ?, ?, ?)
      `).bind(serverId, body.user_id, body.reason || "Sebep belirtilmedi", user.uid, Date.now()),

      // Sunucudan At (DELETE yerine UPDATE)
      // left_at güncellenir ve role_id sıfırlanır.
      env.DB.prepare(`
        UPDATE server_members 
        SET left_at = ?, role_id = NULL
        WHERE server_id = ? AND user_id = ? AND left_at IS NULL
      `).bind(Date.now(), serverId, body.user_id)
    ]);

    return json({ message: "Kullanıcı yasaklandı." });
  } catch (err: any) {
    if (err.message.includes("UNIQUE")) return error("Kullanıcı zaten yasaklı.", 409);
    return error("İşlem başarısız.", 500, err.message);
  }
}

// 2. YASAĞI KALDIR (UNBAN)
export async function unbanMember(request: Request, env: Env, user: UserPayload, serverId: string, targetUserId: string): Promise<Response> {
  const canBan = await hasPermission(env, user.uid, serverId, "", PERMISSIONS.BAN_MEMBERS);
  if (!canBan) return error("Yasak kaldırma yetkiniz yok.", 403);

  const res = await env.DB.prepare("DELETE FROM server_bans WHERE server_id = ? AND user_id = ?")
    .bind(serverId, targetUserId).run();

  if (res.meta.changes === 0) return error("Yasak bulunamadı.", 404);

  return json({ message: "Yasak kaldırıldı." });
}

// 3. YASAKLILARI LİSTELE
export async function getBans(request: Request, env: Env, user: UserPayload, serverId: string): Promise<Response> {
  const canBan = await hasPermission(env, user.uid, serverId, "", PERMISSIONS.BAN_MEMBERS);
  if (!canBan) return error("Yetkiniz yok.", 403);

  const bans = await env.DB.prepare(`
    SELECT b.*, u.username, u.avatar_url 
    FROM server_bans b
    JOIN users u ON b.user_id = u.id
    WHERE b.server_id = ?
    ORDER BY b.created_at DESC
  `).bind(serverId).all();

  return json(bans.results);
}

// 4. SUNUCUDAN AYRIL (LEAVE)
export async function leaveServer(request: Request, env: Env, user: UserPayload, serverId: string): Promise<Response> {
  const server = await env.DB.prepare("SELECT owner_id FROM servers WHERE id = ?").bind(serverId).first<{owner_id: string}>();
  
  if (!server) return error("Sunucu bulunamadı.", 404);
  if (server.owner_id === user.uid) return error("Sunucu sahibi ayrılamaz. Önce sunucuyu devredin veya silin.", 400);

  // [GÜNCELLEME] Soft Delete (DELETE yerine UPDATE)
  const res = await env.DB.prepare(`
    UPDATE server_members 
    SET left_at = ?, role_id = NULL
    WHERE server_id = ? AND user_id = ? AND left_at IS NULL
  `).bind(Date.now(), serverId, user.uid).run();

  if (res.meta.changes === 0) return error("Zaten üye değilsiniz veya daha önce ayrıldınız.", 400);

  return json({ message: "Sunucudan ayrıldınız." });
}