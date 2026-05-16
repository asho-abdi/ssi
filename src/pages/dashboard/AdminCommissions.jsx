import { useEffect, useState, useMemo } from 'react';
import {
  BarChart3,
  DollarSign,
  Percent,
  Save,
  TrendingUp,
  Users,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../api/client';

const PAYMENT_LABELS = {
  evc_plus: 'EVC Plus',
  sahal: 'Sahal',
  zaad: 'Zaad',
  cash: 'Cash',
  bank_transfer: 'Bank Transfer',
};

export function AdminCommissions() {
  const [settings, setSettings] = useState(null);
  const [commission, setCommission] = useState(70);
  const [savingCommission, setSavingCommission] = useState(false);
  const [orders, setOrders] = useState([]);
  const [instructors, setInstructors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    Promise.all([
      api.get('/settings'),
      api.get('/orders').catch(() => ({ data: [] })),
      api.get('/users?role=teacher&limit=100').catch(() => ({ data: { users: [] } })),
    ])
      .then(([sRes, oRes, uRes]) => {
        const s = sRes.data;
        setSettings(s);
        setCommission(s?.monetization?.instructor_commission_percent ?? 70);
        setOrders(Array.isArray(oRes.data) ? oRes.data : oRes.data?.orders || []);
        setInstructors(Array.isArray(uRes.data) ? uRes.data : uRes.data?.users || []);
      })
      .catch(() => toast.error('Could not load commission data'))
      .finally(() => setLoading(false));
  }, []);

  const stats = useMemo(() => {
    const paid = orders.filter((o) => o.status === 'paid');
    const totalRevenue = paid.reduce((s, o) => s + Number(o.amount || 0), 0);
    const totalInstructorEarnings = paid.reduce((s, o) => s + Number(o.instructor_earning || 0), 0);
    const totalPlatformEarnings = paid.reduce((s, o) => s + Number(o.admin_earning || 0), 0);
    return { totalRevenue, totalInstructorEarnings, totalPlatformEarnings, count: paid.length };
  }, [orders]);

  const instructorBreakdown = useMemo(() => {
    const map = {};
    orders
      .filter((o) => o.status === 'paid' && o.instructor_id)
      .forEach((o) => {
        const key = String(o.instructor_id?._id || o.instructor_id);
        if (!map[key]) {
          map[key] = {
            id: key,
            name: o.instructor_id?.name || 'Unknown',
            email: o.instructor_id?.email || '',
            sales: 0,
            instructorEarning: 0,
            platformEarning: 0,
          };
        }
        map[key].sales++;
        map[key].instructorEarning += Number(o.instructor_earning || 0);
        map[key].platformEarning += Number(o.admin_earning || 0);
      });
    return Object.values(map).sort((a, b) => b.instructorEarning - a.instructorEarning);
  }, [orders]);

  const filteredBreakdown = useMemo(() => {
    if (!search.trim()) return instructorBreakdown;
    const q = search.trim().toLowerCase();
    return instructorBreakdown.filter((i) =>
      i.name.toLowerCase().includes(q) || i.email.toLowerCase().includes(q)
    );
  }, [instructorBreakdown, search]);

  async function saveCommission(e) {
    e.preventDefault();
    const pct = Number(commission);
    if (!Number.isFinite(pct) || pct < 0 || pct > 100) {
      toast.error('Commission must be between 0 and 100');
      return;
    }
    setSavingCommission(true);
    try {
      await api.patch('/settings', {
        monetization: { instructor_commission_percent: pct },
      });
      toast.success(`Instructor commission set to ${pct}% (Platform: ${100 - pct}%)`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not save settings');
    } finally {
      setSavingCommission(false);
    }
  }

  if (loading) return <div style={{ padding: '2rem', color: '#64748b' }}>Loading…</div>;

  const platformPct = Math.max(0, 100 - Number(commission));

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1100px', margin: '0 auto' }}>

      {/* Revenue Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '1rem', marginBottom: '2rem' }}>
        {[
          { label: 'Total Revenue', value: `$${stats.totalRevenue.toFixed(2)}`, color: '#1d3557', bg: '#eff6ff', icon: <DollarSign size={20} /> },
          { label: 'Instructor Earnings', value: `$${stats.totalInstructorEarnings.toFixed(2)}`, color: '#15803d', bg: '#dcfce7', icon: <TrendingUp size={20} /> },
          { label: 'Platform Earnings', value: `$${stats.totalPlatformEarnings.toFixed(2)}`, color: '#b45309', bg: '#fef3c7', icon: <BarChart3 size={20} /> },
          { label: 'Total Sales', value: stats.count, color: '#6d28d9', bg: '#ede9fe', icon: <Users size={20} /> },
        ].map((s) => (
          <div key={s.label} style={{
            background: s.bg, borderRadius: '14px', padding: '1.25rem',
            display: 'flex', alignItems: 'center', gap: '1rem',
          }}>
            <div style={{ color: s.color, opacity: 0.7 }}>{s.icon}</div>
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: s.color, opacity: 0.65, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{s.label}</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: s.color, lineHeight: 1.1 }}>{s.value}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: '1.5rem', alignItems: 'start' }}>

        {/* Commission Settings Card */}
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '1.5rem', boxShadow: '0 2px 12px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.25rem' }}>
            <Percent size={20} color="#1d3557" />
            <h2 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#1d3557' }}>Commission Split</h2>
          </div>

          <form onSubmit={saveCommission} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.86rem', fontWeight: 600, color: '#374151', marginBottom: '0.4rem' }}>
                Instructor Share (%)
              </label>
              <input
                type="number"
                min={0}
                max={100}
                step={1}
                value={commission}
                onChange={(e) => setCommission(e.target.value)}
                style={{
                  width: '100%', boxSizing: 'border-box',
                  height: '42px', padding: '0 0.85rem',
                  border: '1.5px solid #d1d5db', borderRadius: '8px',
                  fontSize: '0.95rem', fontFamily: 'inherit', outline: 'none',
                }}
              />
            </div>

            {/* Visual split bar */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.4rem' }}>
                <span style={{ color: '#15803d' }}>Instructor: {commission}%</span>
                <span style={{ color: '#b45309' }}>Platform: {platformPct}%</span>
              </div>
              <div style={{ height: '12px', borderRadius: '6px', background: '#e2e8f0', overflow: 'hidden', display: 'flex' }}>
                <div style={{ width: `${commission}%`, background: 'linear-gradient(90deg,#16a34a,#22c55e)', transition: 'width 0.3s' }} />
                <div style={{ flex: 1, background: 'linear-gradient(90deg,#f59e0b,#fbbf24)' }} />
              </div>
            </div>

            <div style={{ background: '#f8fafc', borderRadius: '8px', padding: '0.85rem', fontSize: '0.84rem', color: '#64748b', lineHeight: 1.6 }}>
              On a <strong>$100</strong> sale:<br />
              Instructor earns <strong style={{ color: '#15803d' }}>${commission}</strong> ·
              Platform earns <strong style={{ color: '#b45309' }}>${platformPct}</strong>
            </div>

            <button
              type="submit"
              disabled={savingCommission}
              style={{
                height: '42px', background: '#1d3557', color: '#fff', border: 'none',
                borderRadius: '8px', fontWeight: 700, fontSize: '0.9rem', fontFamily: 'inherit',
                cursor: 'pointer', display: 'inline-flex', alignItems: 'center',
                justifyContent: 'center', gap: '0.45rem', opacity: savingCommission ? 0.65 : 1,
              }}
            >
              <Save size={15} />
              {savingCommission ? 'Saving…' : 'Save Commission'}
            </button>
          </form>
        </div>

        {/* Instructor Breakdown Table */}
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '14px', overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.05)' }}>
          <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
            <h2 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#1d3557' }}>Instructor Earnings</h2>
            <input
              type="text"
              placeholder="Search instructor…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                height: '36px', padding: '0 0.75rem', border: '1.5px solid #e2e8f0', borderRadius: '8px',
                fontSize: '0.85rem', fontFamily: 'inherit', outline: 'none', width: '200px',
              }}
            />
          </div>

          {filteredBreakdown.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>
              <BarChart3 size={40} style={{ opacity: 0.3, marginBottom: '0.5rem' }} />
              <p style={{ margin: 0 }}>No earnings data yet.</p>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  {['Instructor', 'Sales', 'Instructor Earning', 'Platform Earning', 'Total'].map((h) => (
                    <th key={h} style={{ padding: '0.8rem 1rem', textAlign: 'left', fontWeight: 700, color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredBreakdown.map((ins, i) => (
                  <tr key={ins.id} style={{ borderBottom: i < filteredBreakdown.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <div style={{ fontWeight: 600, color: '#1e293b' }}>{ins.name}</div>
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{ins.email}</div>
                    </td>
                    <td style={{ padding: '0.85rem 1rem', color: '#64748b', fontWeight: 600 }}>{ins.sales}</td>
                    <td style={{ padding: '0.85rem 1rem', fontWeight: 700, color: '#15803d' }}>
                      ${ins.instructorEarning.toFixed(2)}
                    </td>
                    <td style={{ padding: '0.85rem 1rem', fontWeight: 700, color: '#b45309' }}>
                      ${ins.platformEarning.toFixed(2)}
                    </td>
                    <td style={{ padding: '0.85rem 1rem', fontWeight: 800, color: '#1d3557' }}>
                      ${(ins.instructorEarning + ins.platformEarning).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
