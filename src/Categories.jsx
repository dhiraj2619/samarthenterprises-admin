import { useEffect, useRef, useState } from 'react'
import Icon from './Icon.jsx'
import { api } from './api.js'

export function CategoryGrid({ items, onEdit, onShowProducts }) {
  return <div className="record-grid">
    {items.map(item => <article className="record-card" key={item._id}>
      <div className="record-top">
        {item.thumbnail?.url ? <img className="category-thumb" src={item.thumbnail.url} alt="" loading="lazy" /> : <span className="collection-icon tone-0"><Icon name="collections" size={26} /></span>}
        <span className={`badge ${item.isActive ? '' : 'draft'}`}><i />{item.isActive ? 'Active' : 'Draft'}</span>
      </div>
      <h2>{item.name}</h2>
      <p>{item.description || <span className="muted">No description</span>}</p>
      <button className="category-count" onClick={() => onShowProducts(item)}>{item.productCount} product{item.productCount === 1 ? '' : 's'} <Icon name="arrow" size={14} /></button>
      <div><button className="text-button" onClick={() => onEdit(item)}>Manage category <Icon name="arrow" size={16} /></button></div>
    </article>)}
  </div>
}

// Create (record = null) or edit a category, including its optional thumbnail.
export function CategoryModal({ record, onSaved, onDeleted, onClose }) {
  const [values, setValues] = useState({ name: record?.name || '', description: record?.description || '', isActive: record ? record.isActive : true })
  const [thumb, setThumb] = useState(null)
  const [removeThumb, setRemoveThumb] = useState(false)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const fileInput = useRef(null)
  const preview = thumb ? thumb.url : !removeThumb && record?.thumbnail?.url

  useEffect(() => () => { if (thumb) URL.revokeObjectURL(thumb.url) }, [thumb])

  const choose = event => {
    const file = event.target.files[0]
    event.target.value = ''
    if (!file) return
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) { setError('Thumbnail must be a JPG, PNG or WebP image.'); return }
    if (file.size > 5 * 1024 * 1024) { setError('Thumbnail must be 5 MB or smaller.'); return }
    setThumb({ file, url: URL.createObjectURL(file) }); setRemoveThumb(false); setError('')
  }
  const clearThumb = () => { setThumb(null); setRemoveThumb(true) }

  const submit = async event => {
    event.preventDefault()
    const form = new FormData()
    form.append('name', values.name.trim())
    form.append('description', values.description.trim())
    form.append('isActive', String(values.isActive))
    if (thumb) form.append('thumbnail', thumb.file)
    else if (removeThumb && record?.thumbnail?.url) form.append('removeThumbnail', 'true')
    setSaving(true); setError('')
    try {
      const { data } = record ? await api.updateCategory(record._id, form) : await api.createCategory(form)
      onSaved(data, !record)
    } catch (err) { setError(err.message); setSaving(false) }
  }

  const remove = async () => {
    if (!window.confirm(`Delete the category "${record.name}"?`)) return
    setSaving(true); setError('')
    try { await api.deleteCategory(record._id); onDeleted(record) }
    catch (err) { setError(err.message); setSaving(false) }
  }

  return <div className="modal-backdrop" onClick={onClose}>
    <section className="modal" role="dialog" aria-modal="true" aria-label={record ? 'Edit category' : 'Add category'} onClick={event => event.stopPropagation()} onKeyDown={event => { if (event.key === 'Escape') onClose() }}>
      <div className="panel-heading">
        <div><h2>{record ? 'Edit category' : 'Add category'}</h2><p>{record ? `${record.productCount} product${record.productCount === 1 ? '' : 's'} in this category` : 'Group products so visitors can browse them together.'}</p></div>
        <button className="icon-button" aria-label="Close dialog" onClick={onClose}><Icon name="close" /></button>
      </div>
      <form onSubmit={submit}>
        {error && <div className="notice error" role="alert">{error}</div>}
        <label>Name<input value={values.name} onChange={e => setValues(v => ({ ...v, name: e.target.value }))} required autoFocus maxLength={120} placeholder="e.g. Health & Wellness" /></label>
        <label>Description<textarea rows={3} value={values.description} onChange={e => setValues(v => ({ ...v, description: e.target.value }))} maxLength={500} placeholder="Optional" /></label>
        <div className="thumb-field">
          <span className="thumb-label">Thumbnail</span>
          <div className="thumb-row">
            <span className="thumb-preview">{preview ? <img src={preview} alt="Category thumbnail" /> : <Icon name="image" size={22} />}</span>
            <div className="thumb-actions">
              <button type="button" className="secondary" onClick={() => fileInput.current.click()}>{preview ? 'Replace' : 'Upload'}</button>
              {preview && <button type="button" className="link-button" onClick={clearThumb}>Remove</button>}
            </div>
          </div>
          <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={choose} />
        </div>
        <label>Status
          <select value={values.isActive ? 'Active' : 'Draft'} onChange={e => setValues(v => ({ ...v, isActive: e.target.value === 'Active' }))}>
            <option>Active</option><option>Draft</option>
          </select>
        </label>
        <div className="form-actions">
          {record && <button type="button" className="danger-button push-left" onClick={remove} disabled={saving}><Icon name="trash" size={16} />Delete</button>}
          <button type="button" className="secondary" onClick={onClose}>Cancel</button>
          <button className="primary" type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save category'}</button>
        </div>
      </form>
    </section>
  </div>
}
