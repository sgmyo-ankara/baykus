// src/handlers/search-endpoint.ts
import { Env, UserPayload } from '../types';
import { json, error } from '../utils/response';
import { hasPermission, PERMISSIONS } from '../utils/permissions';

// 1. SUNUCU KANALINDA ARA
export async function searchChannelMessages(request: Request, env: Env, user: UserPayload, channelId: string): Promise<Response> {
  const url = new URL(request.url);
  const queryText = url.searchParams.get('q'); // ?q=kelime

  if (!queryText || queryText.trim().length < 2) {
    return error("Arama yapmak için en az 2 karakter girmelisiniz.", 400);
  }

  // A. Kanalı ve Sunucuyu Bul
  const channel = await env.DB.prepare("SELECT server_id FROM channels WHERE id = ?").bind(channelId).first<{ server_id: string }>();
  if (!channel) return error("Kanal bulunamadı.", 404);

  // B. Yetki Kontrolü (VIEW_CHANNEL)
  // Kullanıcı kanalı göremiyorsa, içinde arama da yapamaz.
  const canView = await hasPermission(env, user.uid, channel.server_id, channelId, PERMISSIONS.VIEW_CHANNEL);
  if (!canView) return error("Bu kanalda arama yapma yetkiniz yok.", 403);

  // C. Arama Sorgusu (LIKE)
  // Mesaj içeriğinde aranan kelime geçiyor mu?
  // Ayrıca gönderen kişinin bilgilerini ve varsa dosya ekini de çekiyoruz.
  const sql = `
    SELECT m.*, 
           u.username, u.avatar_url,
           a.path as attachment_path, a.file_size, a.content_type
    FROM messages m
    JOIN users u ON m.author_id = u.id
    LEFT JOIN attachments a ON m.id = a.message_id
    WHERE m.channel_id = ? 
      AND m.content LIKE ? 
      AND m.is_deleted = 0
    ORDER BY m.created_at DESC
    LIMIT 50
  `;

  // %aranan% formatı, kelimenin ortasında, başında veya sonunda geçmesini yakalar.
  const results = await env.DB.prepare(sql)
    .bind(channelId, `%${queryText}%`)
    .all();

  // CDN Linklerini Düzenle
  const messages = results.results.map((msg: any) => {
    if (msg.attachment_path) {
      msg.attachment_url = `/cdn/${msg.attachment_path}`;
    }
    return msg;
  });

  return json({
    query: queryText,
    count: messages.length,
    messages: messages
  });
}

// 2. DM / GRUP SOHBETİNDE ARA
export async function searchDMMessages(request: Request, env: Env, user: UserPayload, dmChannelId: string): Promise<Response> {
  const url = new URL(request.url);
  const queryText = url.searchParams.get('q');

  if (!queryText || queryText.trim().length < 2) {
    return error("Arama yapmak için en az 2 karakter girmelisiniz.", 400);
  }

  // A. Üyelik Kontrolü
  // Kullanıcı bu DM'in bir parçası mı?
  const isMember = await env.DB.prepare("SELECT 1 FROM dm_members WHERE dm_channel_id = ? AND user_id = ?")
    .bind(dmChannelId, user.uid).first();

  if (!isMember) return error("Bu sohbet geçmişinde arama yapamazsınız.", 403);

  // B. Arama Sorgusu
  const sql = `
    SELECT m.*, 
           u.username, u.avatar_url,
           a.path as attachment_path, a.file_size, a.content_type
    FROM dm_messages m
    JOIN users u ON m.sender_id = u.id
    LEFT JOIN dm_attachments a ON m.id = a.dm_message_id
    WHERE m.dm_channel_id = ? 
      AND m.content LIKE ?
      AND m.is_deleted = 0
    ORDER BY m.created_at DESC
    LIMIT 50
  `;

  const results = await env.DB.prepare(sql)
    .bind(dmChannelId, `%${queryText}%`)
    .all();

  const messages = results.results.map((msg: any) => {
    if (msg.attachment_path) {
      msg.attachment_url = `/cdn/${msg.attachment_path}`;
    }
    return msg;
  });

  return json({
    query: queryText,
    count: messages.length,
    messages: messages
  });
}