import { useState } from 'react';
import { Link } from 'react-router-dom';

/** Text mark when all logo assets fail to load. */
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

const SRC_CHAINS = {
  full: ['/logo-full.png', '/logo-full.svg'],
  mark: ['/logo-mark.svg', '/logo-mark.png'],
};

export function SSILogo({ full = true, className = '', withLink = true }) {
  const [srcIndex, setSrcIndex] = useState(0);
  const alt = full ? 'Success Skills Institute' : 'SSI logo';
  const imgClass = `${full ? 'landing-logo-full' : 'landing-logo-mark'} ${className}`.trim();
  const chain = full ? SRC_CHAINS.full : SRC_CHAINS.mark;

  if (srcIndex >= chain.length) {
    const inner = <FallbackWordmark full={full} className={imgClass} alt={alt} />;
    if (!withLink) return inner;
    return (
      <Link to="/" className={`landing-logo ${className}`.trim()}>
        {inner}
      </Link>
    );
  }

  const img = (
    <img
      src={chain[srcIndex]}
      alt={alt}
      className={imgClass}
      onError={() => setSrcIndex((i) => i + 1)}
      loading="eager"
      decoding="async"
    />
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
