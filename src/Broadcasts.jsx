import { useEffect, useRef, useState } from 'react'
import Icon from './Icon.jsx'
import { api } from './api.js'

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const formatDate = value => new Date(value).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' })
const hostOf = url => { try { return new URL(url).host } catch { return url } }

export function BroadcastTable({ items, onEdit, onDelete }) {
  return <div className="table-scroll">
    <table className="broadcast-table">
      <thead>
        <tr><th>Image</th><th>Title</th><th>Description</th><th>Link</th><th>Created on</th><th><span className="sr-only">Actions</span></th></tr>
      </thead>
      <tbody>
        {items.map(item => <tr key={item._id}>
          <td><span className="broadcast-thumb">{item.image?.url ? <img src={item.image.url} alt="" loading="lazy" /> : <Icon name="image" size={20} />}</span></td>
          <td className="wrap"><strong className="cell-strong">{item.title}</strong></td>
          <td className="wrap"><p className="clamp">{item.description}</p></td>
          <td>{item.link ? <a className="table-link" href={item.link} target="_blank" rel="noreferrer">{hostOf(item.link)}<Icon name="external" size={13} /></a> : <span className="muted">—</span>}</td>
          <td className="nowrap">{formatDate(item.createdAt)}</td>
          <td><span className="row-actions">
            <button className="text-button" onClick={() => onEdit(item)}>Edit <Icon name="arrow" size={15} /></button>
            <button className="icon-button danger" aria-label={`Delete ${item.title}`} title="Delete" onClick={() => onDelete(item)}><Icon name="trash" size={16} /></button>
          </span></td>
        </tr>)}
      </tbody>
    </table>
  </div>
}

// Create (record = null) or edit a broadcast. An image is required for new broadcasts.
export function BroadcastModal({ record, onSaved, onDeleted, onClose }) {
  const [values, setValues] = useState({ title: record?.title || '', description: record?.description || '', link: record?.link || '' })
  const [image, setImage] = useState(null)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const fileInput = useRef(null)
  const preview = image?.url || record?.image?.url

  useEffect(() => () => { if (image) URL.revokeObjectURL(image.url) }, [image])

  const set = key => event => setValues(v => ({ ...v, [key]: event.target.value }))
  // GIFs are uploaded as-is (no resizing) so they stay animated.
  const choose = event => {
    const file = event.target.files[0]
    event.target.value = ''
    if (!file) return
    if (!IMAGE_TYPES.includes(file.type)) { setError('Image must be a JPG, PNG, WebP or GIF file.'); return }
    if (file.size > 5 * 1024 * 1024) { setError('Image must be 5 MB or smaller.'); return }
    setImage({ file, url: URL.createObjectURL(file) }); setError('')
  }

  const submit = async event => {
    event.preventDefault()
    if (!record && !image) { setError('Please choose an image for this broadcast.'); return }
    const form = new FormData()
    form.append('title', values.title.trim())
    form.append('description', values.description.trim())
    form.append('link', values.link.trim())
    if (image) form.append('image', image.file)
    setSaving(true); setError('')
    try {
      const { data } = record ? await api.updateBroadcast(record._id, form) : await api.createBroadcast(form)
      onSaved(data, !record)
    } catch (err) { setError(err.message); setSaving(false) }
  }

  const remove = async () => {
    if (!window.confirm(`Delete the broadcast "${record.title}"? Its image will be removed too.`)) return
    setSaving(true); setError('')
    try { await api.deleteBroadcast(record._id); onDeleted(record) }
    catch (err) { setError(err.message); setSaving(false) }
  }

  return <div className="modal-backdrop" onClick={onClose}>
    <section className="modal broadcast-modal" role="dialog" aria-modal="true" aria-label={record ? 'Edit broadcast' : 'New broadcast'} onClick={event => event.stopPropagation()} onKeyDown={event => { if (event.key === 'Escape') onClose() }}>
      <div className="panel-heading">
        <div><h2>{record ? 'Edit broadcast' : 'New broadcast'}</h2></div>
        <button className="icon-button" aria-label="Close dialog" onClick={onClose}><Icon name="close" /></button>
      </div>
      <form onSubmit={submit}>
        {error && <div className="notice error" role="alert">{error}</div>}
        <label><span>Title <em className="req">*</em></span><input value={values.title} onChange={set('title')} required autoFocus maxLength={150} /></label>
        <label><span>Description <em className="req">*</em></span><textarea rows={5} value={values.description} onChange={set('description')} required maxLength={2000} /></label>
        <div className="thumb-field">
          <span className="thumb-label">Image {!record && <em className="req">*</em>}</span>
          <button type="button" className={`broadcast-upload ${preview ? 'has-image' : ''}`} onClick={() => fileInput.current.click()} disabled={saving}>
            {preview ? <img src={preview} alt="Broadcast image" /> : <span className="upload-zone"><Icon name="image" size={24} /><strong>Choose image</strong></span>}
            {preview && <span className="broadcast-upload-change"><Icon name="edit" size={14} />Change image</span>}
          </button>
          <small className="field-hint">JPG, PNG, WebP or GIF · Up to 5 MB{image ? ` · ${image.file.name}` : ''}</small>
          <input ref={fileInput} type="file" accept={IMAGE_TYPES.join(',')} hidden onChange={choose} />
        </div>
        <label><span>URL link <span className="optional">(optional)</span></span><input type="url" value={values.link} onChange={set('link')} maxLength={500} placeholder="https://example.com" /></label>
        <div className="form-actions">
          {record && <button type="button" className="danger-button push-left" onClick={remove} disabled={saving}><Icon name="trash" size={16} />Delete</button>}
          <button type="button" className="secondary" onClick={onClose}>Cancel</button>
          <button className="primary" type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save broadcast'}</button>
        </div>
      </form>
    </section>
  </div>
}
