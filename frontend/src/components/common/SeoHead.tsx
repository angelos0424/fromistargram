import { Helmet } from 'react-helmet-async';

interface SeoHeadProps {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
}

const DEFAULT_TITLE = 'Fromistargram Viewer';
const DEFAULT_DESCRIPTION = '프로미스나인(fromis_9)의 인스타그램 게시물을 모아보는 팬 사이트입니다. 최신 피드와 스토리 업데이트를 확인하세요.';
const DEFAULT_IMAGE = '/og-image.svg';
const SITE_URL = 'https://fromistargram.com';

const SeoHead = ({ title, description, image, url }: SeoHeadProps) => {
  const metaTitle = title ? `${title} | Fromistargram` : DEFAULT_TITLE;
  const metaDescription = description || DEFAULT_DESCRIPTION;
  const metaImage = image || DEFAULT_IMAGE;
  const metaUrl = url || SITE_URL;

  return (
    <Helmet>
      <title>{metaTitle}</title>
      <meta name="description" content={metaDescription} />
      <meta name="keywords" content="fromis_9, 프로미스나인, 인스타그램, Instagram, K-pop, girl group, 이새롬, 송하영, 박지원, 노지선, 이서연, 이채영, 이나경, 백지헌" />

      {/* Open Graph / Facebook */}
      <meta property="og:type" content="website" />
      <meta property="og:url" content={metaUrl} />
      <meta property="og:title" content={metaTitle} />
      <meta property="og:description" content={metaDescription} />
      <meta property="og:image" content={metaImage} />

      {/* Twitter */}
      <meta property="twitter:card" content="summary_large_image" />
      <meta property="twitter:url" content={metaUrl} />
      <meta property="twitter:title" content={metaTitle} />
      <meta property="twitter:description" content={metaDescription} />
      <meta property="twitter:image" content={metaImage} />

      {/* Canonical */}
      <link rel="canonical" href={metaUrl} />
    </Helmet>
  );
};

export default SeoHead;
