// Steganography engine: LSB (Least Significant Bit) embedding in the alpha channel
// combined with AES-GCM encryption of the payload before embedding.
// Pure browser — no server involvement, keys never leave the client.

// ---------- Crypto helpers ----------

const enc = new TextEncoder();
const dec = new TextDecoder();

async function deriveKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
  const baseKey = await crypto.subtle.importKey(
    'raw',
    enc.encode(passphrase),
    { name: 'PBKDF2' },
    false,
    ['deriveKey'],
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 150_000, hash: 'SHA-256' },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

function toB64(bytes: Uint8Array): string {
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

function fromB64(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export interface EncryptResult {
  cipherB64: string;
  saltB64: string;
  ivB64: string;
}

export async function encryptText(plaintext: string, passphrase: string): Promise<EncryptResult> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(passphrase, salt);
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(plaintext));
  return {
    cipherB64: toB64(new Uint8Array(ct)),
    saltB64: toB64(salt),
    ivB64: toB64(iv),
  };
}

export async function decryptText(r: EncryptResult, passphrase: string): Promise<string> {
  const salt = fromB64(r.saltB64);
  const iv = fromB64(r.ivB64);
  const key = await deriveKey(passphrase, salt);
  const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, fromB64(r.cipherB64));
  return dec.decode(pt);
}

// ---------- LSB embedding ----------

// We pack a payload into the least significant bit of every RGB channel.
// Payload format: 4 bytes length (big-endian) + payload bytes.
// Each byte needs 8 bits, so capacity = (width * height * 3) / 8 - 4 bytes.

const MAGIC = [0x53, 0x54, 0x47, 0x4f]; // "STGO" — marks that an image contains a payload

export function getCapacity(width: number, height: number): number {
  const totalBits = width * height * 3;
  const headerBits = (MAGIC.length + 4) * 8; // magic + length
  return Math.floor((totalBits - headerBits) / 8);
}

function bytesToBits(bytes: Uint8Array): number[] {
  const bits: number[] = [];
  for (let i = 0; i < bytes.length; i++) {
    for (let b = 7; b >= 0; b--) {
      bits.push((bytes[i] >> b) & 1);
    }
  }
  return bits;
}

function bitsToBytes(bits: number[]): Uint8Array {
  const out = new Uint8Array(Math.floor(bits.length / 8));
  for (let i = 0; i < out.length; i++) {
    let byte = 0;
    for (let b = 0; b < 8; b++) byte = (byte << 1) | bits[i * 8 + b];
    out[i] = byte;
  }
  return out;
}

export interface EncodeResult {
  blob: Blob;
  width: number;
  height: number;
  payloadLength: number;
}

export async function encodeMessage(
  imageFile: File | Blob,
  payload: string,
): Promise<EncodeResult> {
  const bitmap = await createImageBitmap(imageFile);
  const width = bitmap.width;
  const height = bitmap.height;
  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(bitmap, 0, 0);
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data; // RGBA

  const payloadBytes = enc.encode(payload);
  const lengthBytes = new Uint8Array(4);
  const view = new DataView(lengthBytes.buffer);
  view.setUint32(0, payloadBytes.length, false);
  const header = new Uint8Array([...MAGIC, ...lengthBytes]);
  const fullPayload = new Uint8Array(header.length + payloadBytes.length);
  fullPayload.set(header, 0);
  fullPayload.set(payloadBytes, header.length);

  const capacity = getCapacity(width, height);
  if (fullPayload.length > capacity) {
    throw new Error(
      `Payload too large. Image can hold ${capacity} bytes, payload is ${fullPayload.length} bytes.`,
    );
  }

  const bits = bytesToBits(fullPayload);
  let bitIdx = 0;
  for (let i = 0; i < data.length && bitIdx < bits.length; i += 4) {
    // Embed in R, G, B (skip alpha)
    for (let c = 0; c < 3 && bitIdx < bits.length; c++) {
      data[i + c] = (data[i + c] & 0xfe) | bits[bitIdx++];
    }
  }
  ctx.putImageData(imageData, 0, 0);
  const blob = await canvas.convertToBlob({ type: 'image/png' });
  bitmap.close();
  return { blob, width, height, payloadLength: payloadBytes.length };
}

export interface DecodeResult {
  payload: string;
  length: number;
}

export async function decodeMessage(imageFile: File | Blob): Promise<DecodeResult> {
  const bitmap = await createImageBitmap(imageFile);
  const width = bitmap.width;
  const height = bitmap.height;
  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(bitmap, 0, 0);
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;

  // Read magic (4 bytes = 32 bits) first
  const magicBits: number[] = [];
  let bitIdx = 0;
  for (let i = 0; i < data.length && magicBits.length < 32; i += 4) {
    for (let c = 0; c < 3 && magicBits.length < 32; c++) {
      magicBits.push(data[i + c] & 1);
    }
  }
  const magicBytes = bitsToBytes(magicBits);
  const hasMagic = MAGIC.every((m, i) => magicBytes[i] === m);
  if (!hasMagic) {
    throw new Error('No hidden message found in this image.');
  }

  // Read length (4 bytes)
  const lengthBits: number[] = [];
  for (let i = 0; i < data.length && lengthBits.length < 32; i += 4) {
    for (let c = 0; c < 3 && lengthBits.length < 32; c++) {
      // Continue from where magic left off
      const globalBit = bitIdx + lengthBits.length;
      const pixelIdx = Math.floor(globalBit / 3) * 4;
      const channel = globalBit % 3;
      lengthBits.push(data[pixelIdx + channel] & 1);
    }
  }
  bitIdx += 32;
  const lengthBytes = bitsToBytes(lengthBits);
  const lengthView = new DataView(lengthBytes.buffer);
  const payloadLength = lengthView.getUint32(0, false);

  const capacity = getCapacity(width, height);
  if (payloadLength > capacity) {
    throw new Error('Corrupted payload length in image.');
  }

  // Read payload
  const payloadBitCount = payloadLength * 8;
  const payloadBits: number[] = [];
  for (let i = 0; i < data.length && payloadBits.length < payloadBitCount; i += 4) {
    for (let c = 0; c < 3 && payloadBits.length < payloadBitCount; c++) {
      const globalBit = bitIdx + payloadBits.length;
      const pixelIdx = Math.floor(globalBit / 3) * 4;
      const channel = globalBit % 3;
      payloadBits.push(data[pixelIdx + channel] & 1);
    }
  }
  bitIdx += payloadBitCount;
  const payloadBytes = bitsToBytes(payloadBits);
  bitmap.close();
  return { payload: dec.decode(payloadBytes), length: payloadLength };
}

// ---------- File helpers ----------

export function fileToDataURL(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
