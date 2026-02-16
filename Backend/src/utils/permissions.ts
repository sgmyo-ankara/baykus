import { Env } from '../types';

export const PERMISSIONS = {
  VIEW_CHANNEL: 1,
  MANAGE_CHANNELS: 2,
  SEND_MESSAGES: 4,
  MANAGE_MESSAGES: 8,
  KICK_MEMBERS: 16,
  BAN_MEMBERS: 32,
  MANAGE_GUILD: 64,
  MANAGE_ROLES: 128,
  CREATE_INVITE: 256,
  ADMINISTRATOR: 512
};

export async function computeChannelPermissions(
  env: Env,
  userId: string,
  serverId: string,
  channelId: string
): Promise<number> {
  
  // ÖNCE SUNUCU KONTROLÜ (Soft Delete)
  // Silinmiş bir sunucuda kimsenin yetkisi yoktur (Admin dahil).
  const server = await env.DB.prepare("SELECT deleted_at FROM servers WHERE id = ?").bind(serverId).first<{deleted_at: number}>();
  if (server?.deleted_at) return 0; // Yetki Yok

  // Kanal kontrolü (Eğer channelId varsa)
  if (channelId) {
    const channel = await env.DB.prepare("SELECT deleted_at FROM channels WHERE id = ?").bind(channelId).first<{deleted_at: number}>();
    if (channel?.deleted_at) return 0; // Yetki Yok
  }

  // Standart Yetki Hesaplama
  const member = await env.DB.prepare(`
    SELECT r.permissions, r.id as role_id
    FROM server_members sm
    LEFT JOIN roles r ON sm.role_id = r.id
    WHERE sm.server_id = ? AND sm.user_id = ?
  `).bind(serverId, userId).first<{ permissions: number, role_id: string }>();

  if (!member) return 0;

  const basePermissions = member.permissions || 0;

  if ((basePermissions & PERMISSIONS.ADMINISTRATOR) === PERMISSIONS.ADMINISTRATOR) {
    return PERMISSIONS.ADMINISTRATOR; 
  }

  if (!channelId) return basePermissions;

  const overrides = await env.DB.prepare(`
    SELECT role_id, user_id, allow, deny
    FROM channel_role_permissions
    WHERE channel_id = ? AND (role_id = ? OR user_id = ?)
  `).bind(channelId, member.role_id, userId).all<any>();

  let finalPermissions = basePermissions;

  const roleOverride = overrides.results.find(o => o.role_id === member.role_id);
  if (roleOverride) {
    finalPermissions = (finalPermissions & ~roleOverride.deny) | roleOverride.allow;
  }

  const userOverride = overrides.results.find(o => o.user_id === userId);
  if (userOverride) {
    finalPermissions = (finalPermissions & ~userOverride.deny) | userOverride.allow;
  }

  return finalPermissions;
}

export async function hasPermission(
  env: Env,
  userId: string,
  serverId: string,
  channelId: string,
  permissionBit: number
): Promise<boolean> {
  const perms = await computeChannelPermissions(env, userId, serverId, channelId);
  // Admin yetkisi bile olsa computeChannelPermissions içinde deleted_at kontrolü yapıldığı için güvenlidir.
  if ((perms & PERMISSIONS.ADMINISTRATOR) === PERMISSIONS.ADMINISTRATOR) return true;
  return (perms & permissionBit) === permissionBit;
}