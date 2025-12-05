import { createHmac } from 'crypto';

const baseUrl = process.env.IMAGOR_URL;
const secret = process.env.IMAGOR_SECRET;

const defaultResizeWidth = 640;
const defaultResizeHeight = 640;
const defaultFormat = 'webp';
const defaultQuality = 80;

type ResizeType = 'fit' | 'fill' | 'auto';

export type ImagorOptions = {
  resize?: {
    type?: ResizeType;
    width?: number;
    height?: number;
  };
  quality?: number;
  format?: string;
};

export function signPath(path: string): string | null {
  if (!secret) {
    return null;
  }
  console.log('signPath...', secret, baseUrl);

  const hmac = createHmac('sha1', secret).update(path).digest('base64').replace(/\+/g, '-').replace(/\//g, '_');
  console.log('hmac = ', hmac);
  console.log('path = ', path);
  return hmac;
}

function buildTransformationPath(source: string, options?: ImagorOptions): { plain: string; encoded: string } {
  // Strip local:/// prefix
  // Normalize to NFC (Standard for Linux/Ubuntu/Web) to ensure Hangul filenames match the filesystem
  const rawPath = source.replace(/^local:\/\/\//, '').normalize('NFC');

  // Use b64: encoding for the path to handle special characters (spaces, etc.) safely
  // Base64 encode the path, make it URL-safe (replace + with -, / with _), and remove padding =
  const b64Path = 'b64:' + Buffer.from(rawPath).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

  const resize = options?.resize ?? {};
  const width = resize.width ?? defaultResizeWidth;
  const height = resize.height ?? defaultResizeHeight;
  const quality = options?.quality ?? defaultQuality;
  let format = options?.format ?? defaultFormat;

  if (source.toLowerCase().endsWith('.mp4')) {
    format = 'jpeg';
  }

  const parts: string[] = [];

  // Resize (fit-in is default for keeping aspect ratio)
  // For 'fill' or strict resize, logic might differ, but basic 'fit-in' is safest for now
  if (width > 0 || height > 0) {
    parts.push(`fit-in/${width}x${height}`);
  }

  // Filters
  const filters: string[] = [];
  if (format) {
    filters.push(`format(${format})`);
  }
  if (quality) {
    filters.push(`quality(${quality})`);
  }

  if (filters.length > 0) {
    parts.push(`filters:${filters.join(':')}`);
  }

  const prefix = parts.length > 0 ? parts.join('/') + '/' : '';

  // When using b64:, the "plain" path used for signing includes the b64: prefix and the encoded string.
  // There is no separate "encoded" path in the sense of URL encoding individual segments.
  const fullPath = prefix + b64Path;

  return {
    plain: fullPath,
    encoded: fullPath,
  };
}

export function buildImagorUrl(source: string, options?: ImagorOptions): string | null {
  if (!baseUrl) {
    return null;
  }

  const { plain, encoded: encodedPath } = buildTransformationPath(source, options);
  // Use the plain path for signature generation because Imagor verifies the signature against the decoded path.
  const signature = signPath(plain);
  const normalizedBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;

  // Determine prefix based on file extension
  // We check the source string because transformationPath might not have the extension if manipulated, 
  // though usually it does. Checking source is safer for type detection.
  const isVideo = source.toLowerCase().endsWith('.mp4');
  const prefix = isVideo ? '/videos' : '/images';

  if (!signature) {
    // Unsafe URL if secret not set
    return `${normalizedBase}${prefix}/unsafe/${encodedPath}`;
  }

  return `${normalizedBase}${prefix}/${signature}/${encodedPath}`;
}
