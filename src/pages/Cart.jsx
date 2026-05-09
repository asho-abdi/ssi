import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ShoppingCart, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api/client';
import { getCartIds, removeFromCart, setCartIds } from '../utils/cart';
import { SafeImage } from '../components/SafeImage';
import { resolveMediaUrl } from '../utils/mediaUrl';

const CART_THUMB_FALLBACK = '/placeholder-course.svg';

function getCoursePrice(course) {
  const sale = Number(course?.sale_price || 0);
  const regular = Number(course?.price || 0);
  if (Number.isFinite(sale) && sale > 0 && sale < regular) return sale;
  return regular;
}

export function Cart() {
  const [loading, setLoading] = useState(true);
  const [courses, setCourses] = useState([]);
  const [cartIds, setLocalCartIds] = useState(() => getCartIds());

  useEffect(() => {
    let cancelled = false;
    api
      .get('/courses')
      .then((res) => {
        if (!cancelled) setCourses(Array.isArray(res.data) ? res.data : []);
      })
      .catch(() => {
        if (!cancelled) toast.error('Failed to load cart items');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const cartCourses = useMemo(() => {
    const setIds = new Set(cartIds.map(String));
    return courses.filter((c) => setIds.has(String(c._id)));
  }, [courses, cartIds]);

  const total = useMemo(
    () => cartCourses.reduce((sum, c) => sum + getCoursePrice(c), 0),
    [cartCourses]
  );

  function removeItem(courseId) {
    const updated = removeFromCart(courseId);
    setLocalCartIds(updated);
    toast.success('Removed from cart');
  }

  function clearCart() {
    setCartIds([]);
    setLocalCartIds([]);
    toast.success('Cart cleared');
  }

  return (
    <div className="page-shell">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ display: 'inline-flex', alignItems: 'center', gap: '0.55rem' }}>
            <ShoppingCart size={24} />
            Cart
          </h1>
          <p style={{ color: 'var(--muted)', marginTop: '0.35rem' }}>{cartCourses.length} items</p>
        </div>
        <Link to="/" className="btn btn-secondary">
          <ArrowLeft size={16} />
          Continue shopping
        </Link>
      </div>

      {loading ? (
        <p style={{ color: 'var(--muted)', marginTop: '1rem' }}>Loading...</p>
      ) : cartCourses.length === 0 ? (
        <div className="card" style={{ marginTop: '1rem' }}>
          <p style={{ margin: 0 }}>Your cart is empty.</p>
        </div>
      ) : (
        <>
          <div style={{ display: 'grid', gap: '0.8rem', marginTop: '1rem' }}>
            {cartCourses.map((course) => (
              <article key={course._id} className="card" style={{ display: 'grid', gridTemplateColumns: '72px 1fr auto', gap: '0.9rem', alignItems: 'center' }}>
                <SafeImage
                  src={resolveMediaUrl(course.thumbnail)}
                  alt={course.title}
                  placeholder={CART_THUMB_FALLBACK}
                  width={200}
                  quality={80}
                  style={{ width: 72, height: 54, borderRadius: 10, objectFit: 'cover', border: '1px solid var(--border)' }}
                />
                <div>
                  <strong>{course.title}</strong>
                  <div style={{ color: 'var(--muted)', fontSize: '0.88rem', marginTop: '0.2rem' }}>
                    ${getCoursePrice(course).toFixed(2)}
                    {getCoursePrice(course) < Number(course.price || 0) && (
                      <span style={{ marginLeft: '0.45rem', textDecoration: 'line-through' }}>${Number(course.price).toFixed(2)}</span>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                  <Link to={`/checkout/${course._id}`} className="btn btn-primary">
                    Checkout
                  </Link>
                  <button type="button" className="btn btn-ghost" onClick={() => removeItem(course._id)}>
                    <Trash2 size={16} />
                    Remove
                  </button>
                </div>
              </article>
            ))}
          </div>

          <div className="card" style={{ marginTop: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <strong style={{ fontSize: '1.05rem' }}>Total: ${total.toFixed(2)}</strong>
            <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
              <button type="button" className="btn btn-ghost" onClick={clearCart}>
                Clear cart
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
