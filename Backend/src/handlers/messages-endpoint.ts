// src/handlers/messages-endpoint.ts
import { Env, UserPayload, SendMessageRequest, Attachment } from '../types';
import { json, error } from '../utils/response';
import { generateSnowflakeID } from '../utils/snowflake';
import { hasPermission, PERMISSIONS } from '../utils/permissions';

export async function sendMessage(request: Request, env: Env, user: UserPayload, channelId: string): Promise<Response> {
  // 1. Veri Doğrulama
  let body: SendMessageRequest;
  try {
    body = await request.json<SendMessageRequest>();
  } catch {
    return error("Geçersiz veri formatı.", 400);
  }

  const hasContent = body.content && body.content.trim().length > 0;
  const hasFile = body.attachment && body.attachment.path;

  if (!hasContent && !hasFile) return error("Mesaj boş olamaz.", 400);
  if (body.content && body.content.length > 2000) return error("Karakter limiti aşıldı.", 400);

  try {
    // 2. KANAL VE SUNUCU BİLGİSİ
    const channel = await env.DB.prepare("SELECT server_id FROM channels WHERE id = ?")
      .bind(channelId)
      .first<{ server_id: string }>();

    if (!channel) return error("Kanal bulunamadı.", 404);

    // 3. YETKİ KONTROLÜ: SEND_MESSAGES
    const canSend = await hasPermission(
      env, 
      user.uid, 
      channel.server_id, 
      channelId, 
      PERMISSIONS.SEND_MESSAGES
    );

    if (!canSend) {
      return error("Bu kanala mesaj gönderme yetkiniz yok.", 403);
    }

    // --- GÜNCEL KULLANICI BİLGİSİNİ ÇEK ---
    // JWT içindeki avatar eski olabilir, DB'den taze veri çekiyoruz.
    const authorData = await env.DB.prepare(`
      SELECT id, username, avatar_url
      FROM users WHERE id = ?
    `).bind(user.uid).first<{ id: string, username: string, avatar_url: string | null }>();
    
    const finalAuthor = {
        id: authorData?.id || user.uid,
        username: authorData?.username || "Unknown",
        avatar_url: authorData?.avatar_url || null
    };

    // 4. MESAJI HAZIRLA
    const messageId = generateSnowflakeID();
    const now = Date.now();
    
    // Internal Counter (Sıralama için)
    const lastCount = await env.DB.prepare(
      "SELECT count(*) as count FROM messages WHERE channel_id = ?"
    ).bind(channelId).first<{ count: number }>();
    const nextCounter = (lastCount?.count || 0) + 1;

    const statements = [];

    // A. Mesaj Insert 
    statements.push(env.DB.prepare(`
      INSERT INTO messages (id, server_id, channel_id, author_id, content, internal_counter, reply_to_id, has_attachment, is_deleted, is_edited, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 0, ?)
    `).bind(
      messageId, channel.server_id, channelId, user.uid, 
      body.content || "", nextCounter, body.reply_to_id || null, 
      hasFile ? 1 : 0, now
    ));

    // B. Attachment Insert (Varsa)
    let attachmentData: Attachment | null = null;
    if (hasFile && body.attachment) {
      const attachmentId = generateSnowflakeID();
      statements.push(env.DB.prepare(`
        INSERT INTO attachments (id, message_id, path, file_size, content_type, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).bind(
        attachmentId, messageId, body.attachment.path, 
        body.attachment.file_size, body.attachment.content_type, now
      ));
      
      attachmentData = {
        id: attachmentId, message_id: messageId, path: body.attachment.path,
        file_size: body.attachment.file_size, content_type: body.attachment.content_type, created_at: now
      };
    }

    // İşlemi Gerçekleştir (Batch Transaction)
    await env.DB.batch(statements);

    // 5. YANIT OBJESİ OLUŞTUR (FULL STANDARD)
    const newMessageData = {
      id: messageId,
      server_id: channel.server_id,
      channel_id: channelId,
      author_id: user.uid,
      content: body.content || "",
      internal_counter: nextCounter,
      reply_to_id: body.reply_to_id || null,
      created_at: now,
      is_edited: false,
      is_deleted: false,
      has_attachment: hasFile ? true : false, 
      attachment: attachmentData,
      author: finalAuthor 
    };

    // 6. REAL-TIME BROADCAST (CANLI YAYIN) ⚡
    // [FIX] URL Path değil, Query Param kullanıyoruz (?action=broadcast)
    if (env.CHAT_ROOM) {
      try {
        const doId = env.CHAT_ROOM.idFromName(channelId);
        const stub = env.CHAT_ROOM.get(doId);
        
        await stub.fetch("https://chat-room?action=broadcast", {
          method: "POST",
          body: JSON.stringify({
            type: "NEW_MESSAGE",
            payload: newMessageData 
          })
        });
      } catch (e) {
        console.error("Broadcast Error:", e);
      }
    }

    return json({
      message: "Mesaj gönderildi",
      payload: newMessageData
    }, 201);

  } catch (err: any) {
    console.error("Send Message Error:", err);
    return error("Mesaj gönderilemedi.", 500, err.message);
  }
}