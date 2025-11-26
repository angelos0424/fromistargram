export const IMGPROXY_BASE_URL = 'https://fromistargram.ddunddun.shop/thumb';

type ResizeType = 'fit' | 'fill' | 'auto';

interface ImgproxyOptions {
    width?: number;
    height?: number;
    type?: ResizeType;
    enlarge?: boolean;
}

/**
 * Generates an imgproxy URL for a given local file path.
 * URL format: http://localhost:8080/insecure/rs:{type}:{width}:{height}:{enlarge}/plain/local:///{path}
 */
export function getImgproxyUrl(
    accountId: string,
    filename: string,
    options: ImgproxyOptions = {}
): string {
    const { width = 0, height = 0, type = 'fill', enlarge = false } = options;

    // If it's already a full URL (e.g. external link), return as is
    if (filename.startsWith('http')) {
        return filename;
    }

    const processingOptions = `rs:${type}:${width}:${height}:${enlarge ? 1 : 0}`;
    const path = `${accountId}/${filename}`;

    return `${IMGPROXY_BASE_URL}/insecure/${processingOptions}/plain/local:///${path}`;
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
