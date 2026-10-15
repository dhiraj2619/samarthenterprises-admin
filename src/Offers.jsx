import { useEffect, useMemo, useState } from 'react'
import Icon from './Icon.jsx'
import { api } from './api.js'

const rupees = value => `₹${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`
const discountLabel = offer => offer.discountType === 'PERCENTAGE' ? `${offer.discountValue}% off` : `${rupees(offer.discountValue)} off`

// Loads every product (the admin list returns at most 100 per page) for the "Applicable products" checklist.
async function loadAllProducts() {
  const all = []
  for (let page = 1; ; page++) {
    const { data, pagination } = await api.products({ limit: 100, page })
    all.push(...data)
    if (page >= pagination.pages) return all
  }
}

export function OfferTable({ items, onEdit, onDelete }) {
  return <div className="table-scroll">
    <table className="offer-table">
      <thead>
        <tr><th>Offer</th><th>Code</th><th>Discount</th><th>Minimum order</th><th>Products</th><th><span className="sr-only">Actions</span></th></tr>
      </thead>
      <tbody>
        {items.map(item => {
          const products = item.applicableProducts || []
          return <tr key={item._id}>
            <td className="wrap"><strong className="cell-strong">{item.title}</strong>{item.description && <small className="cell-sub clamp-1">{item.description}</small>}</td>
            <td><code className="offer-code">{item.code}</code></td>
            <td className="nowrap"><span className={`badge ${item.discountType === 'PERCENTAGE' ? 'gold' : ''}`}>{discountLabel(item)}</span></td>
            <td className="nowrap">{item.minOrderAmount > 0 ? rupees(item.minOrderAmount) : <span className="muted">No minimum</span>}</td>
            <td className="wrap">{products.length ? <span title={products.map(p => p.name).join(', ')}>{products.length === 1 ? products[0].name : `${products.length} products`}</span> : <span className="muted">All products</span>}</td>
            <td><span className="row-actions">
              <button className="text-button" onClick={() => onEdit(item)}>Edit <Icon name="arrow" size={15} /></button>
              <button className="icon-button danger" aria-label={`Delete ${item.title}`} title="Delete" onClick={() => onDelete(item)}><Icon name="trash" size={16} /></button>
            </span></td>
          </tr>
        })}
      </tbody>
    </table>
  </div>
}

// Create (record = null) or edit a bulk-purchase offer.
export function OfferModal({ record, onSaved, onDeleted, onClose }) {
  const [values, setValues] = useState({
    title: record?.title || '', description: record?.description || '', code: record?.code || '',
    discountType: record?.discountType || 'FLAT', discountValue: record ? String(record.discountValue) : '',
    minOrderAmount: record?.minOrderAmount ? String(record.minOrderAmount) : '',
  })
  const [selected, setSelected] = useState(() => new Set((record?.applicableProducts || []).map(p => p._id || p)))
  const [products, setProducts] = useState({ items: [], loading: true, error: '' })
  const [productSearch, setProductSearch] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let cancelled = false
    loadAllProducts()
      .then(items => { if (!cancelled) setProducts({ items, loading: false, error: '' }) })
      .catch(err => { if (!cancelled) setProducts({ items: [], loading: false, error: err.message }) })
    return () => { cancelled = true }
  }, [])

  const visible = useMemo(() => {
    const term = productSearch.trim().toLowerCase()
    return term ? products.items.filter(p => p.name.toLowerCase().includes(term)) : products.items
  }, [products.items, productSearch])

  const set = key => event => setValues(v => ({ ...v, [key]: event.target.value }))
  const toggle = id => setSelected(s => { const next = new Set(s); if (next.has(id)) next.delete(id); else next.add(id); return next })
  const selectVisible = on => setSelected(s => { const next = new Set(s); visible.forEach(p => on ? next.add(p._id) : next.delete(p._id)); return next })

  const percent = values.discountType === 'PERCENTAGE'

  const submit = async event => {
    event.preventDefault()
    const body = {
      title: values.title.trim(),
      description: values.description.trim(),
      code: values.code.trim().toUpperCase(),
      discountType: values.discountType,
      discountValue: values.discountValue,
      minOrderAmount: values.minOrderAmount || '0',
      applicableProducts: [...selected],
    }
    setSaving(true); setError('')
    try {
      const { data } = record ? await api.updateOffer(record._id, body) : await api.createOffer(body)
      onSaved(data, !record)
    } catch (err) { setError(err.message); setSaving(false) }
  }

  const remove = async () => {
    if (!window.confirm(`Delete the offer "${record.title}"? The code ${record.code} will stop working.`)) return
    setSaving(true); setError('')
    try { await api.deleteOffer(record._id); onDeleted(record) }
    catch (err) { setError(err.message); setSaving(false) }
  }

  return <div className="modal-backdrop" onClick={onClose}>
    <section className="modal offer-modal" role="dialog" aria-modal="true" aria-label={record ? 'Edit offer' : 'New offer'} onClick={event => event.stopPropagation()} onKeyDown={event => { if (event.key === 'Escape') onClose() }}>
      <div className="panel-heading">
        <div><h2>{record ? 'Edit offer' : 'New bulk purchase offer'}</h2></div>
        <button className="icon-button" aria-label="Close dialog" onClick={onClose}><Icon name="close" /></button>
      </div>
      <form onSubmit={submit}>
        {error && <div className="notice error" role="alert">{error}</div>}
        <label><span>Title <em className="req">*</em></span><input value={values.title} onChange={set('title')} required autoFocus maxLength={150} placeholder="Get Flat Rs 1200 OFF on orders above Rs 6000" /></label>
        <label><span>Description</span><textarea rows={3} value={values.description} onChange={set('description')} maxLength={1000} placeholder="Optional offer description" /></label>
        <div className="modal-row">
          <label><span>Code <em className="req">*</em></span><input className="code-input" value={values.code} onChange={e => setValues(v => ({ ...v, code: e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, '') }))} required minLength={3} maxLength={30} placeholder="DIAMOND1200" /></label>
          <label><span>Discount type <em className="req">*</em></span>
            <select value={values.discountType} onChange={set('discountType')}><option value="FLAT">Flat (₹)</option><option value="PERCENTAGE">Percentage (%)</option></select>
          </label>
        </div>
        <div className="modal-row">
          <label><span>Discount value <em className="req">*</em></span>
            <span className="prefixed-input"><span>{percent ? '%' : '₹'}</span><input type="number" inputMode="decimal" min="0.01" max={percent ? 100 : undefined} step="0.01" value={values.discountValue} onChange={set('discountValue')} required placeholder="0" /></span>
          </label>
          <label><span>Minimum order amount</span>
            <span className="prefixed-input"><span>₹</span><input type="number" inputMode="decimal" min="0" step="0.01" value={values.minOrderAmount} onChange={set('minOrderAmount')} placeholder="0" /></span>
          </label>
        </div>

        <div className="product-picker">
          <div className="picker-head">
            <span className="thumb-label">Applicable products</span>
            <small className="field-hint">{selected.size ? `${selected.size} selected` : 'None selected: applies to all products'}</small>
          </div>
          <div className="picker-tools">
            <label className="search-box"><Icon name="search" size={16} /><input aria-label="Search products" placeholder="Search products…" value={productSearch} onChange={e => setProductSearch(e.target.value)} /></label>
            <button type="button" className="link-button" onClick={() => selectVisible(true)} disabled={!visible.length}>Select {productSearch ? 'shown' : 'all'}</button>
            <button type="button" className="link-button" onClick={() => selectVisible(false)} disabled={!selected.size}>Clear</button>
          </div>
          <div className="picker-list" role="group" aria-label="Applicable products">
            {products.loading ? <div className="picker-state"><span className="spinner tiny" />Loading products…</div>
              : products.error ? <div className="picker-state">Couldn't load products: {products.error}</div>
              : !visible.length ? <div className="picker-state">{products.items.length ? 'No products match.' : 'No products yet.'}</div>
              : visible.map(p => <label key={p._id} className="picker-item">
                <input type="checkbox" checked={selected.has(p._id)} onChange={() => toggle(p._id)} />
                <span>{p.name}{p.isActive === false && <small className="hidden-tag"> (hidden)</small>}</span>
              </label>)}
          </div>
        </div>

        <div className="form-actions">
          {record && <button type="button" className="danger-button push-left" onClick={remove} disabled={saving}><Icon name="trash" size={16} />Delete</button>}
          <button type="button" className="secondary" onClick={onClose}>Cancel</button>
          <button className="primary" type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save offer'}</button>
        </div>
      </form>
    </section>
  </div>
}
