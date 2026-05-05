const CART_STORAGE_KEY = 'ssi_cart_course_ids';

export function getCartIds() {
  try {
    const raw = localStorage.getItem(CART_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
  } catch {
    return [];
  }
}

export function setCartIds(ids) {
  const normalized = Array.isArray(ids) ? Array.from(new Set(ids.map(String))) : [];
  localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(normalized));
  return normalized;
}

export function addToCart(courseId) {
  const current = getCartIds();
  if (current.includes(String(courseId))) return current;
  return setCartIds([...current, String(courseId)]);
}

export function removeFromCart(courseId) {
  const current = getCartIds();
  return setCartIds(current.filter((id) => id !== String(courseId)));
}
