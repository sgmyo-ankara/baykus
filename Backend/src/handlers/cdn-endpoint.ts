import { Env } from '../types';
import { error } from '../utils/response';

export async function getFile(request: Request, env: Env, filePath: string): Promise<Response> {
  // 1. Dosya yolunu temizle (Decoding)
  // Örn: "server/kanal%20adi/resim.png" -> "server/kanal adi/resim.png"
  const objectKey = decodeURIComponent(filePath);

  if (!objectKey) return error("Dosya yolu geçersiz.", 400);

  // 2. R2'den Dosyayı İste (GET)
  const object = await env.BUCKET.get(objectKey);

  if (!object) {
    return error("Dosya bulunamadı.", 404);
  }

  // 3. Dosyayı Tarayıcıya Gönder
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set('etag', object.httpEtag);
  
  // Cache Ayarı (Performans için önemli - 1 hafta cache)
  headers.set('Cache-Control', 'public, max-age=604800');

  return new Response(object.body, {
    headers,
  });
}