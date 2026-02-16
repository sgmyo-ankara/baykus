import { Env, UserPayload } from '../types';
import { json, error } from '../utils/response';
import { hasPermission, PERMISSIONS } from '../utils/permissions';

// 1. SUNUCU AYARLARINI GÜNCELLE
export async function updateServerSettings(request: Request, env: Env, user: UserPayload, serverId: string): Promise<Response> {
  let body: { name?: string, icon_url?: string };
  try {
    body = await request.json();
  } catch {
    return error("Geçersiz veri formatı.", 400);
  }

  // Silinmiş sunucu kontrolü
  const serverCheck = await env.DB.prepare("SELECT deleted_at FROM servers WHERE id = ?").bind(serverId).first<{ deleted_at: number }>();
  if (!serverCheck) return error("Sunucu bulunamadı.", 404);
  if (serverCheck.deleted_at) return error("Bu sunucu silinmiş.", 410);

  // YETKİ KONTROLÜ: MANAGE_GUILD
  const canManage = await hasPermission(env, user.uid, serverId, "", PERMISSIONS.MANAGE_GUILD);
  if (!canManage) return error("Yetkiniz yok.", 403);

  if (body.name && body.name.trim().length < 3) return error("Sunucu adı en az 3 karakter olmalıdır.", 400);

  try {
    const updates = [];
    const params = [];

    if (body.name) {
      updates.push("name = ?");
      params.push(body.name);
    }
    if (body.icon_url !== undefined) {
      updates.push("icon_url = ?");
      params.push(body.icon_url);
    }

    if (updates.length === 0) return error("Değişiklik yok.", 400);

    params.push(serverId);
    await env.DB.prepare(`UPDATE servers SET ${updates.join(", ")} WHERE id = ?`)
      .bind(...params).run();

    return json({ message: "Sunucu ayarları güncellendi." });
  } catch (err: any) {
    return error("Hata oluştu.", 500, err.message);
  }
}

// 2. SUNUCUYU SİL (SOFT DELETE)
export async function deleteServer(request: Request, env: Env, user: UserPayload, serverId: string): Promise<Response> {
  // Sadece SAHİBİ silebilir
  const server = await env.DB.prepare("SELECT owner_id, deleted_at FROM servers WHERE id = ?").bind(serverId).first<{ owner_id: string, deleted_at: number }>();
  
  if (!server) return error("Sunucu bulunamadı.", 404);
  if (server.deleted_at) return error("Sunucu zaten silinmiş.", 410);
  if (server.owner_id !== user.uid) return error("Sadece sunucu sahibi silebilir.", 403);

  try {
    // SOFT DELETE: Veriyi silmiyoruz, zaman damgası basıyoruz.
    const now = Date.now();
    await env.DB.prepare("UPDATE servers SET deleted_at = ? WHERE id = ?")
      .bind(now, serverId).run();

    return json({ message: "Sunucu silindi (Arşivlendi)." });
  } catch (err: any) {
    return error("Sunucu silinirken hata oluştu.", 500, err.message);
  }
}