import { Env, UserPayload, Channel } from '../types';
import { json, error } from '../utils/response';
import { generateSnowflakeID } from '../utils/snowflake';
import { hasPermission, PERMISSIONS } from '../utils/permissions';

interface CreateChannelRequest {
  name: string;
  type?: number;
}

interface UpdateChannelRequest {
  name?: string;
}

// 1. KANAL OLUŞTURMA
export async function createChannel(request: Request, env: Env, user: UserPayload, serverId: string): Promise<Response> {
  let body: CreateChannelRequest;
  try {
    body = await request.json<CreateChannelRequest>();
  } catch {
    return error("Geçersiz veri formatı.", 400);
  }

  if (!body.name || body.name.length < 1) return error("Kanal adı gerekli.", 400);

  // Sunucu silinmiş mi?
  const server = await env.DB.prepare("SELECT deleted_at FROM servers WHERE id = ?").bind(serverId).first<{ deleted_at: number }>();
  if (!server || server.deleted_at) return error("Sunucu bulunamadı veya silinmiş.", 404);

  const canManage = await hasPermission(env, user.uid, serverId, "", PERMISSIONS.MANAGE_CHANNELS);
  if (!canManage) return error("Yetkiniz yok.", 403);

  const channelId = generateSnowflakeID();
  const type = body.type || 1;
  const now = Date.now();

  await env.DB.prepare(
    "INSERT INTO channels (id, server_id, name, type, created_at) VALUES (?, ?, ?, ?, ?)"
  ).bind(channelId, serverId, body.name, type, now).run();

  const newChannel: Channel = {
    id: channelId, server_id: serverId, name: body.name, type: type, created_at: now
  };

  return json({ message: "Kanal oluşturuldu.", channel: newChannel }, 201);
}

// 2. KANAL GÜNCELLEME
export async function updateChannel(request: Request, env: Env, user: UserPayload, channelId: string): Promise<Response> {
  let body: UpdateChannelRequest;
  try {
    body = await request.json<UpdateChannelRequest>();
  } catch {
    return error("Geçersiz veri.", 400);
  }

  const channel = await env.DB.prepare("SELECT server_id, deleted_at FROM channels WHERE id = ?").bind(channelId).first<{server_id: string, deleted_at: number}>();
  if (!channel) return error("Kanal bulunamadı.", 404);
  if (channel.deleted_at) return error("Kanal silinmiş.", 410);

  const canManage = await hasPermission(env, user.uid, channel.server_id, channelId, PERMISSIONS.MANAGE_CHANNELS);
  if (!canManage) return error("Yetkiniz yok.", 403);

  await env.DB.prepare("UPDATE channels SET name = ? WHERE id = ?").bind(body.name, channelId).run();
  return json({ message: "Kanal güncellendi." });
}

// 3. KANAL SİLME (SOFT DELETE)
export async function deleteChannel(request: Request, env: Env, user: UserPayload, channelId: string): Promise<Response> {
  const channel = await env.DB.prepare("SELECT server_id, deleted_at FROM channels WHERE id = ?").bind(channelId).first<{server_id: string, deleted_at: number}>();
  
  if (!channel) return error("Kanal bulunamadı.", 404);
  if (channel.deleted_at) return error("Kanal zaten silinmiş.", 410);

  const canManage = await hasPermission(env, user.uid, channel.server_id, channelId, PERMISSIONS.MANAGE_CHANNELS);
  if (!canManage) return error("Yetkiniz yok.", 403);

  // Soft Delete: Zaman damgası bas
  const now = Date.now();
  await env.DB.prepare("UPDATE channels SET deleted_at = ? WHERE id = ?").bind(now, channelId).run();

  return json({ message: "Kanal silindi (Arşivlendi)." });
}