import { Env, UserPayload, CreateInviteRequest, Invite } from '../types';
import { json, error } from '../utils/response';
import { hasPermission, PERMISSIONS } from '../utils/permissions';

function generateInviteCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export async function createInvite(request: Request, env: Env, user: UserPayload): Promise<Response> {
  let body: CreateInviteRequest;
  try {
    body = await request.json<CreateInviteRequest>();
  } catch {
    return error("Geçersiz veri.", 400);
  }

  // Sunucu aktif mi?
  const server = await env.DB.prepare("SELECT deleted_at FROM servers WHERE id = ?").bind(body.server_id).first<{deleted_at: number}>();
  if (!server || server.deleted_at) return error("Sunucu bulunamadı.", 404);

  let channelId = body.channel_id;
  if (!channelId) {
    const defaultChannel = await env.DB.prepare("SELECT id FROM channels WHERE server_id = ? AND deleted_at IS NULL ORDER BY created_at ASC LIMIT 1")
      .bind(body.server_id).first<{ id: string }>();
    if (!defaultChannel) return error("Kanal yok.", 400);
    channelId = defaultChannel.id;
  }

  const canCreate = await hasPermission(env, user.uid, body.server_id, channelId, PERMISSIONS.CREATE_INVITE);
  if (!canCreate) return error("Yetkiniz yok.", 403);

  const code = generateInviteCode();
  const now = Date.now();
  const expiresAt = body.expires_in ? (now + body.expires_in * 1000) : (now + 315360000000); 

  try {
    await env.DB.prepare(`
      INSERT INTO invites (code, server_id, inviter_id, channel_id, max_uses, uses, expires_at, created_at)
      VALUES (?, ?, ?, ?, ?, 0, ?, ?)
    `).bind(code, body.server_id, user.uid, channelId, body.max_uses || 0, expiresAt, now).run();

    return json({ message: "Davet oluşturuldu.", invite_code: code }, 201);
  } catch (err: any) {
    return error("Hata oluştu.", 500, err.message);
  }
}

export async function joinServer(request: Request, env: Env, user: UserPayload, inviteCode: string): Promise<Response> {
  if (!inviteCode) return error("Kod gerekli.", 400);

  const invite = await env.DB.prepare("SELECT * FROM invites WHERE code = ?").bind(inviteCode).first<Invite>();
  if (!invite) return error("Geçersiz kod.", 404);

  // KONTROL 1: Sunucu silinmiş mi?
  const server = await env.DB.prepare("SELECT deleted_at FROM servers WHERE id = ?").bind(invite.server_id).first<{deleted_at: number}>();
  if (!server || server.deleted_at) return error("Bu sunucu artık mevcut değil (Silinmiş).", 410);

  // KONTROL 2: Davetin kanalı silinmiş mi?
  const channel = await env.DB.prepare("SELECT deleted_at FROM channels WHERE id = ?").bind(invite.channel_id).first<{deleted_at: number}>();
  if (!channel || channel.deleted_at) return error("Davetin bağlı olduğu kanal silinmiş.", 410);

  const now = Date.now();
  if (invite.expires_at < now) return error("Davet süresi dolmuş.", 410);
  if (invite.max_uses > 0 && invite.uses >= invite.max_uses) return error("Limit dolmuş.", 410);

  // KONTROL 3: Ban
  const isBanned = await env.DB.prepare("SELECT 1 FROM server_bans WHERE server_id = ? AND user_id = ?")
    .bind(invite.server_id, user.uid).first();
  if (isBanned) return error("Yasaklısınız.", 403);

  // KONTROL 4: Zaten Üye mi? (SOFT DELETE KONTROLÜ) [GÜNCELLENDİ]
  // Sadece 'left_at IS NULL' olanları kontrol ediyoruz. Eğer kayıt var ama left_at doluysa, kişi çıkmıştır ve tekrar girebilir.
  const currentMember = await env.DB.prepare("SELECT 1 FROM server_members WHERE server_id = ? AND user_id = ? AND left_at IS NULL")
    .bind(invite.server_id, user.uid).first();
  
  if (currentMember) return json({ message: "Zaten üyesiniz.", server_id: invite.server_id });

  try {
    const defaultRole = await env.DB.prepare("SELECT id FROM roles WHERE server_id = ? AND position = 0 LIMIT 1")
      .bind(invite.server_id).first<{ id: string }>();

    // [GÜNCELLEME] UPSERT (ON CONFLICT) MANTIĞI EKLENDİ
    // Eğer kullanıcı daha önce girip çıkmışsa, eski kaydı güncelliyoruz.
    // Eğer hiç girmemişse yeni kayıt oluşturuyoruz.
    await env.DB.batch([
      env.DB.prepare(`
        INSERT INTO server_members (server_id, user_id, role_id, joined_at, left_at)
        VALUES (?, ?, ?, ?, NULL)
        ON CONFLICT(server_id, user_id) DO UPDATE SET
          joined_at = excluded.joined_at, -- Yeni giriş tarihini güncelle
          left_at = NULL,                 -- Çıkış tarihini sil (Geri geldi)
          role_id = excluded.role_id      -- Rolü varsayılan role çevir (Yetkileri sıfırla)
      `).bind(invite.server_id, user.uid, defaultRole?.id || null, now),

      env.DB.prepare("UPDATE invites SET uses = uses + 1 WHERE code = ?").bind(inviteCode)
    ]);

    return json({ message: "Katıldınız!", server_id: invite.server_id, channel_id: invite.channel_id });
  } catch (err: any) {
    return error("Hata oluştu.", 500, err.message);
  }
}