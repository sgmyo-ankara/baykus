/**
 * BAYKUŞ PROJESİ - SNOWFLAKE ID GENERATOR
 * Mimari: 64-bit BigInt (Twitter/Discord Standardı)
 * * Yapı:
 * 1 Bit  : İşaretsiz (Unused)
 * 41 Bit : Timestamp (Milisaniye) - Ömür: 69 Yıl
 * 10 Bit : Worker ID (Dağıtık sistemde çakışmayı önler)
 * 12 Bit : Sequence (Aynı milisaniyedeki sıra no)
 */

// BAŞLANGIÇ TARİHİ (EPOCH): 1 Ocak 2026 00:00:00 UTC
// Bu tarihten önceki zamanları ID olarak üretemeyiz.
const BAYKUS_EPOCH = 1767225600000n; 

// Bit Dağılımı Ayarları
const WORKER_ID_BITS = 10n;
const SEQUENCE_BITS = 12n;

// Kaydırma (Shift) Miktarları
const WORKER_ID_SHIFT = SEQUENCE_BITS;
const TIMESTAMP_LEFT_SHIFT = SEQUENCE_BITS + WORKER_ID_BITS;

// Maskeleme (Sequence taşmasını önlemek için: 4095)
const SEQUENCE_MASK = (1n << SEQUENCE_BITS) - 1n;
const MAX_WORKER_ID = (1n << WORKER_ID_BITS) - 1n;

// STATE (Durum Değişkenleri)
// Cloudflare Workers çalıştığı sürece (Hot Instance) bu değerleri hafızada tutar.
let lastTimestamp = -1n;
let sequence = 0n;

// Worker ID Belirleme (Stateless Ortam İçin)
// İdealde bir Config'den gelmeli ama Serverless ortamda rastgele atamak
// çakışma ihtimalini (1/1024 * aynı ms * aynı sequence) ihmal edilebilir seviyeye indirir.
const workerId = BigInt(Math.floor(Math.random() * Number(MAX_WORKER_ID)));

/**
 * Benzersiz bir Snowflake ID üretir.
 * @returns string (JavaScript'te BigInt hassasiyeti kaybolmasın diye string döner)
 */
export function generateSnowflakeID(): string {
  // Şu anki zamanı BigInt olarak al
  let timestamp = BigInt(Date.now());

  // Eğer saat geri alınmışsa (NTP hatası vb.)
  if (timestamp < lastTimestamp) {
    // Basitlik adına hata fırlatıyoruz, retry mekanizması üst katmanda olabilir.
    throw new Error("Sistem saati geri alınmış! ID üretilemiyor.");
  }

  // Aynı milisaniye içinde miyiz?
  if (timestamp === lastTimestamp) {
    // Sırayı 1 arttır ve Maskele (4095'i geçerse 0 olur)
    sequence = (sequence + 1n) & SEQUENCE_MASK;
    
    // Eğer sıra 0 olduysa, bu milisaniye dolmuş demektir (4096 ID üretildi).
    // Bir sonraki milisaniyeyi bekle (Busy Wait).
    if (sequence === 0n) {
      while (timestamp <= lastTimestamp) {
        timestamp = BigInt(Date.now());
      }
    }
  } else {
    // Yeni bir milisaniyeye girdik, sırayı sıfırla
    sequence = 0n;
  }

  // Son işlem yapılan zamanı güncelle
  lastTimestamp = timestamp;

  // BİT BİRLEŞTİRME (Bitwise Operations)
  // 1. Zaman farkını sola kaydır
  // 2. Worker ID'yi araya koy
  // 3. Sıra numarasını sona ekle
  const id = ((timestamp - BAYKUS_EPOCH) << TIMESTAMP_LEFT_SHIFT) |
             (workerId << WORKER_ID_SHIFT) |
             sequence;

  // D1 veritabanına INTEGER olarak kaydedilir, ancak API'den JSON dönerken
  // tarayıcıların hassasiyet sorunu yaşamaması için String olarak gönderiyoruz.
  return id.toString();
}

/**
 * Bir ID'nin ne zaman üretildiğini çözer.
 * Frontend'de "Mesaj saati" göstermek için veritabanına gitmeye gerek kalmaz.
 * * @param idStr Snowflake ID (String formatında)
 * @returns Unix Timestamp (Number - ms cinsinden)
 */
export function parseSnowflakeID(idStr: string): number {
  const id = BigInt(idStr);
  const timestamp = (id >> TIMESTAMP_LEFT_SHIFT) + BAYKUS_EPOCH;
  return Number(timestamp);
}