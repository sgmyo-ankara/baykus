// src/handlers/dm-messages-endpoint.ts
import { Env, UserPayload, SendDMRequest, Attachment } from '../types';
import { json, error } from '../utils/response';
import { generateSnowflakeID } from '../utils/snowflake';

export async function sendDMMessage(request: Request, env: Env, user: UserPayload, dmChannelId: string): Promise<Response> {
  // 1. Veri Doğrulama
  let body: SendDMRequest;
  try {
    body = await request.json<SendDMRequest>();
  } catch {
    return error("Geçersiz veri formatı.", 400);
  }

  const hasContent = body.content && body.content.trim().length > 0;
  const hasFile = body.attachment && body.attachment.path;

  if (!hasContent && !hasFile) {
    return error("Mesaj boş olamaz (metin veya dosya gerekli).", 400);
  }

  try {
    // 2. KANAL TİPİ VE ÜYELİK KONTROLÜ
    // Sadece "var mı" diye bakmak yerine, Type bilgisini de çekiyoruz.
    const dmContext = await env.DB.prepare(`
      SELECT c.type 
      FROM dm_members m
      JOIN dm_channels c ON m.dm_channel_id = c.id
      WHERE m.dm_channel_id = ? AND m.user_id = ?
    `).bind(dmChannelId, user.uid).first<{ type: number }>();

    if (!dmContext) {
      return error("Bu sohbete erişim yetkiniz yok.", 403);
    }

    // 3. ENGEL KONTROLÜ (BLOCK CHECK) 🛡️
    // Sadece Birebir (Type 1) sohbetlerde engel varsa mesaj gitmez (Hard Block).
    if (dmContext.type === 1) {
      // Karşı tarafın ID'sini bul
      const target = await env.DB.prepare(`
        SELECT user_id FROM dm_members WHERE dm_channel_id = ? AND user_id != ?
      `).bind(dmChannelId, user.uid).first<{ user_id: string }>();

      if (target) {
        // İlişki durumunu kontrol et (Status 8 = Blocked)
        const relation = await env.DB.prepare(`
          SELECT status 
          FROM friends 
          WHERE (user_1 = ? AND user_2 = ?) OR (user_1 = ? AND user_2 = ?)
        `).bind(user.uid, target.user_id, target.user_id, user.uid).first<{ status: number }>();

        if (relation && relation.status === 8) {
          return error("Mesaj gönderilemedi. Kullanıcı engeli mevcut.", 403);
        }
      }
    }

    // 4. Mesaj Hazırlığı
    const messageId = generateSnowflakeID();
    const now = Date.now();
    
    // Internal Counter
    const lastCount = await env.DB.prepare(
      "SELECT count(*) as count FROM dm_messages WHERE dm_channel_id = ?"
    ).bind(dmChannelId).first<{ count: number }>();
    
    const nextCounter = (lastCount?.count || 0) + 1;

    const statements = [];

    // A. DM Mesajı Ekle
    // is_deleted: 0, is_edited: 0 varsayılan değerleri.
    statements.push(env.DB.prepare(`
      INSERT INTO dm_messages (id, dm_channel_id, sender_id, content, internal_counter, reply_to_id, has_attachment, is_deleted, is_edited, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0, ?)
    `).bind(
      messageId, dmChannelId, user.uid, body.content || "", nextCounter, 
      body.reply_to_id || null, hasFile ? 1 : 0, now
    ));

    let attachmentData: Attachment | null = null;

    // B. DM Attachment Ekle
    if (hasFile && body.attachment) {
      const attachmentId = generateSnowflakeID();
      statements.push(env.DB.prepare(`
        INSERT INTO dm_attachments (id, dm_message_id, path, file_size, content_type, created_at)
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

    // İşlemi Gerçekleştir
    await env.DB.batch(statements);

    // 5. Yanıt Dön ve Broadcast Hazırlığı
    const newMessageData = {
      id: messageId,
      dm_channel_id: dmChannelId,
      sender_id: user.uid,
      content: body.content || "",
      internal_counter: nextCounter,
      reply_to_id: body.reply_to_id || null,
      has_attachment: hasFile ? true : false, 
      is_deleted: false, 
      is_edited: false,
      created_at: now,
      attachment: attachmentData,
      // Frontend için yazar bilgisini ekliyoruz (Gerekirse)
      author: {
        id: user.uid,
        username: user.username,
        avatar_url: user.avatar_url
      }
    };

    // 6. REAL-TIME BROADCAST (DM İÇİN) ⚡
    // Burası Durable Object'i tetikleyen kısımdır.
    if (env.CHAT_ROOM) {
      try {
        const doId = env.CHAT_ROOM.idFromName(dmChannelId);
        const stub = env.CHAT_ROOM.get(doId);
        
        // ChatRoom.ts içindeki "action=broadcast" bloğuna POST isteği atıyoruz.
        // URL'in domain kısmı önemli değil, internal fetch yapılır.
        const broadcastUrl = new URL("http://internal/broadcast");
        broadcastUrl.searchParams.set("action", "broadcast");

        await stub.fetch(broadcastUrl.toString(), {
          method: "POST",
          body: JSON.stringify({
            type: "NEW_MESSAGE", // Frontend bu tipi dinlemeli
            data: newMessageData // Frontend bu veriyi listeye ekleyecek
          })
        });

      } catch (e) {
        console.error("DM Broadcast Hatası:", e);
        // Yayın hatası olsa bile mesaj kaydedildiği için işlemi başarılı sayıp devam ediyoruz.
      }
    } else {
        console.warn("env.CHAT_ROOM tanımlı değil, mesaj broadcast edilmedi.");
    }

    return json({
      message: "DM gönderildi.",
      data: newMessageData
    }, 201);

  } catch (err: any) {
    return error("Mesaj gönderilemedi.", 500, err.message);
  }
}