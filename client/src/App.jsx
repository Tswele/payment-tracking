import React, { useState, useEffect, useCallback } from 'react';
import './App.css';

const API = '/api';

function formatAmount(n) {
  if (n == null || Number.isNaN(n)) return '—';
  return new Intl.NumberFormat(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);
}

function getMonthKeys() {
  // January 2026 to December 2026
  const keys = [];
  for (let month = 1; month <= 12; month++) {
    keys.push(`2026-${String(month).padStart(2, '0')}`);
  }
  return keys;
}

function monthLabel(key) {
  const [y, m] = key.split('-');
  const date = new Date(parseInt(y, 10), parseInt(m, 10) - 1);
  return date.toLocaleDateString(undefined, { month: 'short', year: '2-digit' });
}

// Payment closes on the 5th of each month. Returns: 'paid' | 'warning' | 'overdue' | 'future'
function getCellStatus(monthKey, hasPayment) {
  if (hasPayment) return 'paid';
  const [y, m] = monthKey.split('-').map(Number);
  const firstDay = new Date(y, m - 1, 1);
  const deadline = new Date(y, m - 1, 5); // 5th of the month
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  firstDay.setHours(0, 0, 0, 0);
  deadline.setHours(23, 59, 59, 999);
  if (today < firstDay) return 'future';           // Month not started yet
  if (today <= deadline) return 'warning';          // In window 1st–5th: amber
  return 'overdue';                                 // Past 5th: red
}

export default function App() {
  const [members, setMembers] = useState([]);
  const [payments, setPayments] = useState([]);
  const [expected, setExpected] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const monthKeys = getMonthKeys();

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const [membersRes, paymentsRes, expectedRes] = await Promise.all([
        fetch(`${API}/members`),
        fetch(`${API}/payments`),
        fetch(`${API}/expected`),
      ]);
      if (!membersRes.ok) throw new Error('Failed to load members');
      if (!paymentsRes.ok) throw new Error('Failed to load payments');
      if (!expectedRes.ok) throw new Error('Failed to load expected');
      const [membersData, paymentsData, expectedData] = await Promise.all([
        membersRes.json(),
        paymentsRes.json(),
        expectedRes.json(),
      ]);
      setMembers(membersData);
      setPayments(paymentsData);
      setExpected(expectedData || {});
    } catch (e) {
      setError(e.message);
      setMembers([]);
      setPayments([]);
      setExpected({});
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 15000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const cellMap = React.useMemo(() => {
    const map = {};
    payments.forEach((p) => {
      const k = `${p.memberName}|${p.month}`;
      map[k] = { amount: p.amount, winner: p.winner, proofFilename: p.proofFilename };
    });
    return map;
  }, [payments]);

  const getExpected = (monthKey) => {
    const n = expected[monthKey];
    if (n != null && !Number.isNaN(Number(n))) return Number(n);
    return 2550;
  };

  const totalReceived = {};
  monthKeys.forEach((mo) => {
    totalReceived[mo] = payments
      .filter((p) => p.month === mo)
      .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    const form = e.target;
    const fd = new FormData(form);
    setSubmitting(true);
    setSubmitSuccess(false);
    setError(null);
    try {
      const res = await fetch(`${API}/payments`, {
        method: 'POST',
        body: fd,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || res.statusText || 'Upload failed');
      }
      await fetchData();
      form.reset();
      form.month.value = new Date().toISOString().slice(0, 7);
      setSubmitSuccess(true);
      setTimeout(() => setSubmitSuccess(false), 4000);
    } catch (e) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const today = new Date();
  const currentMonthKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;

  return (
    <div className="app">
      <header className="header">
        <h1>Mashayinduna Monthly Update</h1>
        <p className="tagline">Upload proof of payment for a member and month — the grid updates automatically. Payments close on the 5th of each month.</p>
      </header>

      <main className="main">
        <section className="upload-section card">
          <h2>Submit proof of payment</h2>
          <form onSubmit={handleSubmit} className="upload-form">
            <div className="form-row">
              <label>
                <span>Name</span>
                <select name="name" required>
                  <option value="">Select member</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.name}>{m.name}</option>
                  ))}
                </select>
              </label>
              <label>
                <span>Month</span>
                <select name="month" required defaultValue={monthKeys.includes(currentMonthKey) ? currentMonthKey : '2026-01'}>
                  {monthKeys.map((k) => (
                    <option key={k} value={k}>{monthLabel(k)}</option>
                  ))}
                </select>
              </label>
            </div>
            <div className="form-row">
              <label>
                <span>Amount</span>
                <input name="amount" type="text" placeholder="e.g. 100" required />
              </label>
              <label className="checkbox-label">
                <span>Winner</span>
                <input name="winner" type="checkbox" value="true" />
              </label>
            </div>
            <label className="file-label full">
              <span>Proof of payment <em>(required — image or PDF)</em></span>
              <input name="proof" type="file" accept=".jpg,.jpeg,.png,.gif,.webp,.pdf" required />
            </label>
            <div className="form-actions">
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                {submitting ? 'Uploading…' : 'Upload proof'}
              </button>
              {submitSuccess && <span className="success-msg">Uploaded. Grid updated.</span>}
            </div>
          </form>
        </section>

        <section className="grid-section card">
          <h2>Payment grid</h2>
          <p className="grid-legend">
            <span className="legend-dot paid" /> Green = paid on time &nbsp;
            <span className="legend-dot warning" /> Amber = within 5 days of deadline (1st–5th) &nbsp;
            <span className="legend-dot overdue" /> Red = missed deadline (after 5th)
          </p>
          {error && <div className="banner error">{error}</div>}
          {loading && <p className="muted">Loading…</p>}
          {!loading && (
            <div className="table-wrap">
              <table className="grid-table">
                <thead>
                  <tr>
                    <th className="col-name">Name</th>
                    {monthKeys.map((k) => (
                      <th key={k} className="col-month">{monthLabel(k)}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {members.map((member) => (
                    <tr key={member.id}>
                      <td className="col-name cell-name">{member.name}</td>
                      {monthKeys.map((monthKey) => {
                        const cell = cellMap[`${member.name}|${monthKey}`];
                        const amount = cell ? cell.amount : 0;
                        const hasPayment = cell && amount > 0;
                        const status = getCellStatus(monthKey, hasPayment);
                        let cellClass = 'cell-amount cell-' + status;
                        return (
                          <td key={monthKey} className={cellClass}>
                            {cell && cell.proofFilename ? (
                              <a href={`/uploads/${cell.proofFilename}`} target="_blank" rel="noopener noreferrer" className="cell-link">
                                {formatAmount(amount)}{cell.winner ? ' winner' : ''}
                              </a>
                            ) : (
                              <span>{formatAmount(amount)}{cell?.winner ? ' winner' : ''}</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                  <tr className="row-total-received">
                    <td className="col-name cell-total-label">Total Received</td>
                    {monthKeys.map((k) => (
                      <td key={k} className="cell-total">{formatAmount(totalReceived[k])}</td>
                    ))}
                  </tr>
                  <tr className="row-outstanding">
                    <td className="col-name cell-outstanding-label">Outstanding</td>
                    {monthKeys.map((k) => {
                      const exp = getExpected(k);
                      const received = totalReceived[k] || 0;
                      const out = exp - received;
                      return (
                        <td key={k} className={`cell-outstanding ${out > 0 ? 'negative' : ''}`}>
                          {formatAmount(out)}
                        </td>
                      );
                    })}
                  </tr>
                  <tr className="row-expected">
                    <td className="col-name cell-expected-label">Expected</td>
                    {monthKeys.map((k) => (
                      <td key={k} className="cell-expected">{formatAmount(getExpected(k))}</td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>

      <footer className="footer">
        <p>Grid refreshes every 15 seconds. New uploads appear immediately.</p>
      </footer>
    </div>
  );
}
