import { useEffect, useState } from 'react'
import './App.css'
import Icon from './Icon.jsx'
import Login from './Login.jsx'
import ProductForm from './ProductForm.jsx'
import ProductTable from './ProductTable.jsx'
import Dashboard from './Dashboard.jsx'
import { CategoryGrid, CategoryModal } from './Categories.jsx'
import { ReferralModal, ReferralTable } from './Referrals.jsx'
import { api, getToken, onUnauthorized, setToken } from './api.js'

const labels = { dashboard: 'Dashboard', products: 'Products', 'product-form': 'Products', categories: 'Categories', referrals: 'Nohar referrals', offers: 'Offers', distributors: 'Distributors' }
const singular = { products: 'product', categories: 'category', referrals: 'referral' }
const listPages = ['products', 'categories', 'referrals']
const filterOptions = {
  products: ['All products', 'In stock', 'Out of stock', 'Most buy', 'Hidden from website'],
  categories: ['All statuses', 'Active', 'Draft'],
  referrals: ['All referrals', 'Buy now', 'Bulk purchase', 'Awaiting update', 'Converted', 'Not converted'],
}
// Maps each filter option to the backend's query parameters.
const filterQuery = {
  'In stock': { inStock: true }, 'Out of stock': { inStock: false }, 'Most buy': { isMostBuy: true }, 'Hidden from website': { isActive: false },
  Active: { isActive: true }, Draft: { isActive: false },
  'Buy now': { type: 'buy' }, 'Bulk purchase': { type: 'bulk' },
  'Awaiting update': { status: 'REDIRECTED' }, Converted: { status: 'CONVERTED' }, 'Not converted': { status: 'NOT_CONVERTED' },
}
const fetchers = { products: api.products, categories: api.categories, referrals: api.referrals }
const PAGE_SIZE = { products: 20, categories: 50, referrals: 25 }

function readTheme() { try { const saved = localStorage.getItem('samarth-admin-theme'); if (saved === 'light' || saved === 'dark') return saved } catch { /* storage unavailable */ } return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light' }

export default function App() {
  const [theme, setTheme] = useState(readTheme)
  // undefined while an existing session is being checked, null when signed out.
  const [admin, setAdmin] = useState(() => (getToken() ? undefined : null))
  const [sessionNote, setSessionNote] = useState('')
  const [page, setPage] = useState('dashboard')
  const [formProductId, setFormProductId] = useState(null)
  const [expanded, setExpanded] = useState(true)
  const [mobile, setMobile] = useState(false)
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('All products')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [pageNumber, setPageNumber] = useState(1)
  const [reload, setReload] = useState(0)
  const [categories, setCategories] = useState([])
  const [summary, setSummary] = useState({ key: null, data: null, recent: [], error: '' })
  const [list, setList] = useState({ key: null, items: [], pagination: null, error: '' })
  const [categoryModal, setCategoryModal] = useState(null)
  const [referralModal, setReferralModal] = useState(null)
  const [notice, setNotice] = useState('')
  const [help, setHelp] = useState(false)

  useEffect(() => { document.documentElement.dataset.theme = theme; try { localStorage.setItem('samarth-admin-theme', theme) } catch { /* storage unavailable */ } }, [theme])
  useEffect(() => onUnauthorized(() => { setAdmin(null); setSessionNote('Your session has ended. Please sign in again.') }), [])
  useEffect(() => {
    if (admin !== undefined) return
    api.me().then(({ data }) => setAdmin(data)).catch(() => setAdmin(null))
  }, [admin])

  // Debounce typing so the server is not queried on every keystroke.
  useEffect(() => {
    const timer = setTimeout(() => { setSearch(searchInput.trim()); setPageNumber(1) }, 300)
    return () => clearTimeout(timer)
  }, [searchInput])

  const signedIn = Boolean(admin)
  const refreshCategories = () => api.categories().then(({ data }) => { setCategories(data); return data })
  useEffect(() => {
    if (!signedIn) return
    api.categories().then(({ data }) => setCategories(data)).catch(err => setNotice(`Couldn't load categories: ${err.message}`))
  }, [signedIn, reload])

  const summaryKey = `${reload}`
  useEffect(() => {
    if (!signedIn) return undefined
    let cancelled = false
    Promise.all([api.referralSummary(), api.referrals({ limit: 6 })])
      .then(([sum, recent]) => { if (!cancelled) setSummary({ key: summaryKey, data: sum.data, recent: recent.data, error: '' }) })
      .catch(err => { if (!cancelled) setSummary({ key: summaryKey, data: null, recent: [], error: err.message }) })
    return () => { cancelled = true }
  }, [signedIn, summaryKey])

  const listKey = listPages.includes(page) ? JSON.stringify({ page, search, filter, categoryFilter, pageNumber, reload }) : null
  useEffect(() => {
    if (!signedIn || !listKey) return undefined
    const params = JSON.parse(listKey)
    let cancelled = false
    const query = { search: params.search, page: params.pageNumber, limit: PAGE_SIZE[params.page], ...filterQuery[params.filter], ...(params.page === 'products' ? { categoryId: params.categoryFilter } : {}) }
    fetchers[params.page](query)
      .then(res => { if (!cancelled) setList({ key: listKey, items: res.data, pagination: res.pagination, error: '' }) })
      .catch(err => { if (!cancelled) setList({ key: listKey, items: [], pagination: null, error: err.message }) })
    return () => { cancelled = true }
  }, [signedIn, listKey])

  const navigate = (next, nextFilter) => {
    setPage(next); setSearchInput(''); setSearch(''); setPageNumber(1); setCategoryFilter('')
    setFilter(nextFilter || filterOptions[next]?.[0] || ''); setMobile(false); window.scrollTo(0, 0)
  }
  const refresh = () => setReload(r => r + 1)
  const openProductForm = (id = null) => { setFormProductId(id); setNotice(''); setPage('product-form'); setMobile(false); window.scrollTo(0, 0) }
  const showCategoryProducts = category => { navigate('products'); setCategoryFilter(category._id) }
  const signOut = () => { setToken(null); setAdmin(null); setSessionNote(''); setPage('dashboard') }
  const addNew = () => page === 'referrals' ? setReferralModal({ record: null }) : page === 'categories' ? setCategoryModal({ record: null }) : openProductForm()
  const createCategoryInline = async name => {
    const form = new FormData()
    form.append('name', name)
    const { data } = await api.createCategory(form)
    await refreshCategories()
    return data
  }

  if (admin === undefined) return <div className="boot-screen"><span className="spinner" />Checking your session…</div>
  if (!admin) return <>
    {sessionNote && <div className="session-note" role="status">{sessionNote}</div>}
    <Login theme={theme} onToggleTheme={() => setTheme(theme === 'dark' ? 'light' : 'dark')} onLogin={data => { setAdmin(data); setSessionNote(''); navigate('dashboard'); refresh() }} />
  </>

  const listLoading = listKey !== null && list.key !== listKey
  const summaryLoading = summary.key !== summaryKey
  const awaiting = summary.data?.byStatus.REDIRECTED || 0
  const productCount = summary.data?.products.total
  const initials = (admin.name || 'SE').split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase()
  const pagination = list.key === listKey ? list.pagination : null
  const narrowed = Boolean(search || !filter.startsWith('All') || categoryFilter)

  return <div className="app-shell">
    {mobile && <button className="scrim" aria-label="Close navigation" onClick={() => setMobile(false)} />}
    <aside className={`sidebar ${mobile ? 'open' : ''}`}>
      <a className="brand" href="#dashboard" onClick={() => navigate('dashboard')}><span className="brand-mark">S<span>•</span></span><span>SAMARTH<small>ENTERPRISES</small></span></a>
      <div className="workspace-label">WORKSPACE <span>ADMIN</span></div>
      <nav aria-label="Main navigation">
        <button className={page === 'dashboard' ? 'nav-item active' : 'nav-item'} onClick={() => navigate('dashboard')}><Icon name="dashboard" />Dashboard</button>
        <button className={`nav-item ${['products', 'product-form', 'categories'].includes(page) ? 'parent-active' : ''}`} onClick={() => setExpanded(!expanded)} aria-expanded={expanded}><Icon name="products" />Products<Icon name="chevron" /></button>
        {expanded && <div className="subnav">
          <button className={page === 'products' || page === 'product-form' ? 'selected' : ''} onClick={() => navigate('products')}>All products{productCount !== undefined && <span>{productCount}</span>}</button>
          <button className={page === 'categories' ? 'selected' : ''} onClick={() => navigate('categories')}>Categories<span>{categories.length}</span></button>
        </div>}
        <button className={`nav-item ${page === 'referrals' ? 'active' : ''}`} onClick={() => navigate('referrals')}><Icon name="external" />Nohar referrals{awaiting > 0 && <span className="nav-count">{awaiting}</span>}</button>
        {['offers', 'distributors'].map(key => <button key={key} className={`nav-item ${page === key ? 'active' : ''}`} onClick={() => navigate(key)}><Icon name={key} />{labels[key]}<span className="soon-tag">Soon</span></button>)}
      </nav>
      <div className="sidebar-bottom">
        <div className="catalogue-note"><Icon name="leaf" /><strong>A catalogue that grows<br />with your business.</strong><p>Your products. Your network.<br />All in one place.</p><button onClick={() => navigate('products')}>Manage catalogue <Icon name="arrow" size={16} /></button></div>
        <div className="profile"><span className="avatar">{initials}</span><span className="profile-text"><strong>{admin.name}</strong><small>{admin.email}</small></span><button className="icon-button" onClick={signOut} aria-label="Sign out" title="Sign out"><Icon name="logout" size={18} /></button></div>
      </div>
    </aside>
    <div className="main-shell">
      <header className="topbar">
        <div className="breadcrumb">
          <button className="icon-button mobile-toggle" aria-label="Open navigation" onClick={() => setMobile(true)}><Icon name="menu" /></button>
          <span>Workspace</span><span>/</span>
          {page === 'product-form' ? <><button className="crumb-link" onClick={() => navigate('products')}>Products</button><span>/</span><strong>{formProductId ? 'Edit product' : 'Add product'}</strong></> : <strong>{labels[page]}</strong>}
        </div>
        <div className="topbar-actions"><span className="demo-pill"><span />Live data</span><button className="theme-toggle" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`} title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}><Icon name={theme === 'dark' ? 'sun' : 'moon'} size={18} /></button><button className="help-button" onClick={() => setHelp(true)}><Icon name="help" size={17} />Help</button><span className="avatar small" title={admin.email}>{initials}</span></div>
      </header>
      <main>
        {page !== 'product-form' && <div className="page-heading">
          <div>
            <div className="eyebrow">{page === 'dashboard' ? new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' }) : 'Samarth Enterprises / Admin'}</div>
            <h1>{labels[page]}</h1>
            <p>{{
              dashboard: 'Catalogue interest and Nohar referrals at a glance. Sales happen on nohar.in and are recorded here.',
              products: 'Search the catalogue by product name, description or HSN code.',
              categories: 'Group your products into categories. Every product belongs to one category.',
              referrals: 'Every Buy now and Bulk purchase click that sent a visitor to nohar.in. Record the sale outcome here.',
            }[page] || 'This section is not connected to the backend yet.'}</p>
          </div>
          {!['offers', 'distributors'].includes(page) && <div className="heading-actions">
            {listPages.includes(page) && pagination && <span className="count-pill">{pagination.total} {page}</span>}
            {page === 'dashboard' && <button className="secondary" onClick={refresh} disabled={summaryLoading}><Icon name="trend" size={16} />{summaryLoading ? 'Refreshing…' : 'Refresh'}</button>}
            <button className="primary" onClick={addNew}><Icon name="plus" size={18} />{page === 'referrals' ? 'Log referral' : `Add ${singular[page] || 'product'}`}</button>
          </div>}
        </div>}
        {notice && <div className="notice" role="status"><Icon name="check" size={18} />{notice}<button aria-label="Dismiss notification" onClick={() => setNotice('')}><Icon name="close" size={16} /></button></div>}

        {page === 'product-form' ? <ProductForm key={formProductId || 'new'} productId={formProductId} categories={categories} onCreateCategory={createCategoryInline}
          onSaved={(product, isNew) => { setNotice(isNew ? `“${product.name}” added to your catalogue.` : `“${product.name}” updated.`); navigate('products'); refresh() }}
          onDeleted={() => { setNotice('Product deleted.'); navigate('products'); refresh() }}
          onCancel={() => navigate('products')} />

          : page === 'dashboard' ? (summary.error ? <ErrorState message={summary.error} onRetry={refresh} />
            : !summary.data ? <div className="panel page-state"><span className="spinner" />Loading dashboard…</div>
            : <Dashboard summary={summary.data} recent={summary.recent} onNavigate={navigate} onUpdateReferral={record => setReferralModal({ record })} />)

          : ['offers', 'distributors'].includes(page) ? <div className="panel page-state"><Icon name={page} size={30} /><h2>{labels[page]} aren't connected yet</h2><p>There is no {labels[page].toLowerCase()} API in the backend, so nothing here would be saved. Ask for it to be built and it will appear in this space.</p></div>

          : <section className="panel management">
            <div className="toolbar">
              <label className="search-box"><Icon name="search" size={18} /><input aria-label={`Search ${page}`} placeholder={{ products: 'Search by name, description, HSN…', categories: 'Search categories…', referrals: 'Search by product or Nohar order ID…' }[page]} value={searchInput} onChange={event => setSearchInput(event.target.value)} /></label>
              {page === 'products' && <select aria-label="Filter by category" value={categoryFilter} onChange={event => { setCategoryFilter(event.target.value); setPageNumber(1) }}>
                <option value="">All categories</option>
                {categories.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
              </select>}
              <select aria-label="Filter" value={filter} onChange={event => { setFilter(event.target.value); setPageNumber(1) }}>{filterOptions[page].map(value => <option key={value}>{value}</option>)}</select>
            </div>
            {list.error && list.key === listKey ? <ErrorState message={list.error} onRetry={refresh} inline />
              : listLoading && !list.items.length ? <div className="page-state"><span className="spinner" />Loading {page}…</div>
              : <div className={listLoading ? 'is-refreshing' : ''}>
                {page === 'products' && list.items.length > 0 && <ProductTable items={list.items} onEdit={item => openProductForm(item._id)} />}
                {page === 'categories' && list.items.length > 0 && <CategoryGrid items={list.items} onEdit={record => setCategoryModal({ record })} onShowProducts={showCategoryProducts} />}
                {page === 'referrals' && list.items.length > 0 && <ReferralTable items={list.items} onUpdate={record => setReferralModal({ record })} />}
                {!list.items.length && <div className="empty"><Icon name={narrowed ? 'search' : page === 'categories' ? 'collections' : page === 'referrals' ? 'external' : 'products'} size={30} />
                  {narrowed
                    ? <><h2>No {page} match</h2><p>Try another search or filter.</p></>
                    : page === 'referrals' ? <><h2>No referrals yet</h2><p>They appear here when visitors click Buy now or Bulk purchase on the catalogue.</p></>
                    : <><h2>No {page} yet</h2><p>Add your first {singular[page]} to get started.</p><button className="primary" onClick={addNew}><Icon name="plus" size={18} />Add {singular[page]}</button></>}
                </div>}
              </div>}
            {pagination && pagination.total > 0 && <div className="table-footer">
              <span>Showing {(pagination.page - 1) * pagination.limit + 1}–{Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}</span>
              {pagination.pages > 1 && <span className="pager">
                <button className="secondary" onClick={() => setPageNumber(n => n - 1)} disabled={pagination.page <= 1 || listLoading}>Previous</button>
                <span>Page {pagination.page} of {pagination.pages}</span>
                <button className="secondary" onClick={() => setPageNumber(n => n + 1)} disabled={pagination.page >= pagination.pages || listLoading}>Next</button>
              </span>}
            </div>}
          </section>}
        <footer><span>© {new Date().getFullYear()} Samarth Enterprises</span><span>Connected to the Samarth backend</span></footer>
      </main>
    </div>
    {categoryModal && <CategoryModal record={categoryModal.record} onClose={() => setCategoryModal(null)}
      onSaved={(category, isNew) => { setCategoryModal(null); setNotice(isNew ? `Category “${category.name}” created.` : `Category “${category.name}” updated.`); refresh() }}
      onDeleted={category => { setCategoryModal(null); setNotice(`Category “${category.name}” deleted.`); refresh() }} />}
    {referralModal && <ReferralModal record={referralModal.record} onClose={() => setReferralModal(null)}
      onSaved={record => { setReferralModal(null); setNotice(record.status === 'CONVERTED' ? `Sale of ₹${Number(record.orderValue).toLocaleString('en-IN')} recorded for “${record.productName}”.` : 'Referral saved.'); refresh() }} />}
    {help && <div className="modal-backdrop"><section className="modal" role="dialog" aria-modal="true" aria-label="Workspace help"><div className="panel-heading"><h2>Your Samarth workspace</h2><button autoFocus className="icon-button" aria-label="Close help" onClick={() => setHelp(false)}><Icon name="close" /></button></div><p>Manage your catalogue from Products and organise it into Categories. Everything you change here is saved to the Samarth backend and appears on the website.</p><p>Samarth is a catalogue: the Buy now and Bulk purchase buttons send visitors to nohar.in, where the sale happens. Each redirect appears under Nohar referrals. Mark it Converted with the order value to record revenue here.</p><button className="primary" onClick={() => setHelp(false)}>Got it</button></section></div>}
  </div>
}

function ErrorState({ message, onRetry, inline = false }) {
  return <div className={`${inline ? '' : 'panel '}page-state`}>
    <Icon name="alert" size={28} />
    <h2>Something went wrong</h2>
    <p>{message}</p>
    <button className="secondary" onClick={onRetry}>Try again</button>
  </div>
}
