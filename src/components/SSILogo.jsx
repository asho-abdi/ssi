import { Link } from 'react-router-dom';

export function SSILogo({ full = true, className = '', withLink = true }) {
  const src = full ? '/logo-full.png' : '/logo-mark.png';
  const alt = full ? 'Success Skills Institute' : 'SSI logo';
  if (!withLink) {
    return <img src={src} alt={alt} className={`${full ? 'landing-logo-full' : 'landing-logo-mark'} ${className}`.trim()} />;
  }
  return (
    <Link to="/" className={`landing-logo ${className}`.trim()}>
      <img src={src} alt={alt} className={full ? 'landing-logo-full' : 'landing-logo-mark'} />
    </Link>
  );
}
