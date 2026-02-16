import { Env, UserPayload, CreateServerRequest, Server } from '../types';
import { json, error } from '../utils/response';
import { generateSnowflakeID } from '../utils/snowflake';
import { PERMISSIONS } from '../utils/permissions';

export async function createServer(request: Request, env: Env, user: UserPayload): Promise<Response> {
  let body: CreateServerRequest;
  try {
    body = await request.json<CreateServerRequest>();
  } catch {
    return error("Geçersiz veri formatı.", 400);
  }

  if (!body.name || body.name.trim().length < 3) {
    return error("Sunucu adı en az 3 karakter olmalıdır.", 400);
  }

  const serverId = generateSnowflakeID();
  const roleAdminId = generateSnowflakeID();
  const roleEveryoneId = generateSnowflakeID();
  const channelGeneralId = generateSnowflakeID();
  const now = Date.now();

  try {
    const statements = [
      // 1. Sunucu
      env.DB.prepare("INSERT INTO servers (id, name, owner_id, icon_url, created_at) VALUES (?, ?, ?, ?, ?)")
        .bind(serverId, body.name, user.uid, body.icon_url || null, now),

      // 2. Yönetici Rolü (Tüm yetkiler)
      env.DB.prepare("INSERT INTO roles (id, server_id, name, permissions, color, position, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)")
        .bind(roleAdminId, serverId, 'Yönetici', PERMISSIONS.ADMINISTRATOR, '#E91E63', 999, now),
      
      // 3. Everyone Rolü
      env.DB.prepare("INSERT INTO roles (id, server_id, name, permissions, color, position, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)")
        .bind(roleEveryoneId, serverId, '@everyone', PERMISSIONS.VIEW_CHANNEL | PERMISSIONS.SEND_MESSAGES, '#99AAB5', 0, now),

      // 4. Kurucuyu Sunucuya Ekle
      env.DB.prepare("INSERT INTO server_members (server_id, user_id, role_id, joined_at) VALUES (?, ?, ?, ?)")
        .bind(serverId, user.uid, roleAdminId, now),

      // 5. İlk Kanal
      env.DB.prepare("INSERT INTO channels (id, server_id, name, type, created_at) VALUES (?, ?, ?, ?, ?)")
        .bind(channelGeneralId, serverId, 'genel', 1, now)
    ];

    await env.DB.batch(statements);

    return json({
      message: "Sunucu oluşturuldu.",
      server_id: serverId,
      default_channel_id: channelGeneralId
    }, 201);

  } catch (err: any) {
    return error("Sunucu oluşturulamadı.", 500, err.message);
  }
}