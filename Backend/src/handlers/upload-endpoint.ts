// src/handlers/upload-endpoint.ts
import { Env, UserPayload } from '../types';
import { json, error } from '../utils/response';
import { generateSnowflakeID } from '../utils/snowflake';
import { validateFileSignature, validateFileSize } from '../utils/file-security';

const MAX_SIZE_MB = 20;

export async function uploadFile(request: Request, env: Env, user: UserPayload): Promise<Response> {
  // 1. Content-Type Kontrolü
  const contentType = request.headers.get("content-type") || "";
  if (!contentType.includes("multipart/form-data")) {
    return error("Content-Type 'multipart/form-data' olmalıdır.", 400);
  }

  try {
    // 2. FormData Ayrıştırma
    const formData = await request.formData();
    
    // TİP DÖNÜŞÜMÜ (Type Casting)
    // Cloudflare Workers ortamında 'File' globaldir. 
    // Garanti olması için önce 'unknown' sonra 'File' olarak cast ediyoruz.
    const file = formData.get("file") as unknown as File;
    const contextType = formData.get("type"); // 'server' veya 'dm'
    const contextId = formData.get("id");     // channel_id veya dm_channel_id

    // Validasyonlar
    if (!file) return error("Dosya bulunamadı.", 400);
    
    // File objesi değilse string gelmiş olabilir, bunu engelle
    if (!(file instanceof File)) {
      return error("Gönderilen veri geçerli bir dosya değil.", 400);
    }

    if (!contextType || !contextId) return error("Eksik parametre: 'type' ve 'id' gereklidir.", 400);

    // 3. GÜVENLİK KONTROLLERİ
    if (!validateFileSize(file.size, MAX_SIZE_MB)) {
      return error(`Dosya boyutu çok büyük. Limit: ${MAX_SIZE_MB}MB`, 413);
    }
    const securityCheck = await validateFileSignature(file);
    if (!securityCheck.valid) {
      return error("Desteklenmeyen dosya formatı.", 415);
    }

    // 4. PATH (YOL) HESAPLAMA MANTIĞI 
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0'); // 01, 02...
    
    // Dosya uzantısını ve yeni adını belirle
    const originalExt = file.name.split('.').pop() || "bin";
    const newFileName = `${generateSnowflakeID()}.${originalExt}`;
    
    let storageKey = ""; // R2'deki dosya yolu

    // SENARYO A: Sunucu Kanalı (Server Text Channel)
    // İstenen Yol: server-id/channel-id/YYYY/MM/dosya.png
    if (contextType === 'server') {
      // Güvenlik: Server ID'yi veritabanından bul (Frontend'e güvenme)
      const channel = await env.DB.prepare("SELECT server_id FROM channels WHERE id = ?")
        .bind(contextId).first<{ server_id: string }>();
      
      if (!channel) return error("Belirtilen kanal bulunamadı.", 404);

      // Üyelik kontrolü (Bu kanala dosya yükleyebilir mi?)
      const isMember = await env.DB.prepare(
        "SELECT 1 FROM server_members WHERE server_id = ? AND user_id = ?"
      ).bind(channel.server_id, user.uid).first();

      if (!isMember) return error("Bu sunucuya dosya yükleme yetkiniz yok.", 403);

      // Yolu İnşa Et
      storageKey = `${channel.server_id}/${contextId}/${year}/${month}/${newFileName}`;
    } 
    
    // SENARYO B: DM veya Grup (Direct Message)
    // İstenen Yol: dm-id/YYYY/MM/dosya.png
    else if (contextType === 'dm') {
      // Üyelik Kontrolü
      const isMember = await env.DB.prepare(
        "SELECT 1 FROM dm_members WHERE dm_channel_id = ? AND user_id = ?"
      ).bind(contextId, user.uid).first();

      if (!isMember) return error("Bu DM grubuna erişiminiz yok.", 403);

      // Yolu İnşa Et
      storageKey = `${contextId}/${year}/${month}/${newFileName}`;
    } 
    
    else {
      return error("Geçersiz 'type'. 'server' veya 'dm' olmalıdır.", 400);
    }

    // 5. R2'YE KAYIT (PUT)
    // Not: Key'in başına '/' koyulmaz. R2/S3'te klasörler sanaldır.
    await env.BUCKET.put(storageKey, file.stream(), {
      httpMetadata: {
        contentType: securityCheck.detectedType || file.type,
      },
      customMetadata: {
        uploader_id: user.uid,
        original_name: file.name
      }
    });

    // 6. Başarılı Yanıt
    return json({
      message: "Dosya yüklendi.",
      data: {
        key: storageKey, // Veritabanındaki 'path' kolonuna bu yazılacak
        url: `/cdn/${storageKey}`, // Frontend göstermek için bunu kullanacak
        file_size: file.size,
        content_type: securityCheck.detectedType
      }
    }, 201);

  } catch (err: any) {
    console.error("Upload Error:", err);
    return error("Dosya yükleme hatası.", 500, err.message);
  }
}