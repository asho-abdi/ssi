import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarDays, Facebook, Instagram, Linkedin, Mail, MapPin, Phone, Search, Tag } from 'lucide-react';
import { SSILogo } from '../components/SSILogo';
import { useAuth } from '../context/AuthContext';
import './Home.css';

const WA_LINK = 'https://wa.me/252615942611';

const EVENT_ITEMS = [
  { id: 1, title: 'NGO Management', day: '20', month: 'Aug', tag: 'Seminar', image: '/events/event-1.png' },
  {
    id: 2,
    title: 'Fagaare ka hadalka (Public Speaking)',
    day: '12',
    month: 'Jul',
    tag: 'Seminar',
    image: '/events/event-2.png',
  },
  {
    id: 3,
    title: 'Kulanka Dhallinyarada iyo Hadoorka Bulshada',
    day: '21',
    month: 'Feb',
    tag: 'Seminar',
    image: '/events/event-3.png',
  },
  { id: 4, title: 'Acquiring Life Skills', day: '12', month: 'Jul', tag: 'Seminar', image: '/events/event-5.png' },
  { id: 5, title: 'Office Management Skills', day: '15', month: 'Jun', tag: 'Seminar', image: '/events/event-6.png' },
  {
    id: 6,
    title: 'Project Management',
    day: '27',
    month: 'Jan',
    tag: 'Uncategorized',
    image: '/events/event-project-management.png',
  },
  {
    id: 7,
    title: 'Personal Strategic Plan',
    day: '05',
    month: 'Jan',
    tag: 'Seminar',
    image: '/events/event-personal-strategic-plan.png',
  },
  { id: 8, title: 'Dood Wadaag', day: '27', month: 'Dec', tag: 'Dood', image: '/events/event-dood-wadaag.png' },
];

export function Events() {
  const { user, logout } = useAuth();
  const [search, setSearch] = useState('');

  const filteredEvents = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return EVENT_ITEMS;
    return EVENT_ITEMS.filter((item) => item.title.toLowerCase().includes(q) || item.tag.toLowerCase().includes(q));
  }, [search]);

  return (
    <div className="landing-root">
      <header className="landing-header">
        <div className="landing-inner landing-header-row">
          <SSILogo />
          <nav className="landing-nav" aria-label="Main">
            <Link to="/">Home</Link>
            <Link to="/#catalog">Courses</Link>
            {user ? <Link to="/dashboard">Dashboard</Link> : <Link to="/login">Dashboard</Link>}
            <Link to="/become-instructor">Become Instructor</Link>
            <Link to="/events" className="is-active">
              Events
            </Link>
            <Link to="/offline-enrollment">Offline Enrollment</Link>
            <a href="#footer-contact">Contacts</a>
          </nav>
          <div className="landing-header-actions">
            {user ? (
              <>
                <span className="landing-user-name" title={user.email}>
                  {user.name}
                </span>
                <Link to="/dashboard" className="landing-btn-signup">
                  Dashboard
                </Link>
                <button
                  type="button"
                  className="landing-link-signin landing-signout-btn"
                  onClick={() => logout()}
                >
                  Sign out
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="landing-link-signin">
                  Sign In
                </Link>
                <Link to="/register" className="landing-btn-signup">
                  Sign Up
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="bg-gradient-to-b from-[#f8fbff] to-[#edf2f7]">
        <section
          className="relative flex min-h-[430px] items-center bg-cover bg-no-repeat md:[background-position:center_24%] [background-position:center_18%]"
          style={{ backgroundImage: "url('/events/event-1.png')" }}
        >
          <div className="absolute inset-0 bg-[linear-gradient(110deg,rgba(19,41,74,0.9),rgba(19,41,74,0.45))]" />
          <div className="landing-inner relative z-[1] flex w-full flex-col items-center px-4 py-8 text-center text-white">
            <span className="mb-4 inline-flex items-center rounded-full border border-white/35 px-3 py-1 text-xs">
              Success Skills Institute
            </span>
            <h1 className="mb-3 text-[clamp(2.1rem,5vw,3.2rem)] font-bold leading-[1.1]">
              Explore Our <span className="text-[#f28c28]">Events</span>
            </h1>
            <p className="max-w-3xl leading-relaxed text-white/90">
              Our events bring together learners, professionals, and educators through workshops, seminars, and
              special programs designed to share knowledge, build skills, and create valuable connections.
            </p>
            <form
              className="mt-6 flex w-full max-w-[740px] flex-col items-stretch gap-2 md:flex-row md:items-center"
              onSubmit={(e) => e.preventDefault()}
              aria-label="Search events"
            >
              <div className="flex flex-1 items-center gap-2 rounded-[10px] border border-[#cbd5e0] bg-white px-3 py-2 text-[#64748b]">
                <Search size={20} aria-hidden />
                <input
                  type="search"
                  placeholder="Search events..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full border-none bg-transparent text-[0.97rem] text-[#1f2937] outline-none"
                />
              </div>
              <button
                type="submit"
                className="cursor-pointer rounded-[10px] border-none bg-[#1d3557] px-5 py-3 font-bold text-white transition hover:brightness-110"
              >
                Search
              </button>
            </form>
          </div>
        </section>

        <section className="py-8">
          <div className="landing-inner">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="m-0 text-[#1d3557]">All Events</h2>
              <span className="inline-flex items-center rounded-full bg-[#dbeafe] px-3 py-1 text-xs font-bold text-[#1d3557]">
                {filteredEvents.length} events
              </span>
            </div>
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
              {filteredEvents.map((item) => (
                <article
                  key={item.id}
                  className="overflow-hidden rounded-[14px] border border-[rgba(29,53,87,0.08)] bg-white shadow-[0_10px_24px_rgba(15,23,42,0.08)] transition hover:-translate-y-1 hover:shadow-[0_16px_32px_rgba(15,23,42,0.12)]"
                >
                  <div className="relative">
                    <img
                      src={item.image}
                      alt={item.title}
                      loading="lazy"
                      className="block h-[212px] w-full object-cover object-center"
                    />
                    <span className="absolute left-2.5 top-2.5 inline-flex items-center gap-1 rounded-md bg-[#1d3f72] px-2 py-1 text-[0.72rem] font-bold text-white">
                      <Tag size={13} />
                      {item.tag}
                    </span>
                    <span className="absolute bottom-[-18px] left-3.5 flex h-[54px] w-[54px] flex-col items-center justify-center rounded-full bg-[#1d3f72] text-white shadow-[0_8px_18px_rgba(29,63,114,0.34)]">
                      <strong>{item.day}</strong>
                      <small className="mt-0.5 text-[0.66rem] uppercase">{item.month}</small>
                    </span>
                  </div>
                  <div className="p-4 pt-8">
                    <h3 className="mb-3 min-h-[52px] text-[1.02rem] font-semibold text-[#1d3557]">{item.title}</h3>
                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1 text-[0.84rem] font-semibold text-[#475569]">
                        <CalendarDays size={15} />
                        {item.day} {item.month}
                      </span>
                      <button
                        type="button"
                        className="cursor-pointer rounded-lg border-none bg-[#1d3f72] px-4 py-2 text-[0.84rem] font-bold text-white transition hover:brightness-110"
                      >
                        Learn more
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
            {!filteredEvents.length && <p className="mt-4 text-[#64748b]">No events found. Try a different search term.</p>}
          </div>
        </section>
      </main>

      <footer id="footer-contact" className="landing-footer">
        <div className="landing-inner landing-footer-grid">
          <div>
            <SSILogo />
            <p className="landing-footer-tagline">Empowering Your Dreams with Real-World Skills</p>
            <div className="landing-social">
              <a href="https://facebook.com" target="_blank" rel="noreferrer" aria-label="Facebook">
                <Facebook size={18} />
              </a>
              <a href="https://tiktok.com" target="_blank" rel="noreferrer" aria-label="TikTok">
                <span className="landing-social-note">♪</span>
              </a>
              <a href="https://linkedin.com" target="_blank" rel="noreferrer" aria-label="LinkedIn">
                <Linkedin size={18} />
              </a>
              <a href="https://instagram.com" target="_blank" rel="noreferrer" aria-label="Instagram">
                <Instagram size={18} />
              </a>
            </div>
          </div>
          <div>
            <h3>Quick Links</h3>
            <ul className="landing-footer-links">
              <li>
                <Link to="/">Home</Link>
              </li>
              <li>
                <Link to="/#catalog">Courses</Link>
              </li>
              <li>
                <Link to="/dashboard">Dashboard</Link>
              </li>
              <li>
                <Link to="/events">Events</Link>
              </li>
            </ul>
          </div>
          <div>
            <h3>Stay Connected</h3>
            <ul className="landing-footer-contact">
              <li>
                <Mail size={18} aria-hidden />
                <a href="mailto:info@ssi.so">info@ssi.so</a>
              </li>
              <li>
                <Phone size={18} aria-hidden />
                <a href="tel:+252615942611">+252 61 5942611</a>
              </li>
              <li>
                <MapPin size={18} aria-hidden />
                <span>Headquarter Office, Mogadishu, Somalia</span>
              </li>
            </ul>
          </div>
        </div>
        <div className="landing-inner landing-footer-bar">
          <span>© {new Date().getFullYear()} Success Skills Institute — SSI. All Rights Reserved.</span>
          <span>
            <a href="#footer-contact">About</a>
            {' · '}
            <a href="#footer-contact">Privacy Policy</a>
          </span>
        </div>
      </footer>

      <a href={WA_LINK} className="landing-wa-fab" target="_blank" rel="noreferrer" aria-label="Chat on WhatsApp">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.123 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
        </svg>
      </a>
    </div>
  );
}
