import { useState } from 'react';
import { Link } from 'react-router-dom';

/** Text mark when `public/logo-*.png` is missing (common on Vercel if assets weren’t committed). */
function FallbackWordmark({ full, className, alt }) {
  return (
    <span
      className={className}
      role="img"
      aria-label={alt}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        fontWeight: 800,
        fontSize: full ? '1.15rem' : '1rem',
        letterSpacing: '-0.02em',
        color: 'var(--heading, #111827)',
        lineHeight: 1,
      }}
    >
      SSI
    </span>
  );
}

export function SSILogo({ full = true, className = '', withLink = true }) {
  const [useFallback, setUseFallback] = useState(false);
  const alt = full ? 'Success Skills Institute' : 'SSI logo';
  const imgClass = `${full ? 'landing-logo-full' : 'landing-logo-mark'} ${className}`.trim();

  if (useFallback) {
    const inner = <FallbackWordmark full={full} className={imgClass} alt={alt} />;
    if (!withLink) return inner;
    return (
      <Link to="/" className={`landing-logo ${className}`.trim()}>
        {inner}
      </Link>
    );
  }

  const src = full ? '/logo-full.png' : '/logo-mark.png';
  const img = (
    <img src={src} alt={alt} className={imgClass} onError={() => setUseFallback(true)} loading="eager" decoding="async" />
  );

  if (!withLink) {
    return img;
  }
  return (
    <Link to="/" className={`landing-logo ${className}`.trim()}>
      {img}
    </Link>
  );
}
