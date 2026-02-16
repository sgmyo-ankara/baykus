/**
 * Standart JSON yanıtı oluşturur.
 * @param data Gönderilecek veri (Object)
 * @param status HTTP Durum Kodu (Varsayılan: 200)
 */
export const json = (data: any, status = 200): Response => {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*", // CORS için önemli
    },
  });
};

/**
 * Hata yanıtı oluşturur.
 * @param message Hata mesajı
 * @param status HTTP Durum Kodu (Varsayılan: 400)
 */
export const error = (message: string, status = 400, details?: any): Response => {
  return json({ error: message, details }, status);
};