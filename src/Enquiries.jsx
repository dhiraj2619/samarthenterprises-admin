import { useState } from 'react'
import Icon from './Icon.jsx'
import { api } from './api.js'

const STATUS = { NEW: 'New', CONTACTED: 'Contacted', CLOSED: 'Closed' }
const STATUS_CLASS = { NEW: 'draft', CONTACTED: '', CLOSED: 'muted-badge' }
const formatWhen = value => new Date(value).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' })
const formatPhone = phone => phone?.length === 10 ? `${phone.slice(0, 5)} ${phone.slice(5)}` : phone
const formatLocation = item => [item.city, item.state].filter(Boolean).join(', ') + (item.pincode ? ` – ${item.pincode}` : '')

function StatusBadge({ status }) {
  return <span className={`badge ${STATUS_CLASS[status] ?? ''}`}><i />{STATUS[status] || status}</span>
}

export function EnquiryTable({ items, onOpen }) {
  return <div className="table-scroll">
    <table className="enquiry-table">
      <thead>
        <tr><th>Received</th><th>Name</th><th>Contact</th><th>Location</th><th>Message</th><th>Status</th><th><span className="sr-only">Actions</span></th></tr>
      </thead>
      <tbody>
        {items.map(item => <tr key={item._id} className={item.status === 'NEW' ? 'is-new' : ''}>
          <td className="nowrap">{formatWhen(item.createdAt)}</td>
          <td className="wrap"><strong className="cell-strong">{item.customerName}</strong>{item.product?.name && <small className="cell-sub">About: {item.product.name}</small>}</td>
          <td className="nowrap">
            <a className="table-link" href={`tel:+91${item.contact}`}>{formatPhone(item.contact)}</a>
            {item.email && <small className="cell-sub"><a className="table-link" href={`mailto:${item.email}`}>{item.email}</a></small>}
          </td>
          <td className="wrap">{formatLocation(item) || <span className="muted">—</span>}</td>
          <td className="wrap"><p className="clamp">{item.enquiry}</p></td>
          <td><StatusBadge status={item.status} /></td>
          <td><button className="text-button" onClick={() => onOpen(item)}>View <Icon name="arrow" size={15} /></button></td>
        </tr>)}
      </tbody>
    </table>
  </div>
}

// Shows the full enquiry and lets the admin change its status or delete it.
export function EnquiryModal({ record, onSaved, onDeleted, onClose }) {
  const [status, setStatus] = useState(record.status)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const save = async () => {
    setSaving(true); setError('')
    try { const { data } = await api.updateEnquiry(record._id, { status }); onSaved(data) }
    catch (err) { setError(err.message); setSaving(false) }
  }
  const remove = async () => {
    if (!window.confirm(`Delete the enquiry from "${record.customerName}"? This cannot be undone.`)) return
    setSaving(true); setError('')
    try { await api.deleteEnquiry(record._id); onDeleted(record) }
    catch (err) { setError(err.message); setSaving(false) }
  }

  return <div className="modal-backdrop" onClick={onClose}>
    <section className="modal enquiry-modal" role="dialog" aria-modal="true" aria-label="Enquiry" onClick={event => event.stopPropagation()} onKeyDown={event => { if (event.key === 'Escape') onClose() }}>
      <div className="panel-heading">
        <div><h2>{record.customerName}</h2><p>Received {formatWhen(record.createdAt)}</p></div>
        <button className="icon-button" aria-label="Close dialog" onClick={onClose}><Icon name="close" /></button>
      </div>
      <div className="enquiry-body">
        {error && <div className="notice error" role="alert">{error}</div>}
        <dl className="enquiry-details">
          <div><dt>Mobile</dt><dd><a className="table-link" href={`tel:+91${record.contact}`}>+91 {formatPhone(record.contact)}</a></dd></div>
          <div><dt>Email</dt><dd>{record.email ? <a className="table-link" href={`mailto:${record.email}`}>{record.email}</a> : <span className="muted">Not given</span>}</dd></div>
          {formatLocation(record) && <div><dt>Location</dt><dd>{formatLocation(record)}</dd></div>}
          {record.product?.name && <div><dt>Product</dt><dd>{record.product.name}</dd></div>}
        </dl>
        <div className="enquiry-message"><span className="thumb-label">Message</span><p>{record.enquiry}</p></div>
        <label className="enquiry-status">Status
          <select value={status} onChange={e => setStatus(e.target.value)}>
            {Object.entries(STATUS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        <div className="form-actions">
          <button type="button" className="danger-button push-left" onClick={remove} disabled={saving}><Icon name="trash" size={16} />Delete</button>
          <button type="button" className="secondary" onClick={onClose}>Close</button>
          <button type="button" className="primary" onClick={save} disabled={saving || status === record.status}>{saving ? 'Saving…' : 'Save status'}</button>
        </div>
      </div>
    </section>
  </div>
}
