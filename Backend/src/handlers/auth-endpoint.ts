// src/handlers/auth-endpoint.ts
import { Env, UserPayload, UserSyncRequest, User } from '../types';
import { json, error } from '../utils/response';

export async function syncUser(request: Request, env: Env, userToken: UserPayload): Promise<Response> {
  // 1. Body'den veri gelip gelmediğini kontrol et
  let body: UserSyncRequest = {};
  try {
    const text = await request.text();
    if (text) body = JSON.parse(text);
  } catch {}

  const { uid, email, picture } = userToken;
  const now = Date.now();

  // 2. Varsayılan İsim ve Avatar Hazırlığı (Sadece yeni kayıt için kullanılır)
  // Eğer body'de username varsa onu al, yoksa token'dan, yoksa email'den üret.
  let rawName = body.username || userToken.username || email.split('@')[0];
  let cleanUsername = rawName.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (cleanUsername.length < 3) cleanUsername = `user${Math.floor(Math.random() * 10000)}`;

  // Avatar önceliği: Token > Body > Null
  const avatarUrl = picture || userToken.avatar_url || body.picture || null;

  try {
    // 3. TEK ATIMLIK İŞLEM (UPSERT) ⚡
    // Mantık: ID varsa GÜNCELLE, yoksa EKLE.
    // COALESCE(users.username, excluded.username) -> Mevcut username varsa KORU, yoksa yenisini yaz.
    
    await env.DB.prepare(`
      INSERT INTO users (id, username, email, avatar_url, status, created_at)
      VALUES (?, ?, ?, ?, 1, ?)
      ON CONFLICT(id) DO UPDATE SET
        email = excluded.email,           -- Email güncel kalsın
        avatar_url = COALESCE(excluded.avatar_url, users.avatar_url), -- Yeni resim varsa güncelle
        username = COALESCE(users.username, excluded.username) -- 🛡️ DİKKAT: Mevcut ismi koru!
    `).bind(
      uid,
      cleanUsername,
      email,
      avatarUrl,
      now
    ).run();

    // 4. Sonuç Döndür
    // Kullanıcıyı çekip gerçekten yeni mi (created_at şimdiki zamana çok yakın mı) diye bakıyoruz.
    const finalUser = await env.DB.prepare("SELECT * FROM users WHERE id = ?").bind(uid).first<User>();

    if (!finalUser) return error("Kullanıcı verisi okunamadı.", 500);

    // Eğer kayıt olma zamanı ile şu an arasında 2 saniyeden az fark varsa "Yenidir".
    const isNewUser = (now - finalUser.created_at) < 2000;

    return json({ 
      message: "Senkronizasyon başarılı.", 
      user: finalUser,
      isNew: isNewUser 
    }, 200);

  } catch (err: any) {
    console.error("Auth Sync Error:", err);
    return error("Veritabanı hatası.", 500, err.message);
  }
}