// src/handlers/roles-endpoint.ts
import { 
  Env, UserPayload, Role, 
  CreateRoleRequest, UpdateRoleRequest, AssignRoleRequest, UpdateChannelOverrideRequest 
} from '../types';
import { json, error } from '../utils/response';
import { generateSnowflakeID } from '../utils/snowflake';
import { hasPermission, PERMISSIONS } from '../utils/permissions';

// 1. ROLLERİ LİSTELE
export async function getRoles(request: Request, env: Env, user: UserPayload, serverId: string): Promise<Response> {
  // Üyelik kontrolü
  const isMember = await env.DB.prepare("SELECT 1 FROM server_members WHERE server_id = ? AND user_id = ?")
    .bind(serverId, user.uid).first();
  
  if (!isMember) return error("Sunucu üyesi değilsiniz.", 403);

  const roles = await env.DB.prepare("SELECT * FROM roles WHERE server_id = ? ORDER BY position DESC")
    .bind(serverId).all();

  return json(roles.results);
}

// 2. ROL OLUŞTUR
export async function createRole(request: Request, env: Env, user: UserPayload): Promise<Response> {
  let body: CreateRoleRequest;
  try {
    body = await request.json<CreateRoleRequest>();
  } catch {
    return error("Geçersiz veri formatı.", 400);
  }

  if (!body.server_id || !body.name) return error("Server ID ve İsim gerekli.", 400);

  // Yetki: MANAGE_ROLES (128)
  const canManage = await hasPermission(env, user.uid, body.server_id, "", PERMISSIONS.MANAGE_ROLES);
  if (!canManage) return error("Rol yönetme yetkiniz yok.", 403);

  const roleId = generateSnowflakeID();
  const now = Date.now();

  // Yeni rolü varsayılan olarak @everyone'ın bir üstüne (position 1) koyalım
  await env.DB.prepare(`
    INSERT INTO roles (id, server_id, name, permissions, color, position, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).bind(
    roleId, 
    body.server_id, 
    body.name, 
    body.permissions || 0, 
    body.color || "#99AAB5", 
    1, 
    now
  ).run();

  return json({ message: "Rol oluşturuldu", id: roleId }, 201);
}

// 3. ROL DÜZENLE (Update)
export async function updateRole(request: Request, env: Env, user: UserPayload, roleId: string): Promise<Response> {
  let body: UpdateRoleRequest;
  try {
    body = await request.json<UpdateRoleRequest>();
  } catch {
    return error("Geçersiz veri formatı.", 400);
  }
  
  // Rolü bul
  const role = await env.DB.prepare("SELECT * FROM roles WHERE id = ?").bind(roleId).first<Role>();
  if (!role) return error("Rol bulunamadı.", 404);

  // Yetki Kontrolü
  const canManage = await hasPermission(env, user.uid, role.server_id, "", PERMISSIONS.MANAGE_ROLES);
  if (!canManage) return error("Yetkiniz yok.", 403);

  // COALESCE kullanarak sadece gönderilen alanları güncelle, diğerlerini koru.
  await env.DB.prepare(`
    UPDATE roles 
    SET name = COALESCE(?, name),
        permissions = COALESCE(?, permissions),
        color = COALESCE(?, color),
        position = COALESCE(?, position)
    WHERE id = ?
  `).bind(
    body.name, 
    body.permissions, 
    body.color, 
    body.position, 
    roleId
  ).run();

  return json({ message: "Rol güncellendi." });
}

// 4. ROL SİL
export async function deleteRole(request: Request, env: Env, user: UserPayload, roleId: string): Promise<Response> {
  const role = await env.DB.prepare("SELECT * FROM roles WHERE id = ?").bind(roleId).first<Role>();
  if (!role) return error("Rol bulunamadı.", 404);

  if (role.name === "@everyone") return error("Varsayılan rol silinemez.", 400);

  const canManage = await hasPermission(env, user.uid, role.server_id, "", PERMISSIONS.MANAGE_ROLES);
  if (!canManage) return error("Yetkiniz yok.", 403);

  // Batch: Rolü sil + Üyelerden rolü al (Null yap) + İzinleri temizle
  await env.DB.batch([
    env.DB.prepare("DELETE FROM roles WHERE id = ?").bind(roleId),
    env.DB.prepare("UPDATE server_members SET role_id = NULL WHERE role_id = ?").bind(roleId),
    env.DB.prepare("DELETE FROM channel_role_permissions WHERE role_id = ?").bind(roleId)
  ]);

  return json({ message: "Rol silindi." });
}

// 5. ÜYEYE ROL ATA
export async function assignRole(request: Request, env: Env, user: UserPayload): Promise<Response> {
  let body: AssignRoleRequest;
  try {
    body = await request.json<AssignRoleRequest>();
  } catch {
    return error("Geçersiz veri formatı.", 400);
  }
  
  if (!body.server_id || !body.target_user_id) return error("Eksik parametre.", 400);

  const canManage = await hasPermission(env, user.uid, body.server_id, "", PERMISSIONS.MANAGE_ROLES);
  if (!canManage) return error("Rol yönetme yetkiniz yok.", 403);

  // Rol ID null ise rolü kaldır demektir.
  await env.DB.prepare("UPDATE server_members SET role_id = ? WHERE server_id = ? AND user_id = ?")
    .bind(body.role_id || null, body.server_id, body.target_user_id).run();

  return json({ message: "Kullanıcı rolü güncellendi." });
}

// 6. KANAL YETKİLERİNİ GÜNCELLE (OVERRIDE) 🛡️
export async function updateChannelOverride(request: Request, env: Env, user: UserPayload, channelId: string): Promise<Response> {
  let body: UpdateChannelOverrideRequest;
  try {
    body = await request.json<UpdateChannelOverrideRequest>();
  } catch {
    return error("Geçersiz veri formatı.", 400);
  }
  
  // Kanalı bul
  const channel = await env.DB.prepare("SELECT server_id FROM channels WHERE id = ?").bind(channelId).first<{server_id: string}>();
  if (!channel) return error("Kanal bulunamadı.", 404);

  // MANAGE_CHANNELS (2) yetkisi gerekir
  const canManage = await hasPermission(env, user.uid, channel.server_id, channelId, PERMISSIONS.MANAGE_CHANNELS);
  if (!canManage) return error("Kanal yönetme yetkiniz yok.", 403);

  if (!body.role_id && !body.user_id) return error("Role ID veya User ID gerekli.", 400);

  // REPLACE INTO kullanarak Upsert işlemi (Varsa ezer, yoksa ekler)
  // SQLite'da UNIQUE constraint içinde NULL değerler olduğunda ON CONFLICT bazen karmaşıklaşabilir.
  // REPLACE INTO en temiz yöntemdir.

  if (body.role_id) {
    // ROL İZNİ
    await env.DB.prepare(`
      REPLACE INTO channel_role_permissions (channel_id, role_id, user_id, allow, deny, created_at)
      VALUES (?, ?, NULL, ?, ?, ?)
    `).bind(
      channelId, 
      body.role_id, 
      body.allow || 0, 
      body.deny || 0, 
      Date.now()
    ).run();
  } else {
    // KULLANICI İZNİ (USER OVERRIDE)
    await env.DB.prepare(`
      REPLACE INTO channel_role_permissions (channel_id, role_id, user_id, allow, deny, created_at)
      VALUES (?, NULL, ?, ?, ?, ?)
    `).bind(
      channelId, 
      body.user_id, 
      body.allow || 0, 
      body.deny || 0, 
      Date.now()
    ).run();
  }

  return json({ message: "Kanal izinleri güncellendi." });
}