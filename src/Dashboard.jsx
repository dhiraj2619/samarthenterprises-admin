import Icon from './Icon.jsx'

const pct = (part, total) => total ? Math.round(part / total * 100) : 0
const formatDate = value => new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })

// `summary` comes from App: product counts and recent products, plus broadcasts (null if that API is unavailable).
export default function Dashboard({ summary: s, categories, onNavigate, onShowCategory, onEditProduct, onEditBroadcast }) {
  const p = s.products
  const inStock = p.total - p.outOfStock
  const activeCategories = categories.filter(c => c.isActive).length
  const byCategory = [...categories].sort((a, b) => b.productCount - a.productCount)
  const topCount = Math.max(1, ...byCategory.map(c => c.productCount))

  const kpis = [
    { label: 'Products', value: p.total, note: `${p.mostBuy} marked most buy`, icon: 'products', tone: 0, go: ['products'] },
    { label: 'Categories', value: categories.length, note: `${activeCategories} active · ${categories.length - activeCategories} draft`, icon: 'collections', tone: 2, go: ['categories'] },
    { label: 'Out of stock', value: p.outOfStock, note: 'Products needing attention', icon: 'alert', tone: 3, go: ['products', 'Out of stock'] },
    { label: 'Hidden from website', value: p.hidden, note: 'Saved here, not shown to visitors', icon: 'eye-off', tone: 1, go: ['products', 'Hidden from website'] },
    { label: 'Broadcasts', value: s.broadcasts ? s.broadcasts.total : '—', note: s.broadcasts?.recent[0] ? `Latest ${formatDate(s.broadcasts.recent[0].createdAt)}` : s.broadcasts ? 'None published yet' : 'Not available yet', icon: 'broadcast', tone: 0, go: ['broadcasts'] },
  ]

  return <>
    <section className="kpi-grid" aria-label="Key figures">
      {kpis.map(k => <button key={k.label} className="stat-card kpi" onClick={() => onNavigate(...k.go)}>
        <div className="stat-top"><span>{k.label}</span><span className={`stat-icon tone-${k.tone}`}><Icon name={k.icon} /></span></div>
        <strong>{k.value}</strong>
        <div className="stat-bottom"><span>{k.note}</span><Icon name="arrow" size={16} /></div>
      </button>)}
    </section>

    <div className="dashboard-grid">
      <section className="panel">
        <div className="panel-heading"><div><h2>Products by category</h2><p>How your catalogue is spread across categories.</p></div><button className="text-button" onClick={() => onNavigate('categories')}>All categories <Icon name="arrow" size={16} /></button></div>
        <div className="top-list">
          {byCategory.slice(0, 6).map((c, i) => <button className="top-row category-row" key={c._id} onClick={() => onShowCategory(c)}>
            <span className="top-rank">{i + 1}</span>
            <span className="top-main">
              <span className="top-head"><strong>{c.name}{!c.isActive && <small className="hidden-tag">Draft</small>}</strong><span>{c.productCount} product{c.productCount === 1 ? '' : 's'}</span></span>
              <span className="top-bar" style={{ width: `${c.productCount / topCount * 100}%` }}><i className="seg brand" style={{ flexGrow: 1 }} /></span>
            </span>
          </button>)}
          {!categories.length && <p className="empty small">No categories yet. Create one to start organising your products.</p>}
        </div>
      </section>
      <section className="panel readiness">
        <div className="panel-heading"><div><h2>Stock readiness</h2><p>Share of products currently in stock.</p></div><Icon name="leaf" /></div>
        <div className="readiness-content">
          <div className="donut" style={{ '--progress': `${pct(inStock, p.total)}%` }}><div><strong>{pct(inStock, p.total)}%</strong><small>in stock</small></div></div>
          <div className="legend"><span><i />In stock <b>{inStock}</b></span><span><i />Out of stock <b>{p.outOfStock}</b></span></div>
        </div>
        <button className="review-button" onClick={() => onNavigate('products', 'Out of stock')}>Review out-of-stock products <Icon name="arrow" size={17} /></button>
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
          {!p.recent.length && <p className="empty small">No products yet. Add your first product to see it here.</p>}
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
          {!s.broadcasts && <p className="empty small">Broadcasts couldn't be loaded. The backend may not have the broadcast feature deployed yet.</p>}
        </div>
      </section>
    </div>
  </>
}
