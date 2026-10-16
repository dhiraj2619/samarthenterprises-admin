import { useEffect, useRef, useState } from 'react'
import Icon from './Icon.jsx'
import { api } from './api.js'

export function AdTable({ items, onEdit, onDelete }) {
  return <div className="table-scroll"><table className="broadcast-table"><thead><tr><th>Image</th><th>Title</th><th>Video link</th><th>Status</th><th>Actions</th></tr></thead><tbody>{items.map(item => <tr key={item._id}>
    <td><span className="broadcast-thumb">{item.image?.url ? <img src={item.image.url} alt="" loading="lazy" /> : <Icon name="image" size={20} />}</span></td>
    <td className="wrap"><strong className="cell-strong">{item.title}</strong></td>
    <td>{item.videoLink ? <a className="table-link" href={item.videoLink} target="_blank" rel="noopener noreferrer">Open video <Icon name="external" size={14} /></a> : <span className="muted">No video</span>}</td>
    <td><span className={`badge ${item.isActive ? '' : 'draft'}`}>{item.isActive ? 'Active' : 'Draft'}</span></td>
    <td><span className="row-actions"><button className="text-button" onClick={() => onEdit(item)}>Edit <Icon name="arrow" size={15} /></button><button className="icon-button danger" aria-label={`Delete ${item.title}`} onClick={() => onDelete(item)}><Icon name="trash" size={16} /></button></span></td>
  </tr>)}</tbody></table></div>
}

export function AdForm({ record, onSaved, onCancel }) {
  const [values, setValues] = useState({ title: record?.title || '', videoLink: record?.videoLink || '', isActive: record?.isActive ?? true })
  const [image, setImage] = useState(null)
  const [removeImage, setRemoveImage] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const input = useRef(null)
  const preview = image?.url || (!removeImage && record?.image?.url)
  useEffect(() => () => { if (image) URL.revokeObjectURL(image.url) }, [image])
  const choose = event => {
    const file = event.target.files[0]
    event.target.value = ''
    if (!file) return
    if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type)) { setError('Please choose a JPG, PNG, WebP or GIF image.'); return }
    if (file.size > 5 * 1024 * 1024) { setError('Image must be 5 MB or smaller.'); return }
    setImage({ file, url: URL.createObjectURL(file) }); setRemoveImage(false); setError('')
  }
  const submit = async event => {
    event.preventDefault()
    if (saving) return
    if (values.videoLink.trim()) {
      try { if (!['http:', 'https:'].includes(new URL(values.videoLink.trim()).protocol)) throw new Error() }
      catch { setError('Enter a valid http:// or https:// video link.'); return }
    }
    const form = new FormData()
    form.append('title', values.title.trim())
    form.append('videoLink', values.videoLink.trim())
    form.append('isActive', String(values.isActive))
    if (image) form.append('image', image.file)
    if (removeImage) form.append('removeImage', 'true')
    setSaving(true); setError('')
    try { const response = record ? await api.updateAd(record._id, form) : await api.createAd(form); onSaved(response.data) }
    catch (err) { setError(err.message); setSaving(false) }
  }
  return <form className="product-form" onSubmit={submit}>
    <div className="form-header"><button type="button" className="icon-button back-button" aria-label="Back to ads" onClick={onCancel} disabled={saving}><Icon name="back" /></button><div className="form-title"><h1>{record ? 'Edit Ad' : 'Add Ad'}</h1></div><div className="form-header-actions"><button type="button" className="secondary" onClick={onCancel} disabled={saving}>Cancel</button><button type="submit" className="primary" disabled={saving || !values.title.trim()}>{saving ? 'Saving...' : 'Save Ad'}</button></div></div>
    {error && <div role="alert" className="notice error">{error}</div>}
    <section className="panel form-card"><div className="card-body">
      <label className="field"><span>Title <em>*</em></span><input autoFocus required maxLength={150} value={values.title} onChange={event => setValues({ ...values, title: event.target.value })} placeholder="Summer campaign video ad" disabled={saving} /></label>
      <label className="field"><span>Video link</span><input type="url" maxLength={500} value={values.videoLink} onChange={event => setValues({ ...values, videoLink: event.target.value })} placeholder="https://..." disabled={saving} /><small className="field-hint">YouTube or a direct MP4/WebM video link. Other links open in a new tab.</small></label>
      <div className="thumb-field"><span className="thumb-label">Image upload</span><button type="button" className={`broadcast-upload ${preview ? 'has-image' : ''}`} onClick={() => input.current.click()} disabled={saving}>{preview ? <img src={preview} alt="Ad preview" /> : <span className="upload-zone"><Icon name="image" size={28} /><strong>Choose an image</strong><small>JPG, PNG, WebP or GIF · Up to 5 MB</small></span>}</button><input ref={input} type="file" accept="image/jpeg,image/png,image/webp,image/gif" hidden onChange={choose} />{preview && <button type="button" className="text-button" disabled={saving} onClick={() => { setImage(null); setRemoveImage(true) }}>Remove image</button>}</div>
      <label className="check-row"><input type="checkbox" checked={values.isActive} onChange={event => setValues({ ...values, isActive: event.target.checked })} disabled={saving} /><span><strong>Is Active</strong><small>Show this ad on the website.</small></span></label>
    </div></section>
  </form>
}
