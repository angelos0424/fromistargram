export const IMGPROXY_BASE_URL = 'https://fromistargram.ddunddun.shop/thumb';

type ResizeType = 'fit' | 'fill' | 'auto';

interface ImgproxyOptions {
    width?: number;
    height?: number;
    type?: ResizeType;
    enlarge?: boolean;
}

function urlSafeBase64(str: string): string {
    return btoa(str)
        .replace(/=+$/, '')
        .replace(/\+/g, '-')
        .replace(/\//g, '_');
}

/**
 * Generates an imgproxy URL for a given local file path.
 * URL format: http://localhost:8080/insecure/rs:{type}:{width}:{height}:{enlarge}/{base64_path}
 */
export function getImgproxyUrl(
    accountId: string,
    filename: string,
    options: ImgproxyOptions = {}
): string {
    // If filename is already a full URL (e.g. returned from backend signed), return it as is.
    if (filename.startsWith('http')) {
        return filename;
    }

    const { width = 0, height = 0, type = 'fill', enlarge = false } = options;

    // Fallback for when we need to generate URL on frontend (e.g. optimistic updates or if backend returns raw path)
    // Note: This uses 'insecure' because frontend doesn't have the signature key.
    // If backend enforces signatures, this fallback will fail.
    const processingOptions = `rs:${type}:${width}:${height}:${enlarge ? 1 : 0}`;
    const path = `local:///${accountId}/${filename}`;
    const encodedPath = urlSafeBase64(path);

    return `${IMGPROXY_BASE_URL}/insecure/${processingOptions}/${encodedPath}`;
}

interface ResponsiveImageProps {
    src: string;
    srcSet: string;
}

/**
 * Generates src and srcSet props for responsive images.
 */
export function getResponsiveImageProps(
    accountId: string,
    filename: string,
    widths: number[] = [300, 600, 1080],
    aspectRatio?: number
): ResponsiveImageProps {
    // If filename is a full URL, we can't resize it responsibly without re-signing.
    // So we return the single URL for all sizes.
    if (filename.startsWith('http')) {
        return {
            src: filename,
            srcSet: `${filename} 1080w` // Mock srcSet to satisfy type, or we could return empty string if handled
        };
    }

    // Base src uses the largest width
    const maxWidth = Math.max(...widths);
    const baseHeight = aspectRatio ? Math.round(maxWidth / aspectRatio) : 0;

    const src = getImgproxyUrl(accountId, filename, { width: maxWidth, height: baseHeight });

    const srcSet = widths
        .map((w) => {
            const h = aspectRatio ? Math.round(w / aspectRatio) : 0;
            const url = getImgproxyUrl(accountId, filename, { width: w, height: h });
            return `${url} ${w}w`;
        })
        .join(', ');

    return { src, srcSet };
}
