// src/handlers/dm-endpoint.ts
import { Env, UserPayload, CreateDMRequest, DMChannel } from '../types';
import { json, error } from '../utils/response';
import { generateSnowflakeID } from '../utils/snowflake';

export async function createDM(request: Request, env: Env, user: UserPayload): Promise<Response> {
  let body: CreateDMRequest;
  try {
    body = await request.json<CreateDMRequest>();
  } catch {
    return error("Geçersiz veri formatı. JSON bekleniyor.", 400);
  }

  // ==========================================================
  // SENARYO 1: GRUP SOHBETİ OLUŞTURMA (Type 2 veya user_ids var)
  // ==========================================================
  // Birden fazla kişinin konuşacağı yapı burasıdır.
  if (body.type === 2 || (body.user_ids && body.user_ids.length > 0)) {
    
    // Validasyonlar
    if (!body.group_name || body.group_name.trim().length < 1) {
      return error("Grup sohbeti için bir isim (group_name) gereklidir.", 400);
    }
    if (!body.user_ids || body.user_ids.length === 0) {
      return error("Grup oluşturmak için en az 1 arkadaşınızı seçmelisiniz.", 400);
    }
    // Güvenlik Limiti: Bir gruba aynı anda en fazla 50 kişi eklenebilsin
    if (body.user_ids.length > 50) {
      return error("Grup kişi limiti aşıldı (Max 50).", 400);
    }

    const channelId = generateSnowflakeID();
    const now = Date.now();

    try {
      // BATCH İŞLEMİ HAZIRLIĞI
      // Kanalı ve tüm üyeleri tek bir veritabanı işleminde kaydedeceğiz.
      const statements = [];

      // 1. Kanalı Oluştur (dm_channels)
      // owner_id: Grubu kuran kişi (user.uid)
      // name: body.group_name
      statements.push(
        env.DB.prepare(`
          INSERT INTO dm_channels (id, type, owner_id, name, icon_url) 
          VALUES (?, 2, ?, ?, NULL)
        `).bind(channelId, user.uid, body.group_name)
      );

      // 2. Kurucuyu (Kendini) Üye Olarak Ekle
      statements.push(
        env.DB.prepare(`
          INSERT INTO dm_members (dm_channel_id, user_id) 
          VALUES (?, ?)
        `).bind(channelId, user.uid)
      );

      // 3. Arkadaşları Üye Olarak Ekle
      // Set kullanarak listedeki olası tekrarları (duplicate) temizliyoruz.
      const uniqueUsers = [...new Set(body.user_ids)];
      
      for (const friendUid of uniqueUsers) {
        // Kendini tekrar ekleme (zaten yukarıda ekledik)
        if (friendUid !== user.uid) {
          statements.push(
            env.DB.prepare(`
              INSERT INTO dm_members (dm_channel_id, user_id) 
              VALUES (?, ?)
            `).bind(channelId, friendUid)
          );
        }
      }

      // Veritabanına Yaz (Ateşle!)
      await env.DB.batch(statements);

      // Yanıt Dön
      const newGroup: DMChannel = {
        id: channelId,
        type: 2,
        owner_id: user.uid,
        name: body.group_name,
        icon_url: null,
        created_at: now,
        member_count: uniqueUsers.length + 1 // Kendisi + arkadaşlar
      };

      return json({
        message: "Grup başarıyla oluşturuldu.",
        channel: newGroup
      }, 201);

    } catch (err: any) {
      console.error("Group Create Error:", err);
      return error("Grup oluşturulurken hata oluştu.", 500, err.message);
    }
  }

  // ==========================================================
  // SENARYO 2: BİREBİR SOHBET (Type 1)
  // ==========================================================
  else if (body.target_user_id) {
    const targetId = body.target_user_id;

    if (targetId === user.uid) {
      return error("Kendinizle DM başlatamazsınız.", 400);
    }

    try {
      // a) Zaten var mı? (Optimization)
      // İki kullanıcının ortak olduğu ve Tipi 1 olan kanalı bul.
      const existingChannel = await env.DB.prepare(`
        SELECT c.* FROM dm_channels c
        JOIN dm_members m1 ON c.id = m1.dm_channel_id
        JOIN dm_members m2 ON c.id = m2.dm_channel_id
        WHERE c.type = 1 
          AND m1.user_id = ? 
          AND m2.user_id = ?
        LIMIT 1
      `).bind(user.uid, targetId).first<DMChannel>();

      if (existingChannel) {
        return json({
          message: "Sohbet bulundu.",
          channel: existingChannel,
          // Birebir sohbetlerde name ve icon null gelir, frontend bunu yönetmeli
        });
      }

      // b) Yoksa yeni oluştur
      const channelId = generateSnowflakeID();
      const now = Date.now();

      await env.DB.batch([
        // Kanalı oluştur (Type 1, name=NULL, owner_id=NULL)
        env.DB.prepare("INSERT INTO dm_channels (id, type) VALUES (?, 1)").bind(channelId),
        // Beni ekle
        env.DB.prepare("INSERT INTO dm_members (dm_channel_id, user_id) VALUES (?, ?)").bind(channelId, user.uid),
        // Hedef kullanıcıyı ekle
        env.DB.prepare("INSERT INTO dm_members (dm_channel_id, user_id) VALUES (?, ?)").bind(channelId, targetId)
      ]);

      const newChannel: DMChannel = {
        id: channelId,
        type: 1,
        owner_id: null,
        name: null, 
        icon_url: null,
        created_at: now
      };

      return json({
        message: "Sohbet başlatıldı.",
        channel: newChannel
      }, 201);

    } catch (err: any) {
      console.error("DM Create Error:", err);
      return error("Sohbet başlatılamadı.", 500, err.message);
    }
  }

  return error("Eksik parametre: Grup için 'group_name' ve 'user_ids', birebir için 'target_user_id' gereklidir.", 400);
}