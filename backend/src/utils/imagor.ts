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
  if (path.endsWith('.mp4')) {
    const pathToSign = path.startsWith('/') ? path : '/' + path;
    const videoHmac = createHmac('sha1', secret).update(pathToSign).digest('base64url');
    console.log('video - ', pathToSign, videoHmac)
    return videoHmac;
  }
  console.log('hmac = ', hmac);
  console.log('path = ', path);
  return hmac;
}

function buildTransformationPath(source: string, options?: ImagorOptions): string {
  // Strip local:/// prefix
  const imagePath = source.replace(/^local:\/\/\//, '');

  const resize = options?.resize ?? {};
  const width = resize.width ?? defaultResizeWidth;
  const height = resize.height ?? defaultResizeHeight;
  const quality = options?.quality ?? defaultQuality;
  const format = options?.format ?? defaultFormat;

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

  parts.push(imagePath);

  return parts.join('/');
}

export function buildImagorUrl(source: string, options?: ImagorOptions): string | null {
  if (!baseUrl) {
    return null;
  }

  const transformationPath = buildTransformationPath(source, options);
  const signature = signPath(transformationPath);
  const normalizedBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;

  if (!signature) {
    // Unsafe URL if secret not set
    return `${normalizedBase}/unsafe/${transformationPath}`;
  }

  return `${normalizedBase}/${signature}/${transformationPath}`;
}
