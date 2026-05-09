import { useState } from 'react';
import { normalizeImageUrl } from '../utils/mediaUrl';

const DEFAULT_PH = '/placeholder-course.svg';

/**
 * Image with ImageKit-aware URL normalization and a local SVG fallback if the request fails
 * (deleted asset, typo, or offline CDN).
 */
export function SafeImage({
  src,
  alt = '',
  className,
  width,
  quality = 80,
  placeholder = DEFAULT_PH,
  loading = 'lazy',
  decoding = 'async',
  ...rest
}) {
  const [failed, setFailed] = useState(false);
  const normalized = failed ? placeholder : normalizeImageUrl(src, { width, quality });
  const finalSrc = normalized || placeholder;
  return (
    <img
      {...rest}
      src={finalSrc}
      alt={alt}
      className={className}
      loading={loading}
      decoding={decoding}
      onError={() => setFailed(true)}
    />
  );
}
