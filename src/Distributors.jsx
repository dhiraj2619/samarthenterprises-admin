import { useEffect, useRef, useState } from 'react'
import Icon from './Icon.jsx'
import { api } from './api.js'

const LOGO_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const formatMobile = mobile => mobile?.length === 10 ? `${mobile.slice(0, 5)} ${mobile.slice(5)}` : mobile
const hostOf = url => { try { return new URL(url).host.replace(/^www\./, '') } catch { return url } }

// Looks up an Indian pincode with India Post's public API. Returns { city, state } or null if unknown.
async function lookupPincode(pincode, signal) {
  const response = await fetch(`https://api.postalpincode.in/pincode/${pincode}`, { signal })
  if (!response.ok) throw new Error('Lookup failed')
  const [result] = await response.json()
  const office = result?.Status === 'Success' ? result.PostOffice?.[0] : null
  return office ? { city: office.District, state: office.State } : null
}

export function DistributorTable({ items, onEdit, onDelete }) {
  return <div className="table-scroll">
    <table className="distributor-table">
      <thead>
        <tr><th>Company</th><th>Contact person</th><th>Mobile</th><th>Location</th><th>Website</th><th><span className="sr-only">Actions</span></th></tr>
      </thead>
      <tbody>
        {items.map(item => <tr key={item._id}>
          <td>
            <div className="product-name">
              <span className="distributor-logo">{item.logo?.url ? <img src={item.logo.url} alt="" loading="lazy" /> : <span>{item.companyName.slice(0, 1).toUpperCase()}</span>}</span>
              <strong className="cell-strong">{item.companyName}</strong>
            </div>
          </td>
          <td>{item.contactPerson}</td>
          <td className="nowrap"><a className="table-link" href={`tel:+91${item.mobile}`}>{formatMobile(item.mobile)}</a></td>
          <td className="wrap">{item.city}, {item.state}<small className="cell-sub">{item.pincode}</small></td>
          <td>{item.website ? <a className="table-link" href={item.website} target="_blank" rel="noreferrer">{hostOf(item.website)}<Icon name="external" size={13} /></a> : <span className="muted">—</span>}</td>
          <td><span className="row-actions">
            <button className="text-button" onClick={() => onEdit(item)}>Edit <Icon name="arrow" size={15} /></button>
            <button className="icon-button danger" aria-label={`Delete ${item.companyName}`} title="Delete" onClick={() => onDelete(item)}><Icon name="trash" size={16} /></button>
          </span></td>
        </tr>)}
      </tbody>
    </table>
  </div>
}

// Create (record = null) or edit a distributor. Entering a 6-digit pincode fills in city and state.
export function DistributorModal({ record, onSaved, onDeleted, onClose }) {
  const [values, setValues] = useState({
    companyName: record?.companyName || '', contactPerson: record?.contactPerson || '', mobile: record?.mobile || '',
    website: record?.website || '', pincode: record?.pincode || '', city: record?.city || '', state: record?.state || '',
  })
  const [logo, setLogo] = useState(null)
  const [removeLogo, setRemoveLogo] = useState(false)
  const [lookup, setLookup] = useState('idle') // idle | loading | found | not-found | failed
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const fileInput = useRef(null)
  const pending = useRef(null)
  const preview = logo ? logo.url : !removeLogo && record?.logo?.url

  useEffect(() => () => { if (logo) URL.revokeObjectURL(logo.url) }, [logo])
  useEffect(() => () => pending.current?.abort(), [])

  const set = key => event => setValues(v => ({ ...v, [key]: event.target.value }))

  const changePincode = async event => {
    const pincode = event.target.value.replace(/\D/g, '').slice(0, 6)
    setValues(v => ({ ...v, pincode }))
    pending.current?.abort()
    if (pincode.length < 6) { setLookup('idle'); return }
    const controller = new AbortController()
    pending.current = controller
    setLookup('loading')
    try {
      const place = await lookupPincode(pincode, controller.signal)
      if (controller.signal.aborted) return
      if (place) { setValues(v => ({ ...v, ...place })); setLookup('found') } else setLookup('not-found')
    } catch {
      if (!controller.signal.aborted) setLookup('failed')
    }
  }

  const chooseLogo = event => {
    const file = event.target.files[0]
    event.target.value = ''
    if (!file) return
    if (!LOGO_TYPES.includes(file.type)) { setError('Logo must be a JPG, PNG or WebP image.'); return }
    if (file.size > 5 * 1024 * 1024) { setError('Logo must be 5 MB or smaller.'); return }
    setLogo({ file, url: URL.createObjectURL(file) }); setRemoveLogo(false); setError('')
  }
  const clearLogo = () => { setLogo(null); setRemoveLogo(true) }

  const submit = async event => {
    event.preventDefault()
    if (lookup === 'loading') return
    const form = new FormData()
    for (const key of Object.keys(values)) form.append(key, values[key].trim())
    if (logo) form.append('logo', logo.file)
    else if (removeLogo && record?.logo?.url) form.append('removeLogo', 'true')
    setSaving(true); setError('')
    try {
      const { data } = record ? await api.updateDistributor(record._id, form) : await api.createDistributor(form)
      onSaved(data, !record)
    } catch (err) { setError(err.message); setSaving(false) }
  }

  const remove = async () => {
    if (!window.confirm(`Delete the distributor "${record.companyName}"?`)) return
    setSaving(true); setError('')
    try { await api.deleteDistributor(record._id); onDeleted(record) }
    catch (err) { setError(err.message); setSaving(false) }
  }

  const finding = lookup === 'loading'
  const lookupNote = {
    loading: <><span className="spinner tiny" />Finding city and state…</>,
    found: <><Icon name="check" size={13} />City and state filled in from the pincode.</>,
    'not-found': 'No match for this pincode. Enter the city and state yourself.',
    failed: "Couldn't look up this pincode. Enter the city and state yourself.",
  }[lookup]

  return <div className="modal-backdrop" onClick={onClose}>
    <section className="modal distributor-modal" role="dialog" aria-modal="true" aria-label={record ? 'Edit distributor' : 'New distributor'} onClick={event => event.stopPropagation()} onKeyDown={event => { if (event.key === 'Escape') onClose() }}>
      <div className="panel-heading">
        <div><h2>{record ? 'Edit distributor' : 'New distributor'}</h2></div>
        <button className="icon-button" aria-label="Close dialog" onClick={onClose}><Icon name="close" /></button>
      </div>
      <form onSubmit={submit}>
        {error && <div className="notice error" role="alert">{error}</div>}
        <label><span>Company name <em className="req">*</em></span><input value={values.companyName} onChange={set('companyName')} required autoFocus maxLength={150} /></label>
        <div className="thumb-field">
          <span className="thumb-label">Company logo <span className="optional">(optional)</span></span>
          <div className="thumb-row">
            <span className="thumb-preview">{preview ? <img src={preview} alt="Company logo" /> : <Icon name="image" size={22} />}</span>
            <div className="thumb-actions">
              <button type="button" className="secondary" onClick={() => fileInput.current.click()}>{preview ? 'Replace' : 'Upload'}</button>
              {preview && <button type="button" className="link-button" onClick={clearLogo}>Remove</button>}
            </div>
          </div>
          <small className="field-hint">JPG, PNG or WebP · Up to 5 MB</small>
          <input ref={fileInput} type="file" accept={LOGO_TYPES.join(',')} hidden onChange={chooseLogo} />
        </div>
        <div className="modal-row">
          <label><span>Contact person <em className="req">*</em></span><input value={values.contactPerson} onChange={set('contactPerson')} required maxLength={100} /></label>
          <label><span>Mobile <em className="req">*</em></span>
            <span className="prefixed-input"><span>+91</span><input type="tel" inputMode="numeric" value={values.mobile} onChange={e => setValues(v => ({ ...v, mobile: e.target.value.replace(/\D/g, '').slice(0, 10) }))} required pattern="[6-9][0-9]{9}" title="10-digit mobile number" placeholder="98765 43210" /></span>
          </label>
        </div>
        <label><span>Website</span><input value={values.website} onChange={set('website')} maxLength={300} placeholder="www.example.com" /></label>
        <label><span>Pincode <em className="req">*</em></span>
          <span className="lookup-input">
            <input inputMode="numeric" value={values.pincode} onChange={changePincode} required pattern="[1-9][0-9]{5}" title="6-digit pincode" placeholder="e.g. 411001" aria-describedby="pincode-note" />
            {finding && <span className="spinner tiny" aria-hidden="true" />}
          </span>
          <small id="pincode-note" className={`field-hint lookup-note ${lookup}`} aria-live="polite">{lookupNote || 'City and state fill in automatically.'}</small>
        </label>
        <div className="modal-row">
          <label><span>City <em className="req">*</em></span><input value={finding ? '' : values.city} onChange={set('city')} required maxLength={100} disabled={finding} placeholder={finding ? 'Finding…' : ''} /></label>
          <label><span>State <em className="req">*</em></span><input value={finding ? '' : values.state} onChange={set('state')} required maxLength={100} disabled={finding} placeholder={finding ? 'Finding…' : ''} /></label>
        </div>
        <div className="form-actions">
          {record && <button type="button" className="danger-button push-left" onClick={remove} disabled={saving}><Icon name="trash" size={16} />Delete</button>}
          <button type="button" className="secondary" onClick={onClose}>Cancel</button>
          <button className="primary" type="submit" disabled={saving || finding}>{saving ? 'Saving…' : 'Save distributor'}</button>
        </div>
      </form>
    </section>
  </div>
}
