// src/handlers/user-settings-endpoint.ts
import { Env, UserPayload, UpdateProfileRequest } from '../types';
import { json, error } from '../utils/response';

export async function updateProfile(request: Request, env: Env, user: UserPayload): Promise<Response> {
  let body: UpdateProfileRequest;
  try {
    body = await request.json<UpdateProfileRequest>();
  } catch {
    return error("Geçersiz veri formatı.", 400);
  }
  
  // Validasyon
  if (body.username) {
    if (body.username.length < 3) return error("Kullanıcı adı en az 3 karakter olmalı.", 400);
    if (!/^[a-z0-9_]+$/.test(body.username)) return error("Kullanıcı adı geçersiz karakterler içeriyor.", 400);
  }

  try {
    // Dinamik Güncelleme (Sadece gönderilenleri güncelle)
    await env.DB.prepare(`
      UPDATE users 
      SET username = COALESCE(?, username),
          avatar_url = COALESCE(?, avatar_url)
      WHERE id = ?
    `).bind(body.username || null, body.avatar_url || null, user.uid).run();

    const updatedUser = await env.DB.prepare("SELECT * FROM users WHERE id = ?").bind(user.uid).first();
    return json({ message: "Profil güncellendi.", user: updatedUser });

  } catch (err: any) {
    if (err.message.includes("UNIQUE")) return error("Bu kullanıcı adı zaten kullanımda.", 409);
    return error("Güncelleme başarısız.", 500);
  }
}