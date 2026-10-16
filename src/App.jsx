import { useCallback, useEffect, useRef, useState } from 'react'
import './App.css'
import Icon from './Icon.jsx'
import Login from './Login.jsx'
import ProductForm from './ProductForm.jsx'
import ProductTable from './ProductTable.jsx'
import Dashboard from './Dashboard.jsx'
import { CategoryGrid, CategoryModal } from './Categories.jsx'
import { BroadcastDrawer, BroadcastModal, BroadcastTable } from './Broadcasts.jsx'
import { DistributorModal, DistributorTable } from './Distributors.jsx'
import { OfferModal, OfferTable } from './Offers.jsx'
import { EnquiryModal, EnquiryTable } from './Enquiries.jsx'
import { AdForm, AdTable } from './Ads.jsx'
import Settings from './Settings.jsx'
import { ToastStack } from './Toasts.jsx'
import { useToasts } from './toasts.js'
import { api, getToken, onUnauthorized, setToken } from './api.js'

const labels = { ads: 'Ads', 'ad-form': 'Ads', dashboard: 'Dashboard', products: 'Products', 'product-form': 'Products', categories: 'Categories', broadcasts: 'Broadcasting', offers: 'Bulk purchase', distributors: 'Distributors', enquiries: 'Enquiries', settings: 'Settings' }
const singular = { ads: 'ad', products: 'product', categories: 'category', broadcasts: 'broadcast', distributors: 'distributor', offers: 'offer', enquiries: 'enquiry' }
const listPages = ['ads', 'products', 'categories', 'broadcasts', 'distributors', 'offers', 'enquiries']
const filterOptions = {
  ads: ['All statuses', 'Active', 'Draft'],
  products: ['All products', 'In stock', 'Out of stock', 'Most buy', 'Hidden from website'],
  categories: ['All statuses', 'Active', 'Draft'],
  broadcasts: ['All broadcasts'],
  distributors: ['All distributors'],
  offers: ['All offers', 'Flat discount', 'Percentage discount'],
  enquiries: ['All enquiries', 'New', 'Contacted', 'Closed'],
}
// Maps each filter option to the backend's query parameters.
const filterQuery = {
  'In stock': { inStock: true }, 'Out of stock': { inStock: false }, 'Most buy': { isMostBuy: true }, 'Hidden from website': { isActive: false },
  Active: { isActive: true }, Draft: { isActive: false },
  'Flat discount': { discountType: 'FLAT' }, 'Percentage discount': { discountType: 'PERCENTAGE' },
  New: { status: 'NEW' }, Contacted: { status: 'CONTACTED' }, Closed: { status: 'CLOSED' },
}
const fetchers = { ads: api.ads, products: api.products, categories: api.categories, broadcasts: api.broadcasts, distributors: api.distributors, offers: api.offers, enquiries: api.enquiries }
const PAGE_SIZE = { ads: 20, products: 20, categories: 50, broadcasts: 20, distributors: 20, offers: 20, enquiries: 25 }

function readTheme() { try { const saved = localStorage.getItem('samarth-admin-theme'); if (saved === 'light' || saved === 'dark') return saved } catch { /* storage unavailable */ } return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light' }

export default function App() {
  const [theme, setTheme] = useState(readTheme)
  // undefined while an existing session is being checked, null when signed out.
  const [admin, setAdmin] = useState(() => (getToken() ? undefined : null))
  const [sessionNote, setSessionNote] = useState('')
  const [page, setPage] = useState('dashboard')
  const [adRecord, setAdRecord] = useState(null)
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
  const [summary, setSummary] = useState({ key: null, data: null, error: '' })
  const [list, setList] = useState({ key: null, items: [], pagination: null, error: '' })
  const [categoryModal, setCategoryModal] = useState(null)
  const [broadcastModal, setBroadcastModal] = useState(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const closeDrawer = useCallback(() => setDrawerOpen(false), [])
  const [distributorModal, setDistributorModal] = useState(null)
  const [offerModal, setOfferModal] = useState(null)
  const [enquiryModal, setEnquiryModal] = useState(null)
  const { toasts, toast, dismiss } = useToasts()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)
  const [help, setHelp] = useState(false)

  // Close the profile menu on an outside click or Escape.
  useEffect(() => {
    if (!menuOpen) return undefined
    const close = event => { if (event.type === 'keydown' ? event.key === 'Escape' : !menuRef.current?.contains(event.target)) setMenuOpen(false) }
    document.addEventListener('mousedown', close)
    document.addEventListener('keydown', close)
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', close) }
  }, [menuOpen])

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
    api.categories().then(({ data }) => setCategories(data)).catch(err => toast(`Couldn't load categories: ${err.message}`, 'error'))
  }, [signedIn, reload, toast])

  const summaryKey = `${reload}`
  useEffect(() => {
    if (!signedIn) return undefined
    let cancelled = false
    // Product counts come from each filter's pagination total (limit 1 keeps the responses tiny).
    // Broadcasts are optional so the dashboard still loads on a backend without that feature.
    const count = query => api.products({ limit: 1, ...query }).then(res => res.pagination.total)
    Promise.all([
      api.products({ limit: 5 }),
      count({ inStock: false }),
      count({ isActive: false }),
      count({ isMostBuy: true }),
      api.broadcasts({ limit: 4 }).then(res => ({ total: res.pagination.total, recent: res.data })).catch(() => null),
      api.redirectSummary().then(res => res.data).catch(() => null),
      Promise.all([api.enquiries({ limit: 5 }), api.enquiries({ status: 'NEW', limit: 1 })])
        .then(([recent, fresh]) => ({ recent: recent.data, newCount: fresh.pagination.total })).catch(() => null),
    ])
      .then(([latest, outOfStock, hidden, mostBuy, broadcasts, redirects, enquiries]) => {
        if (!cancelled) setSummary({ key: summaryKey, data: { products: { total: latest.pagination.total, recent: latest.data, outOfStock, hidden, mostBuy }, broadcasts, redirects, enquiries }, error: '' })
      })
      .catch(err => { if (!cancelled) setSummary({ key: summaryKey, data: null, error: err.message }) })
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
  const openProductForm = (id = null) => { setFormProductId(id); setPage('product-form'); setMobile(false); window.scrollTo(0, 0) }
  const showCategoryProducts = category => { navigate('products'); setCategoryFilter(category._id) }
  const signOut = () => { setMenuOpen(false); setToken(null); setAdmin(null); setSessionNote('You have signed out.'); setPage('dashboard') }
  const openAdForm = (record = null) => { setAdRecord(record); navigate('ad-form') }
  const deleteAd = async record => {
    if (!window.confirm(`Delete ad "${record.title}"? Its image will be removed too.`)) return
    try { await api.deleteAd(record._id); toast('Ad deleted.'); refresh() }
    catch (err) { toast(err.message, 'error') }
  }
  const addNew = () => page === 'ads' ? openAdForm() : page === 'offers' ? setOfferModal({ record: null }) : page === 'distributors' ? setDistributorModal({ record: null }) : page === 'broadcasts' ? setBroadcastModal({ record: null }) : page === 'categories' ? setCategoryModal({ record: null }) : openProductForm()
  const deleteBroadcast = async broadcast => {
    if (!window.confirm(`Delete the broadcast “${broadcast.title}”? Its image will be removed too.`)) return
    try { await api.deleteBroadcast(broadcast._id); toast(`Broadcast “${broadcast.title}” deleted.`); refresh() }
    catch (err) { toast(`Couldn't delete “${broadcast.title}”: ${err.message}`, 'error') }
  }
  const deleteOffer = async offer => {
    if (!window.confirm(`Delete the offer “${offer.title}”? The code ${offer.code} will stop working.`)) return
    try { await api.deleteOffer(offer._id); toast(`Offer “${offer.title}” deleted.`); refresh() }
    catch (err) { toast(`Couldn't delete “${offer.title}”: ${err.message}`, 'error') }
  }
  const deleteDistributor = async distributor => {
    if (!window.confirm(`Delete the distributor “${distributor.companyName}”?`)) return
    try { await api.deleteDistributor(distributor._id); toast(`Distributor “${distributor.companyName}” deleted.`); refresh() }
    catch (err) { toast(`Couldn't delete “${distributor.companyName}”: ${err.message}`, 'error') }
  }
  const createCategoryInline = async name => {
    const form = new FormData()
    form.append('name', name)
    const { data } = await api.createCategory(form)
    await refreshCategories()
    toast(`Category “${data.name}” created.`)
    return data
  }

  if (admin === undefined) return <div className="boot-screen"><span className="spinner" />Checking your session…</div>
  if (!admin) return <>
    {sessionNote && <div key={sessionNote} className="session-note" role="status" onAnimationEnd={() => setSessionNote('')}>{sessionNote}</div>}
    <Login theme={theme} onToggleTheme={() => setTheme(theme === 'dark' ? 'light' : 'dark')} onLogin={data => { setAdmin(data); setSessionNote(''); navigate('dashboard'); refresh() }} />
  </>

  const listLoading = listKey !== null && list.key !== listKey
  const summaryLoading = summary.key !== summaryKey
  const productCount = summary.data?.products.total
  const newEnquiries = summary.data?.enquiries?.newCount || 0
  const initials = (admin.name || 'SE').split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase()
  const pagination = list.key === listKey ? list.pagination : null
  const narrowed = Boolean(search || !filter.startsWith('All') || categoryFilter)

  return <div className="app-shell">
    {mobile && <button className="scrim" aria-label="Close navigation" onClick={() => setMobile(false)} />}
    <aside className={`sidebar ${mobile ? 'open' : ''}`}>
      <a className="brand" href="#dashboard" onClick={() => navigate('dashboard')}><img className="brand-logo" src="/samarthlogo.png" alt="Samarth Enterprises" /></a>
      <div className="workspace-label">WORKSPACE <span>ADMIN</span></div>
      <nav aria-label="Main navigation">
        <button className={page === 'dashboard' ? 'nav-item active' : 'nav-item'} onClick={() => navigate('dashboard')}><Icon name="dashboard" />Dashboard</button>
        <button className={`nav-item ${['products', 'product-form', 'categories'].includes(page) ? 'parent-active' : ''}`} onClick={() => setExpanded(!expanded)} aria-expanded={expanded}><Icon name="products" />Products<Icon name="chevron" /></button>
        {expanded && <div className="subnav">
          <button className={page === 'products' || page === 'product-form' ? 'selected' : ''} onClick={() => navigate('products')}>All products{productCount !== undefined && <span>{productCount}</span>}</button>
          <button className={page === 'categories' ? 'selected' : ''} onClick={() => navigate('categories')}>Categories<span>{categories.length}</span></button>
        </div>}
        <button className={`nav-item ${page === 'broadcasts' ? 'active' : ''}`} onClick={() => navigate('broadcasts')}><Icon name="broadcast" />Broadcasting</button>
        <button className={`nav-item ${['ads', 'ad-form'].includes(page) ? 'active' : ''}`} onClick={() => navigate('ads')}><Icon name="image" />Ads</button>
        <button className={`nav-item ${page === 'enquiries' ? 'active' : ''}`} onClick={() => navigate('enquiries')}><Icon name="mail" />Enquiries{newEnquiries > 0 && <span className="nav-count">{newEnquiries}</span>}</button>
        <button className={`nav-item ${page === 'distributors' ? 'active' : ''}`} onClick={() => navigate('distributors')}><Icon name="distributors" />Distributors</button>
        <button className={`nav-item ${page === 'offers' ? 'active' : ''}`} onClick={() => navigate('offers')}><Icon name="boxes" />Bulk purchase</button>
        <button className={`nav-item ${page === 'settings' ? 'active' : ''}`} onClick={() => navigate('settings')}><Icon name="settings" />Settings</button>
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
        <div className="topbar-actions"><span className="demo-pill"><span />Live data</span><button className="theme-toggle" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`} title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}><Icon name={theme === 'dark' ? 'sun' : 'moon'} size={18} /></button><button className="theme-toggle drawer-toggle" onClick={() => setDrawerOpen(true)} aria-label="Show broadcasts" title="Broadcasts"><Icon name="broadcast" size={18} />{summary.data?.broadcasts?.total > 0 && <span className="toggle-count">{summary.data.broadcasts.total}</span>}</button><button className="help-button" onClick={() => setHelp(true)}><Icon name="help" size={17} />Help</button><div className="profile-menu" ref={menuRef}>
          <button className="avatar-button" onClick={() => setMenuOpen(o => !o)} aria-haspopup="menu" aria-expanded={menuOpen} aria-label="Account menu"><span className="avatar small">{initials}</span><Icon name="chevron" size={16} /></button>
          {menuOpen && <div className="menu-popover" role="menu">
            <div className="menu-user"><strong>{admin.name}</strong><small>{admin.email}</small></div>
            <button role="menuitem" className="menu-item" onClick={() => { setMenuOpen(false); navigate('settings') }}><Icon name="settings" size={17} />Settings</button>
            <button role="menuitem" className="menu-item danger" onClick={signOut}><Icon name="logout" size={17} />Sign out</button>
          </div>}
        </div></div>
      </header>
      <main>
        {!['product-form', 'ad-form'].includes(page) && <div className="page-heading">
          <div>
            <div className="eyebrow">{page === 'dashboard' ? new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' }) : 'Samarth Enterprises / Admin'}</div>
            <h1>{labels[page]}</h1>
            <p>{{
              dashboard: 'Redirects to nohar.in, enquiries and your catalogue at a glance.',
              products: 'Search the catalogue by product name or description.',
              categories: 'Group your products into categories. Every product belongs to one category.',
              ads: 'Video ads and images for the Wellness Solutions section. Only active ads appear on the website.',
              broadcasts: 'Announcements with an image, a message and an optional link. Newest first.',
              settings: 'Your business profile, social media links and the quote slider shown on the website and app.',
              enquiries: 'Messages sent through the Contact us form on the website. Mark them contacted or closed as you follow up.',
              offers: 'Discount codes for bulk orders. Leave products unselected to apply an offer to the whole catalogue.',
              distributors: 'Companies that distribute your products, with their contact person and location.',
            }[page]}</p>
          </div>
          <div className="heading-actions">
            {listPages.includes(page) && pagination && <span className="count-pill">{pagination.total} {page}</span>}
            {page === 'dashboard' && <button className="secondary" onClick={refresh} disabled={summaryLoading}><Icon name="trend" size={16} />{summaryLoading ? 'Refreshing…' : 'Refresh'}</button>}
            {!['enquiries', 'settings'].includes(page) && <button className="primary" onClick={addNew}><Icon name="plus" size={18} />Add {singular[page] || 'product'}</button>}
          </div>
        </div>}

        {page === 'ad-form' ? <AdForm key={adRecord?._id || 'new-ad'} record={adRecord} onCancel={() => navigate('ads')} onSaved={() => { toast('Ad saved.'); navigate('ads'); refresh() }} /> : page === 'product-form' ? <ProductForm key={formProductId || 'new'} productId={formProductId} categories={categories} onCreateCategory={createCategoryInline}
          onSaved={(product, isNew) => { toast(isNew ? `“${product.name}” added to your catalogue.` : `“${product.name}” updated.`); navigate('products'); refresh() }}
          onDeleted={product => { toast(`“${product.name}” deleted.`); navigate('products'); refresh() }}
          onCancel={() => navigate('products')} />

          : page === 'settings' ? <Settings onToast={toast} />

          : page === 'dashboard' ? (summary.error ? <ErrorState message={summary.error} onRetry={refresh} />
            : !summary.data ? <div className="panel page-state"><span className="spinner" />Loading dashboard…</div>
            : <Dashboard summary={summary.data} categories={categories} onNavigate={navigate} onShowCategory={showCategoryProducts} onEditProduct={item => openProductForm(item._id)} onEditBroadcast={record => setBroadcastModal({ record })} onOpenEnquiry={record => setEnquiryModal({ record })} />)

          : <section className="panel management">
            <div className="toolbar">
              <label className="search-box"><Icon name="search" size={18} /><input aria-label={`Search ${page}`} placeholder={{ ads: 'Search ads by title...', products: 'Search by name or description…', categories: 'Search categories…', broadcasts: 'Search by title or description…', distributors: 'Search by company, contact, mobile, city or pincode…', offers: 'Search by title, code or description…', enquiries: 'Search by name, mobile, email or message…' }[page]} value={searchInput} onChange={event => setSearchInput(event.target.value)} /></label>
              {page === 'products' && <select aria-label="Filter by category" value={categoryFilter} onChange={event => { setCategoryFilter(event.target.value); setPageNumber(1) }}>
                <option value="">All categories</option>
                {categories.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
              </select>}
              {filterOptions[page].length > 1 && <select aria-label="Filter" value={filter} onChange={event => { setFilter(event.target.value); setPageNumber(1) }}>{filterOptions[page].map(value => <option key={value}>{value}</option>)}</select>}
            </div>
            {list.error && list.key === listKey ? <ErrorState message={list.error} onRetry={refresh} inline />
              : listLoading && !list.items.length ? <div className="page-state"><span className="spinner" />Loading {page}…</div>
              : <div className={listLoading ? 'is-refreshing' : ''}>
                {page === 'ads' && list.items.length > 0 && <AdTable items={list.items} onEdit={openAdForm} onDelete={deleteAd} />}
                {page === 'products' && list.items.length > 0 && <ProductTable items={list.items} onEdit={item => openProductForm(item._id)} />}
                {page === 'categories' && list.items.length > 0 && <CategoryGrid items={list.items} onEdit={record => setCategoryModal({ record })} onShowProducts={showCategoryProducts} />}
                {page === 'enquiries' && list.items.length > 0 && <EnquiryTable items={list.items} onOpen={record => setEnquiryModal({ record })} />}
                {page === 'offers' && list.items.length > 0 && <OfferTable items={list.items} onEdit={record => setOfferModal({ record })} onDelete={deleteOffer} />}
                {page === 'distributors' && list.items.length > 0 && <DistributorTable items={list.items} onEdit={record => setDistributorModal({ record })} onDelete={deleteDistributor} />}
                {page === 'broadcasts' && list.items.length > 0 && <BroadcastTable items={list.items} onEdit={record => setBroadcastModal({ record })} onDelete={deleteBroadcast} />}
                {!list.items.length && <div className="empty"><Icon name={narrowed ? 'search' : page === 'categories' ? 'collections' : page === 'broadcasts' ? 'broadcast' : page === 'distributors' ? 'distributors' : page === 'offers' ? 'boxes' : page === 'enquiries' ? 'mail' : 'products'} size={30} />
                  {narrowed
                    ? <><h2>No {page} match</h2><p>Try another search or filter.</p></>
                    : page === 'enquiries' ? <><h2>No enquiries yet</h2><p>They appear here when someone fills in the Contact us form on the website.</p></>
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
      onSaved={(category, isNew) => { setCategoryModal(null); toast(isNew ? `Category “${category.name}” created.` : `Category “${category.name}” updated.`); refresh() }}
      onDeleted={category => { setCategoryModal(null); toast(`Category “${category.name}” deleted.`); refresh() }} />}
    {enquiryModal && <EnquiryModal record={enquiryModal.record} onClose={() => setEnquiryModal(null)}
      onSaved={enquiry => { setEnquiryModal(null); toast(`Enquiry from “${enquiry.customerName}” marked ${enquiry.status.toLowerCase()}.`); refresh() }}
      onDeleted={enquiry => { setEnquiryModal(null); toast(`Enquiry from “${enquiry.customerName}” deleted.`); refresh() }} />}
    {offerModal && <OfferModal record={offerModal.record} onClose={() => setOfferModal(null)}
      onSaved={(offer, isNew) => { setOfferModal(null); toast(isNew ? `Offer “${offer.title}” created. Code: ${offer.code}` : `Offer “${offer.title}” updated.`); refresh() }}
      onDeleted={offer => { setOfferModal(null); toast(`Offer “${offer.title}” deleted.`); refresh() }} />}
    {distributorModal && <DistributorModal record={distributorModal.record} onClose={() => setDistributorModal(null)}
      onSaved={(distributor, isNew) => { setDistributorModal(null); toast(isNew ? `Distributor “${distributor.companyName}” added.` : `Distributor “${distributor.companyName}” updated.`); refresh() }}
      onDeleted={distributor => { setDistributorModal(null); toast(`Distributor “${distributor.companyName}” deleted.`); refresh() }} />}
    {broadcastModal && <BroadcastModal record={broadcastModal.record} onClose={() => setBroadcastModal(null)}
      onSaved={(broadcast, isNew) => { setBroadcastModal(null); toast(isNew ? `Broadcast “${broadcast.title}” published.` : `Broadcast “${broadcast.title}” updated.`); refresh() }}
      onDeleted={broadcast => { setBroadcastModal(null); toast(`Broadcast “${broadcast.title}” deleted.`); refresh() }} />}
    <ToastStack toasts={toasts} onDismiss={dismiss} />
    {drawerOpen && <BroadcastDrawer reload={reload} onClose={closeDrawer} onEdit={record => setBroadcastModal({ record })} onAdd={() => setBroadcastModal({ record: null })} onViewAll={() => { closeDrawer(); navigate('broadcasts') }} />}
    {help && <div className="modal-backdrop"><section className="modal" role="dialog" aria-modal="true" aria-label="Workspace help"><div className="panel-heading"><h2>Your Samarth workspace</h2><button autoFocus className="icon-button" aria-label="Close help" onClick={() => setHelp(false)}><Icon name="close" /></button></div><p>Manage your catalogue from Products and organise it into Categories. Everything you change here is saved to the Samarth backend and appears on the website.</p><p>Use Broadcasting to publish announcements with an image, a message and an optional link.</p><button className="primary" onClick={() => setHelp(false)}>Got it</button></section></div>}
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
