// src/utils/file-security.ts

/**
 * Dosyaların "Sihirli Numaralarını" (Magic Bytes) kontrol eder.
 * Uzantıya güvenmek yerine dosyanın içeriğine bakar.
 */

const SIGNATURES: Record<string, string> = {
  // Resimler
  '89504E47': 'image/png', // PNG
  'FFD8FF': 'image/jpeg',  // JPEG/JPG
  '47494638': 'image/gif', // GIF
  '52494646': 'image/webp', // WEBP (RIFF header)
  
  // Dokümanlar
  '25504446': 'application/pdf', // PDF
  
  // Videolar (Genelde karmaşıktır, yaygın MP4 imzaları)
  '0000001866747970': 'video/mp4', // ftyp mp4
  '0000002066747970': 'video/mp4',
  '1A45DFA3': 'video/webm' // MKV/WebM
};

export async function validateFileSignature(file: File): Promise<{ valid: boolean; detectedType: string | null }> {
  // Dosyanın ilk 16 byte'ını oku (Header analizi için yeterli)
  const buffer = await file.slice(0, 16).arrayBuffer();
  const bytes = new Uint8Array(buffer);
  
  // Byte'ları Hex String'e çevir (Örn: 89 50 4E -> "89504E")
  const hex = Array.from(bytes)
    .map(b => b.toString(16).toUpperCase().padStart(2, '0'))
    .join('');

  // Tanımlı imzalarla karşılaştır
  for (const [signature, mimeType] of Object.entries(SIGNATURES)) {
    if (hex.startsWith(signature)) {
      return { valid: true, detectedType: mimeType };
    }
  }

  
  return { valid: false, detectedType: null };
}

/**
 * Dosya boyutu kontrolü (Server-side)
 * @param size Byte cinsinden boyut
 * @param limitMB MB cinsinden limit (Örn: 20)
 */
export function validateFileSize(size: number, limitMB: number): boolean {
  const limitBytes = limitMB * 1024 * 1024;
  return size <= limitBytes;
}