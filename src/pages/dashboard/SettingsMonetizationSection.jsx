import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import api from '../../api/client';

const TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'pricing', label: 'Course Pricing' },
  { key: 'coupons', label: 'Coupons' },
  { key: 'subscriptions', label: 'Subscriptions' },
  { key: 'withdrawals', label: 'Withdrawals' },
];

function SmzSettingsCard({ title, subtitle, children, footer }) {
  return (
    <section className="smz-settings-card">
      <header className="smz-settings-head">
        <h4>{title}</h4>
        {subtitle ? <p>{subtitle}</p> : null}
      </header>
      <div className="smz-settings-body">{children}</div>
      {footer ? <footer className="smz-settings-footer">{footer}</footer> : null}
    </section>
  );
}

function SmzSettingRow({ title, description, right, children }) {
  return (
    <div className="smz-setting-row">
      <div className="smz-setting-copy">
        <strong>{title}</strong>
        {description ? <p>{description}</p> : null}
      </div>
      <div className="smz-setting-control">{right || children}</div>
    </div>
  );
}

function formatWithdrawalMethod(method) {
  if (method === 'manual') return 'Manual (admin payout)';
  if (method === 'bank_transfer') return 'Bank Transfer';
  if (method === 'e_check') return 'E-Check';
  if (method === 'paypal') return 'PayPal';
  return String(method || '—');
}

export function SettingsMonetizationSection() {
  const [active, setActive] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState(null);
  const [pricingRows, setPricingRows] = useState([]);
  const [coupons, setCoupons] = useState([]);
  const [plans, setPlans] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);
  const [couponForm, setCouponForm] = useState({
    code: '',
    discount_type: 'percentage',
    discount_value: '',
    usage_limit: 1,
    expires_at: '',
    active: true,
  });
  const [planForm, setPlanForm] = useState({
    name: '',
    billing_cycle: 'monthly',
    price: '',
    access_scope: 'all_courses',
    course_ids: '',
    active: true,
  });
  const [pricingDrafts, setPricingDrafts] = useState({});
  const [saving, setSaving] = useState('');
  const [withdrawSettings, setWithdrawSettings] = useState({
    min_amount: 50,
    hold_days: 7,
    methods: {
      manual: true,
      bank_transfer: false,
      e_check: false,
      paypal: false,
    },
    bank_instructions: '',
  });

  async function loadAll() {
    setLoading(true);
    try {
      const [overviewRes, pricingRes, couponsRes, plansRes, withdrawalsRes, settingsRes] = await Promise.all([
        api.get('/monetization/overview'),
        api.get('/monetization/course-pricing'),
        api.get('/monetization/coupons'),
        api.get('/monetization/subscriptions'),
        api.get('/monetization/withdrawals'),
        api.get('/settings').catch(() => ({ data: {} })),
      ]);
      setOverview(overviewRes.data);
      setPricingRows(Array.isArray(pricingRes.data) ? pricingRes.data : []);
      setCoupons(Array.isArray(couponsRes.data) ? couponsRes.data : []);
      setPlans(Array.isArray(plansRes.data) ? plansRes.data : []);
      setWithdrawals(Array.isArray(withdrawalsRes.data) ? withdrawalsRes.data : []);
      const withdrawal = settingsRes?.data?.payment?.withdrawal || {};
      setWithdrawSettings({
        min_amount: Number(withdrawal?.min_amount ?? 50),
        hold_days: Number(withdrawal?.hold_days ?? 7),
        methods: {
          manual: Boolean(withdrawal?.methods?.manual ?? true),
          bank_transfer: Boolean(withdrawal?.methods?.bank_transfer ?? false),
          e_check: Boolean(withdrawal?.methods?.e_check ?? false),
          paypal: Boolean(withdrawal?.methods?.paypal ?? false),
        },
        bank_instructions: String(withdrawal?.bank_instructions || ''),
      });
      const drafts = {};
      (pricingRes.data || []).forEach((row) => {
        drafts[row._id] = {
          pricing_type: row.pricing_type || (Number(row.price || 0) > 0 ? 'paid' : 'free'),
          is_premium: Boolean(row.is_premium),
          price: String(row.price ?? ''),
          sale_price: String(row.sale_price ?? ''),
        };
      });
      setPricingDrafts(drafts);
    } catch {
      toast.error('Failed to load monetization data');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  const currency = overview?.currency || 'USD';
  const totals = overview?.totals || { platform_revenue: 0, instructor_earnings: 0, paid_sales: 0 };
  const topCourses = useMemo(() => (Array.isArray(overview?.course_sales) ? overview.course_sales.slice(0, 8) : []), [overview?.course_sales]);
  const topInstructors = useMemo(
    () => (Array.isArray(overview?.instructor_sales) ? overview.instructor_sales.slice(0, 8) : []),
    [overview?.instructor_sales]
  );

  async function savePricing(courseId) {
    const draft = pricingDrafts[courseId];
    if (!draft) return;
    setSaving(`pricing-${courseId}`);
    try {
      await api.patch(`/monetization/course-pricing/${courseId}`, {
        pricing_type: draft.pricing_type,
        is_premium: draft.is_premium,
        price: Number(draft.price || 0),
        sale_price: Number(draft.sale_price || 0),
      });
      toast.success('Pricing updated');
      await loadAll();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update pricing');
    } finally {
      setSaving('');
    }
  }

  async function createCoupon() {
    setSaving('coupon');
    try {
      await api.post('/monetization/coupons', {
        code: couponForm.code,
        discount_type: couponForm.discount_type,
        discount_value: Number(couponForm.discount_value || 0),
        usage_limit: Number(couponForm.usage_limit || 1),
        expires_at: couponForm.expires_at || null,
        active: couponForm.active,
      });
      toast.success('Coupon created');
      setCouponForm({
        code: '',
        discount_type: 'percentage',
        discount_value: '',
        usage_limit: 1,
        expires_at: '',
        active: true,
      });
      await loadAll();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create coupon');
    } finally {
      setSaving('');
    }
  }

  async function removeCoupon(id) {
    if (!window.confirm('Delete this coupon?')) return;
    setSaving(`coupon-del-${id}`);
    try {
      await api.delete(`/monetization/coupons/${id}`);
      toast.success('Coupon deleted');
      await loadAll();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete coupon');
    } finally {
      setSaving('');
    }
  }

  async function createPlan() {
    setSaving('plan');
    try {
      await api.post('/monetization/subscriptions', {
        name: planForm.name,
        billing_cycle: planForm.billing_cycle,
        price: Number(planForm.price || 0),
        access_scope: planForm.access_scope,
        course_ids:
          planForm.access_scope === 'selected_courses'
            ? planForm.course_ids
                .split(',')
                .map((x) => x.trim())
                .filter(Boolean)
            : [],
        active: planForm.active,
      });
      toast.success('Subscription plan created');
      setPlanForm({
        name: '',
        billing_cycle: 'monthly',
        price: '',
        access_scope: 'all_courses',
        course_ids: '',
        active: true,
      });
      await loadAll();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create plan');
    } finally {
      setSaving('');
    }
  }

  async function removePlan(id) {
    if (!window.confirm('Delete this subscription plan?')) return;
    setSaving(`plan-del-${id}`);
    try {
      await api.delete(`/monetization/subscriptions/${id}`);
      toast.success('Plan deleted');
      await loadAll();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete plan');
    } finally {
      setSaving('');
    }
  }

  async function reviewWithdrawal(id, status) {
    setSaving(`wd-${id}-${status}`);
    try {
      await api.patch(`/monetization/withdrawals/${id}/review`, { status });
      toast.success(`Withdrawal ${status}`);
      await loadAll();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to review withdrawal');
    } finally {
      setSaving('');
    }
  }

  async function saveWithdrawSettings() {
    const minAmount = Math.max(0, Number(withdrawSettings.min_amount || 0));
    const holdDays = Math.max(0, Number(withdrawSettings.hold_days || 0));
    setSaving('withdraw-settings');
    try {
      await api.patch('/settings/payment', {
        withdrawal: {
          min_amount: minAmount,
          hold_days: holdDays,
          methods: {
            manual: Boolean(withdrawSettings.methods.manual),
            bank_transfer: Boolean(withdrawSettings.methods.bank_transfer),
            e_check: Boolean(withdrawSettings.methods.e_check),
            paypal: Boolean(withdrawSettings.methods.paypal),
          },
          bank_instructions: String(withdrawSettings.bank_instructions || '').trim(),
        },
      });
      setWithdrawSettings((prev) => ({
        ...prev,
        min_amount: minAmount,
        hold_days: holdDays,
      }));
      toast.success('Withdraw settings saved');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save withdraw settings');
    } finally {
      setSaving('');
    }
  }

  if (loading && !overview) return <p style={{ color: 'var(--muted)' }}>Loading monetization...</p>;

  return (
    <div className="smz-root">
      <h3>Monetization Settings</h3>
      <p className="smz-note">Payment methods, currency, and commission are managed in Payment settings to avoid duplication.</p>
      <div className="smz-tabs">
        {TABS.map((tab) => (
          <button key={tab.key} type="button" className={`smz-tab ${active === tab.key ? 'active' : ''}`} onClick={() => setActive(tab.key)}>
            {tab.label}
          </button>
        ))}
      </div>

      {active === 'overview' && (
        <div className="smz-block">
          <div className="smz-summary-grid">
            <article className="smz-summary-card">
              <p>Platform revenue</p>
              <strong>{currency} {Number(totals.platform_revenue || 0).toFixed(2)}</strong>
            </article>
            <article className="smz-summary-card">
              <p>Instructor earnings</p>
              <strong>{currency} {Number(totals.instructor_earnings || 0).toFixed(2)}</strong>
            </article>
            <article className="smz-summary-card">
              <p>Paid sales</p>
              <strong>{Number(totals.paid_sales || 0).toLocaleString()}</strong>
            </article>
          </div>
          <div className="smz-two-col">
            <div>
              <h4>Top course sales</h4>
              <div className="table-wrap">
                <table className="data-table">
                  <thead><tr><th>Course</th><th>Sales</th><th>Revenue</th></tr></thead>
                  <tbody>
                    {topCourses.map((row) => (
                      <tr key={row.course_id}><td>{row.course_title}</td><td>{row.sales}</td><td>{currency} {Number(row.revenue || 0).toFixed(2)}</td></tr>
                    ))}
                    {topCourses.length === 0 && <tr><td colSpan={3}>No paid course sales yet.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
            <div>
              <h4>Top instructor earnings</h4>
              <div className="table-wrap">
                <table className="data-table">
                  <thead><tr><th>Instructor</th><th>Earnings</th></tr></thead>
                  <tbody>
                    {topInstructors.map((row) => (
                      <tr key={row.instructor_id}><td>{row.instructor_name}</td><td>{currency} {Number(row.earnings || 0).toFixed(2)}</td></tr>
                    ))}
                    {topInstructors.length === 0 && <tr><td colSpan={2}>No instructor earnings yet.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {active === 'pricing' && (
        <div className="smz-block">
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr><th>Course</th><th>Pricing</th><th>Premium</th><th>Price</th><th>Sale</th><th /></tr></thead>
              <tbody>
                {pricingRows.map((course) => {
                  const draft = pricingDrafts[course._id] || {};
                  return (
                    <tr key={course._id}>
                      <td>{course.title}</td>
                      <td>
                        <select className="input" value={draft.pricing_type || 'paid'} onChange={(e) => setPricingDrafts((prev) => ({ ...prev, [course._id]: { ...prev[course._id], pricing_type: e.target.value } }))}>
                          <option value="free">Free</option>
                          <option value="paid">Paid</option>
                        </select>
                      </td>
                      <td>
                        <label className="smz-check">
                          <input type="checkbox" checked={Boolean(draft.is_premium)} onChange={(e) => setPricingDrafts((prev) => ({ ...prev, [course._id]: { ...prev[course._id], is_premium: e.target.checked } }))} />
                          <span>Premium</span>
                        </label>
                      </td>
                      <td><input className="input" type="number" min="0" step="0.01" value={draft.price ?? ''} onChange={(e) => setPricingDrafts((prev) => ({ ...prev, [course._id]: { ...prev[course._id], price: e.target.value } }))} /></td>
                      <td><input className="input" type="number" min="0" step="0.01" value={draft.sale_price ?? ''} onChange={(e) => setPricingDrafts((prev) => ({ ...prev, [course._id]: { ...prev[course._id], sale_price: e.target.value } }))} /></td>
                      <td><button type="button" className="btn btn-primary" onClick={() => savePricing(course._id)} disabled={saving === `pricing-${course._id}`}>{saving === `pricing-${course._id}` ? 'Saving...' : 'Save'}</button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {active === 'coupons' && (
        <div className="smz-block">
          <div className="smz-form-grid">
            <label className="label">Code<input className="input" value={couponForm.code} onChange={(e) => setCouponForm((p) => ({ ...p, code: e.target.value }))} /></label>
            <label className="label">Discount type<select className="input" value={couponForm.discount_type} onChange={(e) => setCouponForm((p) => ({ ...p, discount_type: e.target.value }))}><option value="percentage">Percentage</option><option value="fixed">Fixed</option></select></label>
            <label className="label">Discount value<input className="input" type="number" min="0" value={couponForm.discount_value} onChange={(e) => setCouponForm((p) => ({ ...p, discount_value: e.target.value }))} /></label>
            <label className="label">Usage limit<input className="input" type="number" min="1" value={couponForm.usage_limit} onChange={(e) => setCouponForm((p) => ({ ...p, usage_limit: Number(e.target.value) }))} /></label>
            <label className="label">Expiry date<input className="input" type="date" value={couponForm.expires_at} onChange={(e) => setCouponForm((p) => ({ ...p, expires_at: e.target.value }))} /></label>
            <label className="smz-check"><input type="checkbox" checked={couponForm.active} onChange={(e) => setCouponForm((p) => ({ ...p, active: e.target.checked }))} /><span>Active</span></label>
            <button type="button" className="btn btn-primary" onClick={createCoupon} disabled={saving === 'coupon'}>{saving === 'coupon' ? 'Creating...' : 'Create Coupon'}</button>
          </div>
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr><th>Code</th><th>Type</th><th>Value</th><th>Usage</th><th>Expires</th><th>Active</th><th /></tr></thead>
              <tbody>
                {coupons.map((row) => (
                  <tr key={row._id}>
                    <td>{row.code}</td><td>{row.discount_type}</td><td>{row.discount_value}</td><td>{row.used_count}/{row.usage_limit}</td><td>{row.expires_at ? new Date(row.expires_at).toLocaleDateString() : '—'}</td><td>{row.active ? 'Yes' : 'No'}</td>
                    <td><button type="button" className="btn btn-ghost" onClick={() => removeCoupon(row._id)} disabled={saving === `coupon-del-${row._id}`}>Delete</button></td>
                  </tr>
                ))}
                {coupons.length === 0 && <tr><td colSpan={7}>No coupons yet.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {active === 'subscriptions' && (
        <div className="smz-block">
          <div className="smz-form-grid">
            <label className="label">Plan name<input className="input" value={planForm.name} onChange={(e) => setPlanForm((p) => ({ ...p, name: e.target.value }))} /></label>
            <label className="label">Billing cycle<select className="input" value={planForm.billing_cycle} onChange={(e) => setPlanForm((p) => ({ ...p, billing_cycle: e.target.value }))}><option value="monthly">Monthly</option><option value="yearly">Yearly</option></select></label>
            <label className="label">Price<input className="input" type="number" min="0" value={planForm.price} onChange={(e) => setPlanForm((p) => ({ ...p, price: e.target.value }))} /></label>
            <label className="label">Access scope<select className="input" value={planForm.access_scope} onChange={(e) => setPlanForm((p) => ({ ...p, access_scope: e.target.value }))}><option value="all_courses">All courses</option><option value="selected_courses">Selected courses</option></select></label>
            {planForm.access_scope === 'selected_courses' && (
              <label className="label" style={{ gridColumn: '1 / -1' }}>Course IDs (comma separated)
                <input className="input" value={planForm.course_ids} onChange={(e) => setPlanForm((p) => ({ ...p, course_ids: e.target.value }))} />
              </label>
            )}
            <label className="smz-check"><input type="checkbox" checked={planForm.active} onChange={(e) => setPlanForm((p) => ({ ...p, active: e.target.checked }))} /><span>Active</span></label>
            <button type="button" className="btn btn-primary" onClick={createPlan} disabled={saving === 'plan'}>{saving === 'plan' ? 'Creating...' : 'Create Plan'}</button>
          </div>
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr><th>Name</th><th>Cycle</th><th>Price</th><th>Scope</th><th>Active</th><th /></tr></thead>
              <tbody>
                {plans.map((row) => (
                  <tr key={row._id}>
                    <td>{row.name}</td><td>{row.billing_cycle}</td><td>{currency} {Number(row.price || 0).toFixed(2)}</td><td>{row.access_scope === 'all_courses' ? 'All courses' : `${row.course_ids?.length || 0} selected`}</td><td>{row.active ? 'Yes' : 'No'}</td>
                    <td><button type="button" className="btn btn-ghost" onClick={() => removePlan(row._id)} disabled={saving === `plan-del-${row._id}`}>Delete</button></td>
                  </tr>
                ))}
                {plans.length === 0 && <tr><td colSpan={6}>No subscription plans yet.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {active === 'withdrawals' && (
        <div className="smz-block">
          <SmzSettingsCard
            title="Withdraw Settings"
            subtitle="Configure instructor withdrawal requirements and available methods."
            footer={
              <button type="button" className="btn btn-primary" onClick={saveWithdrawSettings} disabled={saving === 'withdraw-settings'}>
                {saving === 'withdraw-settings' ? 'Saving...' : 'Save Settings'}
              </button>
            }
          >
            <SmzSettingRow
              title="Minimum Withdrawal Amount"
              description="Instructors should earn equal or above this amount to make a withdraw request."
              right={
                <input
                  className="input smz-small-input"
                  type="number"
                  min="0"
                  step="0.01"
                  value={withdrawSettings.min_amount}
                  onChange={(e) => setWithdrawSettings((prev) => ({ ...prev, min_amount: e.target.value }))}
                />
              }
            />
            <SmzSettingRow
              title="Minimum Days Before Balance is Available"
              description="Any income has to remain this many days before withdrawal."
              right={
                <input
                  className="input smz-small-input"
                  type="number"
                  min="0"
                  step="1"
                  value={withdrawSettings.hold_days}
                  onChange={(e) => setWithdrawSettings((prev) => ({ ...prev, hold_days: e.target.value }))}
                />
              }
            />
            <SmzSettingRow
              title="Enable Withdraw Method"
              description="Manual: instructors request a payout and you settle outside the app. Enable bank, e-check, or PayPal when you are ready."
              right={
                <div className="smz-methods-row">
                  <label className="smz-check">
                    <input
                      type="checkbox"
                      checked={withdrawSettings.methods.manual}
                      onChange={(e) =>
                        setWithdrawSettings((prev) => ({
                          ...prev,
                          methods: { ...prev.methods, manual: e.target.checked },
                        }))
                      }
                    />
                    <span>Manual (admin payout)</span>
                  </label>
                  <label className="smz-check">
                    <input
                      type="checkbox"
                      checked={withdrawSettings.methods.bank_transfer}
                      onChange={(e) =>
                        setWithdrawSettings((prev) => ({
                          ...prev,
                          methods: { ...prev.methods, bank_transfer: e.target.checked },
                        }))
                      }
                    />
                    <span>Bank Transfer</span>
                  </label>
                  <label className="smz-check">
                    <input
                      type="checkbox"
                      checked={withdrawSettings.methods.e_check}
                      onChange={(e) =>
                        setWithdrawSettings((prev) => ({
                          ...prev,
                          methods: { ...prev.methods, e_check: e.target.checked },
                        }))
                      }
                    />
                    <span>E-Check</span>
                  </label>
                  <label className="smz-check">
                    <input
                      type="checkbox"
                      checked={withdrawSettings.methods.paypal}
                      onChange={(e) =>
                        setWithdrawSettings((prev) => ({
                          ...prev,
                          methods: { ...prev.methods, paypal: e.target.checked },
                        }))
                      }
                    />
                    <span>PayPal</span>
                  </label>
                </div>
              }
            />
            <SmzSettingRow
              title="Bank Instructions"
              description="Write bank instructions for instructors to conduct withdrawals."
              right={
                <textarea
                  className="input smz-bank-textarea"
                  rows={5}
                  placeholder="Write the up to date bank information here..."
                  value={withdrawSettings.bank_instructions}
                  onChange={(e) => setWithdrawSettings((prev) => ({ ...prev, bank_instructions: e.target.value }))}
                />
              }
            />
          </SmzSettingsCard>

          <div className="table-wrap smz-withdraw-table">
            <table className="data-table">
              <thead><tr><th>Instructor</th><th>Amount</th><th>Method</th><th>Status</th><th>Requested</th><th /></tr></thead>
              <tbody>
                {withdrawals.map((row) => (
                  <tr key={row._id}>
                    <td>{row.instructor_id?.name || 'Instructor'}</td><td>{currency} {Number(row.amount || 0).toFixed(2)}</td><td>{formatWithdrawalMethod(row.method)}</td><td>{row.status}</td><td>{new Date(row.createdAt).toLocaleDateString()}</td>
                    <td>
                      {row.status === 'pending' && (
                        <div className="smz-inline-actions">
                          <button type="button" className="btn btn-ghost" onClick={() => reviewWithdrawal(row._id, 'approved')} disabled={saving === `wd-${row._id}-approved`}>Approve</button>
                          <button type="button" className="btn btn-ghost" onClick={() => reviewWithdrawal(row._id, 'rejected')} disabled={saving === `wd-${row._id}-rejected`}>Reject</button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
                {withdrawals.length === 0 && <tr><td colSpan={6}>No withdrawal requests yet.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <style>{`
        .smz-root { display: grid; gap: 0.75rem; }
        .smz-root h3 { margin: 0; }
        .smz-note { margin: 0; color: var(--muted); }
        .smz-tabs { display: flex; gap: 0.4rem; flex-wrap: wrap; }
        .smz-tab { border: 1px solid var(--border); background: var(--bg-elevated); border-radius: 10px; padding: 0.5rem 0.72rem; cursor: pointer; font-weight: 600; }
        .smz-tab.active { background: color-mix(in srgb, var(--primary) 12%, #fff); border-color: color-mix(in srgb, var(--primary) 35%, var(--border)); }
        .smz-block { display: grid; gap: 0.75rem; }
        .smz-summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 0.7rem; }
        .smz-summary-card { border: 1px solid var(--border); border-radius: 12px; background: var(--bg-elevated); padding: 0.8rem; }
        .smz-summary-card p { margin: 0; color: var(--muted); font-size: 0.84rem; }
        .smz-summary-card strong { display: block; margin-top: 0.3rem; font-size: 1.2rem; }
        .smz-two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 0.8rem; }
        .smz-form-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 0.65rem; align-items: end; }
        .smz-check { display: inline-flex; align-items: center; gap: 0.45rem; }
        .smz-inline-actions { display: inline-flex; gap: 0.4rem; }
        .smz-settings-card {
          border: 1px solid var(--border);
          border-radius: 14px;
          background: var(--bg-elevated);
          box-shadow: 0 8px 20px rgba(15, 23, 42, 0.06);
          overflow: hidden;
        }
        .smz-settings-head {
          padding: 0.85rem 0.95rem;
          border-bottom: 1px solid var(--border);
          background: color-mix(in srgb, var(--bg-soft) 84%, #fff);
        }
        .smz-settings-head h4 {
          margin: 0;
          font-size: 0.95rem;
          color: var(--heading);
        }
        .smz-settings-head p {
          margin: 0.2rem 0 0;
          color: var(--muted);
          font-size: 0.8rem;
        }
        .smz-settings-body {
          display: grid;
        }
        .smz-settings-footer {
          padding: 0.8rem 0.95rem;
          border-top: 1px solid var(--border);
          display: flex;
          justify-content: flex-end;
          background: #fff;
        }
        .smz-setting-row {
          display: grid;
          grid-template-columns: minmax(220px, 1fr) minmax(260px, 1fr);
          gap: 0.9rem;
          padding: 0.88rem 0.95rem;
          border-bottom: 1px solid var(--border);
          align-items: start;
        }
        .smz-setting-row:last-child { border-bottom: none; }
        .smz-setting-copy strong {
          display: block;
          color: var(--heading);
          font-size: 0.86rem;
        }
        .smz-setting-copy p {
          margin: 0.26rem 0 0;
          color: var(--muted);
          font-size: 0.78rem;
          max-width: 460px;
        }
        .smz-setting-control {
          display: flex;
          justify-content: flex-end;
        }
        .smz-small-input {
          width: min(180px, 100%);
          min-height: 36px;
        }
        .smz-methods-row {
          width: 100%;
          display: flex;
          justify-content: flex-end;
          gap: 1rem;
          flex-wrap: wrap;
        }
        .smz-bank-textarea {
          width: min(100%, 520px);
          resize: vertical;
        }
        .smz-withdraw-table {
          border: 1px solid var(--border);
          border-radius: 12px;
          background: var(--bg-elevated);
        }
        .smz-check input[type='checkbox'] {
          width: 16px;
          height: 16px;
          accent-color: var(--primary);
        }
        @media (max-width: 980px) { .smz-two-col { grid-template-columns: 1fr; } }
        @media (max-width: 900px) {
          .smz-setting-row {
            grid-template-columns: 1fr;
            gap: 0.55rem;
          }
          .smz-setting-control {
            justify-content: flex-start;
          }
          .smz-methods-row {
            justify-content: flex-start;
            gap: 0.75rem;
          }
          .smz-small-input,
          .smz-bank-textarea {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}
