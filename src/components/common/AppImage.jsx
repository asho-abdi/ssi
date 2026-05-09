import { useMemo, useState } from 'react';
import { normalizeImageUrl } from '../../utils/normalizeImageUrl';

const DEFAULT_PLACEHOLDER = '/placeholder-course.svg';

/**
 * Reusable image component used across the app.
 * - Normalizes URLs for localhost / legacy upload paths
 * - Handles broken URLs with fallback placeholder
 * - Supports lazy loading and a basic loading skeleton state
 */
export function AppImage({
  src,
  alt = '',
  className = '',
  style,
  width,
  height,
  quality = 80,
  fallback = DEFAULT_PLACEHOLDER,
  lazy = true,
  responsive = true,
  showSkeleton = true,
  onLoad,
  onError,
  ...rest
}) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isBroken, setIsBroken] = useState(false);
  const normalizedSrc = useMemo(() => {
    return normalizeImageUrl(isBroken ? fallback : src, { fallback, width, quality });
  }, [isBroken, fallback, src, width, quality]);

  return (
    <span
      className="app-image-wrap"
      style={{
        display: 'inline-block',
        position: 'relative',
        overflow: 'hidden',
        ...(responsive ? { maxWidth: '100%' } : {}),
      }}
    >
      {showSkeleton && !isLoaded ? (
        <span
          aria-hidden
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(90deg, rgba(226,232,240,0.9), rgba(241,245,249,0.95), rgba(226,232,240,0.9))',
          }}
        />
      ) : null}
      <img
        {...rest}
        src={normalizedSrc}
        alt={alt}
        className={className}
        width={width}
        height={height}
        loading={lazy ? 'lazy' : 'eager'}
        decoding="async"
        style={{
          ...style,
          width: style?.width ?? (width ?? (responsive ? '100%' : undefined)),
          height: style?.height ?? height,
          opacity: isLoaded ? 1 : 0.01,
          transition: 'opacity 180ms ease',
        }}
        onLoad={(event) => {
          setIsLoaded(true);
          onLoad?.(event);
        }}
        onError={(event) => {
          setIsBroken(true);
          setIsLoaded(true);
          onError?.(event);
        }}
      />
    </span>
  );
}

