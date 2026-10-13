import { useEffect, useState } from 'react'
import Icon from './Icon.jsx'
import { api } from './api.js'
import { REFERRAL_STATUSES, REFERRAL_TYPES, STATUS_LABELS, formatWhen, inr } from './referrals.js'

const statusClass = { REDIRECTED: 'draft', CONVERTED: '', NOT_CONVERTED: 'out' }

export function ReferralTable({ items, onUpdate, compact = false }) {
  return <div className="table-scroll">
    <table className="referral-table">
      <thead>
        <tr>
          <th>When</th><th>Product</th><th>Button</th>{!compact && <th>Qty</th>}<th>Status</th><th>Order value</th>{!compact && <th>Nohar order</th>}
          <th><span className="sr-only">Actions</span></th>
        </tr>
      </thead>
      <tbody>
        {items.map(item => <tr key={item._id}>
          <td className="nowrap">{formatWhen(item.redirectedAt)}{item.source === 'admin' && <small className="source-tag">Logged by hand</small>}</td>
          <td className="wrap"><strong className="cell-strong">{item.productName}</strong></td>
          <td><span className={`type-chip ${item.type}`}><Icon name={item.type === 'bulk' ? 'boxes' : 'cart'} size={13} />{REFERRAL_TYPES[item.type]}</span></td>
          {!compact && <td>{item.quantity}</td>}
          <td><span className={`badge ${statusClass[item.status]}`}><i />{STATUS_LABELS[item.status]}</span></td>
          <td>{item.status === 'CONVERTED' ? <strong className="cell-strong">{inr(item.orderValue)}</strong> : <span className="muted">—</span>}</td>
          {!compact && <td>{item.noharOrderId || <span className="muted">—</span>}</td>}
          <td><button className="text-button" onClick={() => onUpdate(item)}>{item.status === 'REDIRECTED' ? 'Record sale' : 'Update'} <Icon name="arrow" size={15} /></button></td>
        </tr>)}
      </tbody>
    </table>
  </div>
}

const toLocalInput = date => { const d = new Date(date); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 16) }

// Updates a referral's outcome, or logs a new one by hand (record = null).
export function ReferralModal({ record, onSaved, onClose }) {
  const [products, setProducts] = useState([])
  const [values, setValues] = useState(() => ({
    productId: '',
    type: record?.type || 'buy',
    quantity: String(record?.quantity || 1),
    redirectedAt: toLocalInput(record?.redirectedAt || new Date()),
    status: record?.status || 'REDIRECTED',
    orderValue: record?.orderValue ? String(record.orderValue) : '',
    noharOrderId: record?.noharOrderId || '',
  }))
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (record) return
    api.products({ limit: 100 })
      .then(({ data }) => { setProducts(data); setValues(v => ({ ...v, productId: v.productId || data[0]?._id || '' })) })
      .catch(err => setError(err.message))
  }, [record])

  const set = key => event => setValues(v => ({ ...v, [key]: event.target.value }))
  const submit = async event => {
    event.preventDefault()
    setSaving(true); setError('')
    const outcome = { status: values.status, ...(values.status === 'CONVERTED' ? { orderValue: values.orderValue, noharOrderId: values.noharOrderId } : {}) }
    try {
      const { data } = record
        ? await api.updateReferral(record._id, outcome)
        : await api.createReferral({ productId: values.productId, type: values.type, quantity: values.quantity, redirectedAt: new Date(values.redirectedAt).toISOString(), ...outcome })
      onSaved(data)
    } catch (err) {
      setError(err.message)
      setSaving(false)
    }
  }

  return <div className="modal-backdrop" onClick={onClose}>
    <section className="modal" role="dialog" aria-modal="true" aria-label={record ? 'Update referral' : 'Log referral'} onClick={event => event.stopPropagation()} onKeyDown={event => { if (event.key === 'Escape') onClose() }}>
      <div className="panel-heading">
        <div><h2>{record ? 'Update referral' : 'Log referral'}</h2><p>{record ? `${record.productName} · ${REFERRAL_TYPES[record.type]} · ${formatWhen(record.redirectedAt)}` : 'Record a visitor you sent to Nohar yourself.'}</p></div>
        <button className="icon-button" aria-label="Close dialog" onClick={onClose}><Icon name="close" /></button>
      </div>
      <form onSubmit={submit}>
        {error && <div className="notice error" role="alert">{error}</div>}
        {!record && <>
          <label>Product
            <select value={values.productId} onChange={set('productId')} required>
              {!products.length && <option value="">Loading products…</option>}
              {products.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
            </select>
          </label>
          <div className="modal-row">
            <label>Button clicked
              <select value={values.type} onChange={set('type')}>
                {Object.entries(REFERRAL_TYPES).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
              </select>
            </label>
            {values.type === 'bulk' && <label>Quantity<input type="number" min="1" step="1" value={values.quantity} onChange={set('quantity')} required /></label>}
          </div>
          <label>Redirected at<input type="datetime-local" value={values.redirectedAt} onChange={set('redirectedAt')} max={toLocalInput(new Date())} required /></label>
        </>}
        <label>Outcome on Nohar
          <select value={values.status} onChange={set('status')}>
            {REFERRAL_STATUSES.map(status => <option key={status} value={status}>{STATUS_LABELS[status]}</option>)}
          </select>
        </label>
        {values.status === 'CONVERTED' && <div className="modal-row">
          <label>Order value (₹)<input type="number" min="1" step="0.01" value={values.orderValue} onChange={set('orderValue')} required autoFocus /></label>
          <label>Nohar order ID<input value={values.noharOrderId} onChange={set('noharOrderId')} placeholder="e.g. NH-48213" maxLength={100} /></label>
        </div>}
        <div className="form-actions">
          <button type="button" className="secondary" onClick={onClose}>Cancel</button>
          <button className="primary" type="submit" disabled={saving}>{saving ? 'Saving…' : <><Icon name="check" size={17} />Save referral</>}</button>
        </div>
      </form>
    </section>
  </div>
}
