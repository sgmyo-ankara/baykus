// src/handlers/query-endpoint.ts
import { Env, UserPayload } from '../types';
import { json, error } from '../utils/response';
import { hasPermission, PERMISSIONS } from '../utils/permissions';

// 1. MESAJLARI GETİR (Sunucu veya DM)
export async function getMessages(request: Request, env: Env, user: UserPayload, channelId: string, isDm: boolean = false): Promise<Response> {
  const url = new URL(request.url);
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 100); 
  const before = url.searchParams.get('before'); 

  // Tablo ve Kolon Seçimi
  const table = isDm ? 'dm_messages' : 'messages';
  const channelCol = isDm ? 'dm_channel_id' : 'channel_id';
  const attachmentTable = isDm ? 'dm_attachments' : 'attachments';
  const attachJoinCol = isDm ? 'dm_message_id' : 'message_id';
  const senderCol = isDm ? 'sender_id' : 'author_id'; 

  // --- YETKİ VE VARLIK KONTROLÜ ---
  if (isDm) {
    const isMember = await env.DB.prepare(
      "SELECT 1 FROM dm_members WHERE dm_channel_id = ? AND user_id = ?"
    ).bind(channelId, user.uid).first();
    
    if (!isMember) return error("Bu sohbet geçmişine erişim yetkiniz yok.", 403);
  
  } else {
    // SUNUCU: Kanal ve Sunucu Kontrolü (Soft Delete Dahil)
    const channel = await env.DB.prepare(
      "SELECT server_id, deleted_at FROM channels WHERE id = ?"
    ).bind(channelId).first<{ server_id: string, deleted_at: number }>();
    
    if (!channel) return error("Kanal bulunamadı.", 404);
    if (channel.deleted_at) return error("Bu kanal artık mevcut değil (Silinmiş).", 410);
    
    const server = await env.DB.prepare(
      "SELECT deleted_at FROM servers WHERE id = ?"
    ).bind(channel.server_id).first<{ deleted_at: number }>();
    
    if (!server || server.deleted_at) return error("Bu sunucu artık mevcut değil.", 410);

    // Yetki Kontrolü
    const canView = await hasPermission(env, user.uid, channel.server_id, channelId, PERMISSIONS.VIEW_CHANNEL);
    if (!canView) return error("Bu kanalı görüntüleme yetkiniz yok.", 403);
  }

  // --- SORGUNUN HAZIRLANMASI ---
  // GÜNCELLEME: "is_deleted = 0" filtresi YOK. Silinenler de çekiliyor.
  let query = `
    SELECT m.*, 
           u.username, u.avatar_url as author_avatar,
           a.path as attachment_path, a.file_size, a.content_type
    FROM ${table} m
    JOIN users u ON m.${senderCol} = u.id
    LEFT JOIN ${attachmentTable} a ON m.id = a.${attachJoinCol}
    WHERE m.${channelCol} = ? 
  `;

  const params: any[] = [channelId];

  // Infinite Scroll (Cursor)
if (before) {
    query += ` AND m.id < ?`;
    
    // ESKİ HALİ (HATALI): params.push(before); 
    // YENİ HALİ (DOĞRU): String'i BigInt'e çeviriyoruz
    try {
        params.push(BigInt(before).toString()); 
        // Not: Cloudflare D1 bazen BigInt'i direkt kabul eder, bazen string olarak ister. 
        // Ancak en garantisi SQL sorgusunda CAST yapmaktır veya buraya BigInt olarak vermektir.
        // Eğer D1 driver'ı BigInt destekliyorsa direkt BigInt(before) da olur.
        // En güvenli yöntem parametre olarak BigInt yollamaktır:
        // params.push(BigInt(before));
    } catch (e) {
        // Eğer before parametresi saçma sapan bir yazıysa (örn: "abc") hata patlamasın
        return error("Geçersiz imleç (cursor) parametresi.", 400); 
    }
  }

  // Sıralama (En yeniden eskiye)
  query += ` ORDER BY m.id DESC LIMIT ?`;
  params.push(limit);

  const results = await env.DB.prepare(query).bind(...params).all();

  // --- VERİ DÖNÜŞÜMÜ (MAPPING & SANITIZATION) ---
  const messages = results.results.map((msg: any) => {
    // GÜNCELLEME: SİLİNMİŞ MESAJ GİZLEME (SANITIZATION) 🛡️
    if (msg.is_deleted) {
        return {
            id: msg.id,
            server_id: msg.server_id,
            channel_id: msg.channel_id,
            author_id: isDm ? msg.sender_id : msg.author_id,
            
            // İÇERİK SIFIRLANIYOR
            content: null, 
            has_attachment: false,
            attachment: null,
            
            is_deleted: true,
            is_edited: false,
            created_at: msg.created_at,
            internal_counter: msg.internal_counter,
            reply_to_id: msg.reply_to_id,
            
            // Yazar bilgisi korunuyor
            author: {
                id: isDm ? msg.sender_id : msg.author_id,
                username: msg.username,
                avatar_url: msg.author_avatar
            }
        };
    }

    // --- NORMAL MESAJ ---
    const author = {
      id: isDm ? msg.sender_id : msg.author_id,
      username: msg.username,
      avatar_url: msg.author_avatar
    };

    let attachment = null;
    if (msg.attachment_path) {
      attachment = {
        url: `/cdn/${msg.attachment_path}`,
        file_size: msg.file_size,
        content_type: msg.content_type
      };
    }

    return {
      id: msg.id,
      content: msg.content,
      internal_counter: msg.internal_counter,
      created_at: msg.created_at,
      reply_to_id: msg.reply_to_id,
      is_edited: !!msg.is_edited,
      is_deleted: false,
      has_attachment: !!msg.has_attachment,
      author: author,
      attachment: attachment
    };
  });

  return json({
    messages: messages, 
    hasMore: messages.length === limit
  });
}

// 2. KULLANICININ SUNUCULARINI GETİR (Sadece Aktif Olanlar)
export async function getUserServers(request: Request, env: Env, user: UserPayload): Promise<Response> {
  const query = `
    SELECT s.id, s.name, s.icon_url, s.owner_id
    FROM server_members sm
    JOIN servers s ON sm.server_id = s.id
    WHERE sm.user_id = ? 
    AND s.deleted_at IS NULL 
    AND sm.left_at IS NULL  -- [GÜNCELLEME] Ayrılmış sunucuları gizle
    ORDER BY sm.joined_at DESC
  `;
  
  const servers = await env.DB.prepare(query).bind(user.uid).all();
  return json(servers.results);
}

// 3. SUNUCU KANALLARINI GETİR (Sadece Aktif ve Yetkili Olanlar)
export async function getServerChannels(request: Request, env: Env, user: UserPayload, serverId: string): Promise<Response> {
  // Önce üyelik kontrolü (Hala içeride mi?)
  const isMember = await env.DB.prepare(
    "SELECT 1 FROM server_members WHERE server_id = ? AND user_id = ? AND left_at IS NULL"
  ).bind(serverId, user.uid).first();
  
  if (!isMember) return error("Bu sunucunun üyesi değilsiniz.", 403);

  // Sunucu aktif mi?
  const server = await env.DB.prepare(
    "SELECT deleted_at FROM servers WHERE id = ?"
  ).bind(serverId).first<{deleted_at: number}>();
  
  if (!server || server.deleted_at) return error("Sunucu bulunamadı veya silinmiş.", 404);

  // Kanalları çek (Silinenler hariç)
  const allChannels = await env.DB.prepare(
    "SELECT * FROM channels WHERE server_id = ? AND deleted_at IS NULL ORDER BY type, created_at"
  ).bind(serverId).all<any>();
    
  // Yetki Kontrolü
  const visibleChannels = [];
  for (const ch of allChannels.results) {
    const canView = await hasPermission(env, user.uid, serverId, ch.id, PERMISSIONS.VIEW_CHANNEL);
    if (canView) {
      visibleChannels.push(ch);
    }
  }

  return json(visibleChannels);
}

// 4. KULLANICININ DM KUTUSUNU GETİR (GÜNCELLENDİ: Snowflake Sıralaması)
export async function getUserDMs(request: Request, env: Env, user: UserPayload): Promise<Response> {
  const query = `
    SELECT 
      c.id, c.type, c.name, c.icon_url,
      
      -- Diğer Kullanıcı İsmi
      (SELECT u.username 
       FROM dm_members m2 
       JOIN users u ON m2.user_id = u.id 
       WHERE m2.dm_channel_id = c.id AND m2.user_id != ? LIMIT 1) as other_username,
       
      -- Diğer Kullanıcı Avatarı
      (SELECT u.avatar_url 
       FROM dm_members m2 
       JOIN users u ON m2.user_id = u.id 
       WHERE m2.dm_channel_id = c.id AND m2.user_id != ? LIMIT 1) as other_avatar,

      -- SIRALAMA MANTIĞI:
      -- O kanaldaki en büyük mesaj ID'sini (en son atılan mesajı) bul.
      -- Snowflake ID kullandığımız için ID boyutu zamana eşittir.
      -- Eğer hiç mesaj yoksa kanalın kendi ID'sini (oluşturulma zamanını) kullan.
      COALESCE(
        (SELECT MAX(id) FROM dm_messages WHERE dm_channel_id = c.id), 
        c.id
      ) as sort_id

    FROM dm_members m
    JOIN dm_channels c ON m.dm_channel_id = c.id
    WHERE m.user_id = ?
    
    -- Hesaplanan "sort_id" değerine göre sırala (En yeni işlem en üstte)
    ORDER BY sort_id DESC
  `;

  // Bind Sırası: other_username, other_avatar, main_where_clause
  const dms = await env.DB.prepare(query)
    .bind(user.uid, user.uid, user.uid)
    .all();
  
  const cleanDms = dms.results.map((dm: any) => {
    if (dm.type === 1) {
      dm.name = dm.other_username || "Bilinmeyen Kullanıcı";
      dm.icon_url = dm.other_avatar;
    }
    delete dm.other_username;
    delete dm.other_avatar;
    delete dm.sort_id; // Sıralama ID'sini gizliyoruz
    return dm;
  });

  return json(cleanDms);
}