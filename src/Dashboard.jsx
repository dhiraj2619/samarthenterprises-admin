import { useState } from 'react'
import Icon from './Icon.jsx'
import { ReferralTable } from './Referrals.jsx'
import { REFERRAL_TYPES, STATUS_LABELS, inr } from './referrals.js'

const pct = (part, total) => total ? Math.round(part / total * 100) : 0
const toDate = key => new Date(`${key}T00:00:00`)
const shortDate = date => date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })

function RedirectChart({ series }) {
  const [active, setActive] = useState(null)
  const max = Math.max(4, ...series.map(d => d.buy + d.bulk))
  const top = Math.ceil(max / 4) * 4
  const ticks = [top, top / 2, 0]
  const totals = series.reduce((t, d) => ({ buy: t.buy + d.buy, bulk: t.bulk + d.bulk }), { buy: 0, bulk: 0 })
  const point = active === null ? null : series[active]

  return <div className="chart">
    <div className="chart-legend">
      <span><i className="swatch buy" />Buy now <b>{totals.buy}</b></span>
      <span><i className="swatch bulk" />Bulk purchase <b>{totals.bulk}</b></span>
    </div>
    <div className="chart-plot" onMouseLeave={() => setActive(null)}>
      <div className="chart-grid" aria-hidden="true">{ticks.map(t => <div key={t}><span>{t}</span></div>)}</div>
      <div className="chart-bars" role="list" aria-label={`Redirects per day, last ${series.length} days`} style={{ gridTemplateColumns: `repeat(${series.length}, 1fr)` }}>
        {series.map((d, i) => {
          const total = d.buy + d.bulk
          return <div key={d.date} role="listitem" tabIndex={0} className={`chart-col ${active === i ? 'is-active' : ''}`} aria-label={`${shortDate(toDate(d.date))}: ${d.buy} buy now, ${d.bulk} bulk purchase`}
            onMouseEnter={() => setActive(i)} onFocus={() => setActive(i)} onBlur={() => setActive(null)}>
            <div className="chart-stack" style={{ height: `${total / top * 100}%` }}>
              {d.bulk > 0 && <span className="seg bulk" style={{ flexGrow: d.bulk }} />}
              {d.buy > 0 && <span className="seg buy" style={{ flexGrow: d.buy }} />}
            </div>
            <span className="chart-x">{(series.length - 1 - i) % 2 ? '' : shortDate(toDate(d.date))}</span>
          </div>
        })}
      </div>
      {point && <div className="chart-tip" style={{ left: `${(active + 0.5) / series.length * 100}%` }} role="status">
        <strong>{toDate(point.date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}</strong>
        <span><i className="swatch buy" />Buy now<b>{point.buy}</b></span>
        <span><i className="swatch bulk" />Bulk purchase<b>{point.bulk}</b></span>
        <span className="tip-total">Total<b>{point.buy + point.bulk}</b></span>
      </div>}
    </div>
  </div>
}

export default function Dashboard({ summary: s, recent, onNavigate, onUpdateReferral }) {
  const awaiting = s.byStatus.REDIRECTED
  const resolved = s.total - awaiting
  const inStock = s.products.total - s.products.outOfStock

  const kpis = [
    { label: 'Recorded revenue', value: inr(s.revenue), note: `From ${s.converted} converted orders on Nohar`, icon: 'rupee', tone: 0, go: ['referrals', 'Converted'] },
    { label: 'Nohar redirects', value: s.total, note: `${s.byType.buy.count} buy now · ${s.byType.bulk.count} bulk`, icon: 'external', tone: 2, go: ['referrals'] },
    { label: 'Today’s redirects', value: s.today, note: `${s.yesterday} yesterday`, icon: 'clock', tone: 1, go: ['referrals'] },
    { label: 'Conversion rate', value: `${pct(s.converted, resolved)}%`, note: `${awaiting} awaiting update`, icon: 'target', tone: 0, go: ['referrals', 'Awaiting update'] },
    { label: 'Out of stock', value: s.products.outOfStock, note: 'Products needing attention', icon: 'alert', tone: 3, go: ['products', 'Out of stock'] },
  ]
  const flow = [
    { status: 'REDIRECTED', icon: 'clock', cls: 'warn', filter: 'Awaiting update' },
    { status: 'CONVERTED', icon: 'check', cls: 'good', filter: 'Converted' },
    { status: 'NOT_CONVERTED', icon: 'close', cls: 'bad', filter: 'Not converted' },
  ]
  const topTotal = Math.max(1, ...s.topProducts.map(r => r.total))

  return <>
    <section className="kpi-grid" aria-label="Key figures">
      {kpis.map(k => <button key={k.label} className="stat-card kpi" onClick={() => onNavigate(...k.go)}>
        <div className="stat-top"><span>{k.label}</span><span className={`stat-icon tone-${k.tone}`}><Icon name={k.icon} /></span></div>
        <strong>{k.value}</strong>
        <div className="stat-bottom"><span>{k.note}</span><Icon name="arrow" size={16} /></div>
      </button>)}
    </section>

    <section className="panel">
      <div className="panel-heading">
        <div><h2>Redirect sources</h2><p>Visitors sent to nohar.in from the two product buttons.</p></div>
        <span className="count-pill">Total: {s.total} redirects</span>
      </div>
      <div className="source-grid">
        {Object.entries(REFERRAL_TYPES).map(([type, label]) => {
          const t = s.byType[type]
          return <article key={type} className="source-card">
            <div className="source-top">
              <div><span className="source-label"><i className={`swatch ${type}`} />{label}</span><strong>{t.count} <small>redirects</small></strong></div>
              <span className={`stat-icon tone-${type === 'buy' ? 0 : 2}`}><Icon name={type === 'buy' ? 'cart' : 'boxes'} /></span>
            </div>
            <dl>
              <div><dt>Recorded revenue</dt><dd>{inr(t.revenue)}</dd></div>
              <div><dt>Converted</dt><dd>{t.converted} <small>({pct(t.converted, t.count)}%)</small></dd></div>
              {type === 'bulk' ? <div><dt>Units requested</dt><dd>{t.units}</dd></div> : <div><dt>Share of redirects</dt><dd>{pct(t.count, s.total)}%</dd></div>}
            </dl>
          </article>
        })}
      </div>
    </section>

    <div className="dashboard-grid">
      <section className="panel">
        <div className="panel-heading"><div><h2>Redirects, last {s.daily.length} days</h2><p>Daily clicks on Buy now and Bulk purchase.</p></div></div>
        <div className="chart-wrap"><RedirectChart series={s.daily} /></div>
      </section>
      <section className="panel">
        <div className="panel-heading">
          <div><h2>Referral outcomes</h2><p>What happened on Nohar after the redirect.</p></div>
          <span className="count-pill">Conversion: {pct(s.converted, resolved)}%</span>
        </div>
        <div className="flow-list">
          {flow.map(f => {
            const count = s.byStatus[f.status]
            return <button key={f.status} className="flow-row" onClick={() => onNavigate('referrals', f.filter)}>
              <span className={`flow-icon ${f.cls}`}><Icon name={f.icon} size={16} /></span>
              <span className="flow-main">
                <span className="flow-label">{STATUS_LABELS[f.status]}<b>{count}</b></span>
                <span className={`flow-bar ${f.cls}`}><i style={{ width: `${pct(count, s.total)}%` }} /></span>
              </span>
              <span className="flow-pct">{pct(count, s.total)}%</span>
            </button>
          })}
        </div>
        {awaiting > 0 && <button className="review-button" onClick={() => onNavigate('referrals', 'Awaiting update')}>Update {awaiting} referrals from Nohar <Icon name="arrow" size={17} /></button>}
      </section>
    </div>

    <div className="dashboard-grid">
      <section className="panel">
        <div className="panel-heading"><div><h2>Top products by interest</h2><p>Most redirected products and the revenue recorded for them.</p></div><button className="text-button" onClick={() => onNavigate('products')}>All products <Icon name="arrow" size={16} /></button></div>
        <div className="top-list">
          {s.topProducts.map((row, i) => <div className="top-row" key={row.productId}>
            <span className="top-rank">{i + 1}</span>
            <div className="top-main">
              <div className="top-head"><strong>{row.name}</strong><span>{row.total} redirects</span></div>
              <div className="top-bar" style={{ width: `${row.total / topTotal * 100}%` }} aria-label={`${row.buy} buy now, ${row.bulk} bulk purchase`}>
                {row.buy > 0 && <i className="seg buy" style={{ flexGrow: row.buy }} />}
                {row.bulk > 0 && <i className="seg bulk" style={{ flexGrow: row.bulk }} />}
              </div>
            </div>
            <span className="top-rev">{inr(row.revenue)}</span>
          </div>)}
          {!s.topProducts.length && <p className="empty small">No redirects yet. Product interest shows up here once visitors click Buy now or Bulk purchase.</p>}
        </div>
      </section>
      <section className="panel readiness">
        <div className="panel-heading"><div><h2>Stock readiness</h2><p>Out-of-stock products still get redirects.</p></div><Icon name="leaf" /></div>
        <div className="readiness-content">
          <div className="donut" style={{ '--progress': `${pct(inStock, s.products.total)}%` }}><div><strong>{pct(inStock, s.products.total)}%</strong><small>in stock</small></div></div>
          <div className="legend"><span><i />In stock <b>{inStock}</b></span><span><i />Out of stock <b>{s.products.outOfStock}</b></span></div>
        </div>
        <button className="review-button" onClick={() => onNavigate('products', 'Out of stock')}>Review out-of-stock products <Icon name="arrow" size={17} /></button>
      </section>
    </div>

    <section className="panel recent-panel">
      <div className="panel-heading"><div><h2>Recent referrals</h2><p>The latest visitors sent to Nohar.</p></div><button className="text-button" onClick={() => onNavigate('referrals')}>View all referrals <Icon name="arrow" size={16} /></button></div>
      {recent.length ? <ReferralTable compact items={recent} onUpdate={onUpdateReferral} /> : <p className="empty small">No redirects recorded yet.</p>}
    </section>
  </>
}
