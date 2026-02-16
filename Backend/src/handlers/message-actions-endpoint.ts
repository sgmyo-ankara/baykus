// src/handlers/message-actions-endpoint.ts
import { Env, UserPayload, EditMessageRequest, ReactionRequest } from '../types';
import { json, error } from '../utils/response';
import { hasPermission, PERMISSIONS } from '../utils/permissions';

// Yardımcı: Mesajın nerede olduğunu (Server/DM) bulur
async function findMessageContext(env: Env, messageId: string) {
  const serverMsg = await env.DB.prepare("SELECT * FROM messages WHERE id = ?").bind(messageId).first<any>();
  if (serverMsg) return { type: 'SERVER', msg: serverMsg };

  const dmMsg = await env.DB.prepare("SELECT * FROM dm_messages WHERE id = ?").bind(messageId).first<any>();
  if (dmMsg) return { type: 'DM', msg: dmMsg };

  return null;
}

// YARDIMCI: DO'ya Sinyal Gönder (Broadcast)
async function broadcastToChannel(env: Env, channelId: string, type: string, payload: any) {
  // GÜVENLİK: Durable Object binding kontrolü
  if (!env.CHAT_ROOM) {
      console.warn("Broadcast iptal: CHAT_ROOM tanımlı değil.");
      return;
  }

  try {
    const doId = env.CHAT_ROOM.idFromName(channelId);
    const stub = env.CHAT_ROOM.get(doId);
    
    // [FIX] URL path değil, query param kullanıyoruz (?action=broadcast)
    await stub.fetch("https://chat-room?action=broadcast", {
      method: "POST",
      body: JSON.stringify({ type, payload }) 
    });
  } catch (e) {
    console.error(`Broadcast Error (${type}):`, e);
  }
}

// 1. MESAJ DÜZENLEME (EDIT)
export async function editMessage(request: Request, env: Env, user: UserPayload, messageId: string): Promise<Response> {
  let body: EditMessageRequest;
  try {
    body = await request.json<EditMessageRequest>();
  } catch {
    return error("Geçersiz veri formatı.", 400);
  }

  if (!body.content || body.content.trim().length === 0) return error("Mesaj içeriği boş olamaz.", 400);
  if (body.content.length > 2000) return error("Mesaj 2000 karakteri geçemez.", 400);

  const context = await findMessageContext(env, messageId);
  if (!context) return error("Mesaj bulunamadı.", 404);

  if (!!context.msg.is_deleted) return error("Silinmiş mesaj düzenlenemez.", 400);

  const authorId = context.type === 'SERVER' ? context.msg.author_id : context.msg.sender_id;
  const channelId = context.type === 'SERVER' ? context.msg.channel_id : context.msg.dm_channel_id;

  if (authorId !== user.uid) {
    return error("Sadece kendi mesajınızı düzenleyebilirsiniz.", 403);
  }

  const table = context.type === 'SERVER' ? 'messages' : 'dm_messages';
  
  await env.DB.prepare(`
    UPDATE ${table} 
    SET content = ?, is_edited = 1 
    WHERE id = ?
  `).bind(body.content, messageId).run();

  const responseData = { 
      message_id: messageId, 
      channel_id: channelId,
      content: body.content, 
      is_edited: true 
  };

  // Broadcast tetikleme
  await broadcastToChannel(env, channelId, "MESSAGE_UPDATE", responseData);

  return json({ message: "Mesaj düzenlendi.", data: responseData });
}

// 2. MESAJ SİLME (SOFT DELETE)
export async function deleteMessage(request: Request, env: Env, user: UserPayload, messageId: string): Promise<Response> {
  const context = await findMessageContext(env, messageId);
  if (!context) return error("Mesaj bulunamadı.", 404);

  let canDelete = false;

  if (context.type === 'SERVER') {
    if (context.msg.author_id === user.uid) {
      canDelete = true;
    } else {
      const hasManagePerm = await hasPermission(
        env, user.uid, context.msg.server_id, context.msg.channel_id, PERMISSIONS.MANAGE_MESSAGES
      );
      if (hasManagePerm) canDelete = true;
    }
  } else {
    if (context.msg.sender_id === user.uid) canDelete = true;
  }

  if (!canDelete) return error("Bu mesajı silme yetkiniz yok.", 403);

  const table = context.type === 'SERVER' ? 'messages' : 'dm_messages';
  const channelId = context.type === 'SERVER' ? context.msg.channel_id : context.msg.dm_channel_id;
  
  await env.DB.prepare(`
    UPDATE ${table} 
    SET is_deleted = 1
    WHERE id = ?
  `).bind(messageId).run();

  // Broadcast tetikleme
  await broadcastToChannel(env, channelId, "MESSAGE_DELETE", { 
    message_id: messageId,
    channel_id: channelId,
    is_deleted: true
  });

  return json({ 
    message: "Mesaj silindi.", 
    id: messageId, 
    is_deleted: true 
  });
}

// 3. REAKSİYON
export async function toggleReaction(request: Request, env: Env, user: UserPayload, messageId: string): Promise<Response> {
  let body: ReactionRequest;
  try {
    body = await request.json<ReactionRequest>();
  } catch {
    return error("Geçersiz veri formatı.", 400);
  }

  if (!body.emoji) return error("Emoji gerekli.", 400);

  const context = await findMessageContext(env, messageId);
  if (!context) return error("Mesaj bulunamadı.", 404);

  const table = context.type === 'SERVER' ? 'reactions' : 'dm_reactions';
  const msgCol = context.type === 'SERVER' ? 'message_id' : 'dm_message_id';
  const channelId = context.type === 'SERVER' ? context.msg.channel_id : context.msg.dm_channel_id;

  if (context.type === 'SERVER') {
    const canView = await hasPermission(env, user.uid, context.msg.server_id, context.msg.channel_id, PERMISSIONS.VIEW_CHANNEL);
    if (!canView) return error("Bu mesaja erişiminiz yok.", 403);
  } else {
    const isMember = await env.DB.prepare("SELECT 1 FROM dm_members WHERE dm_channel_id = ? AND user_id = ?")
      .bind(context.msg.dm_channel_id, user.uid).first();
    if (!isMember) return error("Bu DM'e erişiminiz yok.", 403);
  }

  const existing = await env.DB.prepare(`
    SELECT id FROM ${table} WHERE ${msgCol} = ? AND user_id = ? AND emoji = ?
  `).bind(messageId, user.uid, body.emoji).first<{id: number}>();

  let action = "";

  if (existing) {
    await env.DB.prepare(`DELETE FROM ${table} WHERE id = ?`).bind(existing.id).run();
    action = "removed";
  } else {
    await env.DB.prepare(`
      INSERT INTO ${table} (${msgCol}, user_id, emoji, created_at)
      VALUES (?, ?, ?, ?)
    `).bind(messageId, user.uid, body.emoji, Date.now()).run();
    action = "added";
  }

  // Broadcast tetikleme
  await broadcastToChannel(env, channelId, "REACTION_UPDATE", {
      message_id: messageId,
      channel_id: channelId,
      user_id: user.uid,
      emoji: body.emoji,
      action: action
  });

  return json({ message: "Reaksiyon güncellendi.", action: action, emoji: body.emoji });
}