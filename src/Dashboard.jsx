import { useState } from 'react'
import Icon from './Icon.jsx'

const pct = (part, total) => total ? Math.round(part / total * 100) : 0
const formatDate = value => new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
const toDate = key => new Date(`${key}T00:00:00`)
const shortDate = date => date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })

// Stacked daily bars of Buy now / Bulk purchase redirects to nohar.in.
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

// `summary` comes from App: products, redirects, broadcasts and enquiries.
// Redirects, broadcasts and enquiries are null when their API could not be loaded.
export default function Dashboard({ summary: s, categories, onNavigate, onShowCategory, onEditProduct, onEditBroadcast, onOpenEnquiry }) {
  const p = s.products
  const r = s.redirects
  const inStock = p.total - p.outOfStock
  const byCategory = [...categories].sort((a, b) => b.productCount - a.productCount)
  const topCount = Math.max(1, ...byCategory.map(c => c.productCount))
  const lastDays = r ? r.daily.reduce((sum, d) => sum + d.buy + d.bulk, 0) : 0
  const topRedirect = r ? Math.max(1, ...r.topProducts.map(row => row.total)) : 1
  const scrollToRedirects = () => document.getElementById('redirects')?.scrollIntoView({ behavior: 'smooth', block: 'start' })

  const kpis = [
    { label: 'Today’s redirects', value: r ? r.today : '—', note: r ? `${r.yesterday} yesterday · to nohar.in` : 'Redirect data unavailable', icon: 'external', tone: 2, go: scrollToRedirects },
    { label: 'New enquiries', value: s.enquiries ? s.enquiries.newCount : '—', note: s.enquiries ? 'Waiting for a reply' : 'Not available yet', icon: 'mail', tone: 1, go: () => onNavigate('enquiries', 'New') },
    { label: 'Products', value: p.total, note: `${p.mostBuy} most buy · ${p.hidden} hidden`, icon: 'products', tone: 0, go: () => onNavigate('products') },
    { label: 'Out of stock', value: p.outOfStock, note: 'Products needing attention', icon: 'alert', tone: 3, go: () => onNavigate('products', 'Out of stock') },
    { label: 'Categories', value: categories.length, note: `${categories.filter(c => c.isActive).length} active`, icon: 'collections', tone: 0, go: () => onNavigate('categories') },
  ]

  return <>
    <section className="kpi-grid" aria-label="Key figures">
      {kpis.map(k => <button key={k.label} className="stat-card kpi" onClick={k.go}>
        <div className="stat-top"><span>{k.label}</span><span className={`stat-icon tone-${k.tone}`}><Icon name={k.icon} /></span></div>
        <strong>{k.value}</strong>
        <div className="stat-bottom"><span>{k.note}</span><Icon name="arrow" size={16} /></div>
      </button>)}
    </section>

    <section className="panel redirect-panel" id="redirects">
      <div className="panel-heading">
        <div><h2>Redirects to nohar.in</h2><p>Visitors sent from Samarth to nohar.in by the Buy now and Bulk purchase buttons.</p></div>
        {r && <span className="count-pill">All time: {r.total}</span>}
      </div>
      {r ? <>
        <div className="redirect-stats">
          <div><span>Today</span><strong>{r.today}</strong><small>{r.today === r.yesterday ? 'Same as yesterday' : `${r.today > r.yesterday ? '+' : ''}${r.today - r.yesterday} vs yesterday`}</small></div>
          <div><span>Yesterday</span><strong>{r.yesterday}</strong></div>
          <div><span>Last {r.daily.length} days</span><strong>{lastDays}</strong></div>
          <div><span><i className="swatch buy" />Buy now</span><strong>{r.byType.buy.count}</strong><small>{pct(r.byType.buy.count, r.total)}% of all</small></div>
          <div><span><i className="swatch bulk" />Bulk purchase</span><strong>{r.byType.bulk.count}</strong><small>{pct(r.byType.bulk.count, r.total)}% of all</small></div>
        </div>
        <div className="chart-wrap"><RedirectChart series={r.daily} /></div>
      </> : <p className="empty small">Redirect data couldn't be loaded. Refresh to try again.</p>}
    </section>

    <div className="dashboard-grid">
      <section className="panel">
        <div className="panel-heading"><div><h2>Top products by redirects</h2><p>Products whose buttons sent the most visitors to nohar.in.</p></div></div>
        <div className="top-list">
          {r?.topProducts.map((row, i) => <div className="top-row" key={row.productId}>
            <span className="top-rank">{i + 1}</span>
            <div className="top-main">
              <div className="top-head"><strong>{row.name}</strong><span>{row.total} redirect{row.total === 1 ? '' : 's'}</span></div>
              <div className="top-bar" style={{ width: `${row.total / topRedirect * 100}%` }} aria-label={`${row.buy} buy now, ${row.bulk} bulk purchase`}>
                {row.buy > 0 && <i className="seg buy" style={{ flexGrow: row.buy }} />}
                {row.bulk > 0 && <i className="seg bulk" style={{ flexGrow: row.bulk }} />}
              </div>
            </div>
          </div>)}
          {r && !r.topProducts.length && <p className="empty small">No redirects yet. Products show up here once visitors click Buy now or Bulk purchase.</p>}
        </div>
      </section>
      <section className="panel readiness">
        <div className="panel-heading"><div><h2>Stock readiness</h2><p>Out-of-stock products still get redirects.</p></div><Icon name="leaf" /></div>
        <div className="readiness-content">
          <div className="donut" style={{ '--progress': `${pct(inStock, p.total)}%` }}><div><strong>{pct(inStock, p.total)}%</strong><small>in stock</small></div></div>
          <div className="legend"><span><i />In stock <b>{inStock}</b></span><span><i />Out of stock <b>{p.outOfStock}</b></span></div>
        </div>
        <button className="review-button" onClick={() => onNavigate('products', 'Out of stock')}>Review out-of-stock products <Icon name="arrow" size={17} /></button>
      </section>
    </div>

    <div className="dashboard-grid">
      <section className="panel">
        <div className="panel-heading"><div><h2>Recent enquiries</h2><p>Latest messages from the Contact us form.</p></div><button className="text-button" onClick={() => onNavigate('enquiries')}>All enquiries <Icon name="arrow" size={16} /></button></div>
        <div className="recent-list">
          {s.enquiries?.recent.map(item => <button className="recent-row" key={item._id} onClick={() => onOpenEnquiry(item)}>
            <span className="recent-thumb initial">{item.customerName.slice(0, 1).toUpperCase()}</span>
            <span className="recent-main"><strong>{item.customerName}</strong><small>{item.enquiry}</small></span>
            {item.status === 'NEW' && <span className="badge draft"><i />New</span>}
          </button>)}
          {s.enquiries && !s.enquiries.recent.length && <p className="empty small">No enquiries yet.</p>}
          {!s.enquiries && <p className="empty small">Enquiries couldn't be loaded. The backend may not have this feature deployed yet.</p>}
        </div>
      </section>
      <section className="panel">
        <div className="panel-heading"><div><h2>Products by category</h2><p>How your catalogue is spread across categories.</p></div><button className="text-button" onClick={() => onNavigate('categories')}>All categories <Icon name="arrow" size={16} /></button></div>
        <div className="top-list">
          {byCategory.slice(0, 5).map((c, i) => <button className="top-row category-row" key={c._id} onClick={() => onShowCategory(c)}>
            <span className="top-rank">{i + 1}</span>
            <span className="top-main">
              <span className="top-head"><strong>{c.name}{!c.isActive && <small className="hidden-tag">Draft</small>}</strong><span>{c.productCount} product{c.productCount === 1 ? '' : 's'}</span></span>
              <span className="top-bar" style={{ width: `${Math.max(c.productCount / topCount * 100, 1)}%` }}>{c.productCount > 0 && <i className="seg brand" style={{ flexGrow: 1 }} />}</span>
            </span>
          </button>)}
          {!categories.length && <p className="empty small">No categories yet.</p>}
        </div>
      </section>
    </div>

    <div className="dashboard-grid">
      <section className="panel">
        <div className="panel-heading"><div><h2>Recently added products</h2><p>The latest additions to your catalogue.</p></div><button className="text-button" onClick={() => onNavigate('products')}>All products <Icon name="arrow" size={16} /></button></div>
        <div className="recent-list">
          {p.recent.map(item => <button className="recent-row" key={item._id} onClick={() => onEditProduct(item)}>
            <span className="recent-thumb">{item.images?.[0] ? <img src={item.images[0].url} alt="" loading="lazy" /> : <Icon name="products" size={18} />}</span>
            <span className="recent-main"><strong>{item.name}</strong><small>{item.categoryId?.name || 'No category'} · {formatDate(item.createdAt)}</small></span>
            <span className={`badge ${item.inStock ? '' : 'out'}`}><i />{item.inStock ? 'In stock' : 'Out of stock'}</span>
          </button>)}
          {!p.recent.length && <p className="empty small">No products yet.</p>}
        </div>
      </section>
      <section className="panel">
        <div className="panel-heading"><div><h2>Latest broadcasts</h2><p>Your most recent announcements.</p></div><button className="text-button" onClick={() => onNavigate('broadcasts')}>All broadcasts <Icon name="arrow" size={16} /></button></div>
        <div className="recent-list">
          {s.broadcasts?.recent.map(item => <button className="recent-row" key={item._id} onClick={() => onEditBroadcast(item)}>
            <span className="recent-thumb wide">{item.image?.url ? <img src={item.image.url} alt="" loading="lazy" /> : <Icon name="image" size={18} />}</span>
            <span className="recent-main"><strong>{item.title}</strong><small>{formatDate(item.createdAt)}</small></span>
          </button>)}
          {s.broadcasts && !s.broadcasts.recent.length && <p className="empty small">No broadcasts yet.</p>}
          {!s.broadcasts && <p className="empty small">Broadcasts couldn't be loaded. The backend may not have this feature deployed yet.</p>}
        </div>
      </section>
    </div>
  </>
}
