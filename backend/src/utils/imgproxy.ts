import { createHmac } from 'crypto';

const baseUrl = process.env.IMGPROXY_URL;
const keyHex = process.env.IMGPROXY_KEY;
const saltHex = process.env.IMGPROXY_SALT;

const defaultResizeWidth = Number.parseInt(process.env.IMGPROXY_DEFAULT_WIDTH ?? '640', 10);
const defaultResizeHeight = Number.parseInt(process.env.IMGPROXY_DEFAULT_HEIGHT ?? '640', 10);
const defaultFormat = process.env.IMGPROXY_DEFAULT_FORMAT ?? 'webp';
const defaultQuality = Number.parseInt(process.env.IMGPROXY_DEFAULT_QUALITY ?? '80', 10);

type ResizeType = 'fit' | 'fill' | 'fill-down' | 'force' | 'auto' | 'crop';

export type ImgproxyOptions = {
  resize?: {
    type?: ResizeType;
    width?: number;
    height?: number;
    enlarge?: boolean;
  };
  quality?: number;
  format?: string;
};

function urlSafeBase64(buffer: Buffer): string {
  return buffer
    .toString('base64')
    .replace(/=+$/u, '')
    .replace(/\+/gu, '-')
    .replace(/\//gu, '_');
}

function signPath(path: string): string | null {
  if (!keyHex || !saltHex) {
    return null;
  }

  const key = Buffer.from(keyHex, 'hex');
  const salt = Buffer.from(saltHex, 'hex');

  const hmac = createHmac('sha256', key);
  hmac.update(salt);
  hmac.update(path);

  return urlSafeBase64(hmac.digest());
}

function buildTransformationPath(source: string, options?: ImgproxyOptions): string {
  const resize = options?.resize ?? {};
  const resizeType = resize.type ?? 'fit';
  const width = resize.width ?? defaultResizeWidth;
  const height = resize.height ?? defaultResizeHeight;
  const enlarge = resize.enlarge ? 1 : 0;
  const quality = options?.quality ?? defaultQuality;
  const format = options?.format ?? defaultFormat;

  const encodedUrl = urlSafeBase64(Buffer.from(source));
  const segments = [
    `resize:${resizeType}:${width}:${height}:${enlarge}`,
    `quality:${quality}`,
    `format:${format}`,
    encodedUrl
  ];

  return `/${segments.join('/')}`;
}

export function buildImgproxyUrl(source: string, options?: ImgproxyOptions): string | null {
  if (!baseUrl) {
    return null;
  }

  const transformationPath = buildTransformationPath(source, options);
  const signature = signPath(transformationPath);
  const normalizedBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;

  if (!signature) {
    return `${normalizedBase}${transformationPath}`;
  }

  return `${normalizedBase}/${signature}${transformationPath}`;
}
