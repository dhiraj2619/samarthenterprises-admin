import { useEffect, useRef, useState } from 'react'
import Icon from './Icon.jsx'
import { api } from './api.js'

const MAX_IMAGES = 10
const GST_RATES = ['0', '5', '12', '18', '28']
const blank = { name: '', description: '', categoryId: '', ratings: '', rewardPoints: '', inStock: true, isMostBuy: false, isActive: true, hsnCode: '', gstRate: '5', buyNowUrl: '', bulkPurchaseUrl: '', images: [] }
const noharPattern = 'https://(www\\.)?nohar\\.in(/.*)?'
let nextKey = 0

// Shrink large photos before upload (the server accepts up to 5 MB per image).
function resizeImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Unreadable image')) }
    img.onload = () => {
      URL.revokeObjectURL(url)
      const scale = Math.min(1, 1600 / Math.max(img.width, img.height))
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(img.width * scale)
      canvas.height = Math.round(img.height * scale)
      const ctx = canvas.getContext('2d')
      ctx.fillStyle = '#fff'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      canvas.toBlob(blob => blob ? resolve(new File([blob], file.name.replace(/\.\w+$/, '') + '.jpg', { type: 'image/jpeg' })) : reject(new Error('Could not process image')), 'image/jpeg', 0.85)
    }
    img.src = url
  })
}

const fromProduct = product => ({
  ...blank,
  name: product.name || '',
  description: product.description || '',
  categoryId: product.categoryId?._id || product.categoryId || '',
  ratings: product.ratings ?? '',
  rewardPoints: product.rewardPoints ? String(product.rewardPoints) : '',
  inStock: product.inStock !== false,
  isMostBuy: Boolean(product.isMostBuy),
  isActive: product.isActive !== false,
  hsnCode: product.hsnCode || '',
  gstRate: String(product.gstRate ?? 5),
  buyNowUrl: product.buyNowUrl || '',
  bulkPurchaseUrl: product.bulkPurchaseUrl || '',
  images: (product.images || []).map(image => ({ key: nextKey++, public_id: image.public_id, url: image.url })),
})

export default function ProductForm({ productId, categories, onCreateCategory, onSaved, onCancel, onDeleted }) {
  const editing = Boolean(productId)
  const [values, setValues] = useState(blank)
  const [loading, setLoading] = useState(editing)
  const [loadError, setLoadError] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [saving, setSaving] = useState(false)
  const [adding, setAdding] = useState(false)
  const [newCategory, setNewCategory] = useState('')
  const [categoryError, setCategoryError] = useState('')
  const fileInput = useRef(null)
  const replaceIndex = useRef(null)
  const previews = useRef(new Set())

  useEffect(() => {
    if (!editing) return undefined
    let cancelled = false
    api.product(productId)
      .then(({ data }) => { if (!cancelled) setValues(fromProduct(data)) })
      .catch(err => { if (!cancelled) setLoadError(err.message) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [editing, productId])

  // Release local image previews when leaving the page.
  useEffect(() => {
    const urls = previews.current
    return () => urls.forEach(url => URL.revokeObjectURL(url))
  }, [])

  const set = key => event => setValues(v => ({ ...v, [key]: event.target.type === 'checkbox' ? event.target.checked : event.target.value }))
  const missing = [
    !values.name.trim() && 'product name',
    !values.description.trim() && 'description',
    !values.categoryId && 'category',
    !values.images.length && 'at least one image',
  ].filter(Boolean)

  const cancelCategory = () => { setAdding(false); setNewCategory(''); setCategoryError('') }
  const addCategory = async () => {
    if (!newCategory.trim()) { setCategoryError('Enter a category name.'); return }
    try {
      const created = await onCreateCategory(newCategory.trim())
      setValues(v => ({ ...v, categoryId: created._id }))
      cancelCategory()
    } catch (err) {
      setCategoryError(err.message)
    }
  }

  const pick = index => { replaceIndex.current = index; fileInput.current.click() }
  const upload = async event => {
    const file = event.target.files[0]
    event.target.value = ''
    if (!file) return
    if (!file.type.startsWith('image/')) { setError('Please choose an image file (JPG, PNG or WebP).'); return }
    setBusy(true); setError('')
    try {
      const resized = await resizeImage(file)
      const url = URL.createObjectURL(resized)
      previews.current.add(url)
      const entry = { key: nextKey++, file: resized, url }
      setValues(v => {
        const images = [...v.images]
        if (replaceIndex.current === null) images.push(entry); else images[replaceIndex.current] = entry
        return { ...v, images }
      })
    } catch {
      setError('That image could not be read. Try a JPG or PNG file.')
    } finally {
      setBusy(false)
    }
  }
  const removeImage = index => setValues(v => ({ ...v, images: v.images.filter((_, i) => i !== index) }))
  const move = (index, step) => setValues(v => {
    const images = [...v.images]
    const target = index + step
    if (target < 0 || target >= images.length) return v
    ;[images[index], images[target]] = [images[target], images[index]]
    return { ...v, images }
  })

  const submit = async event => {
    event.preventDefault()
    if (missing.length || busy || saving) return
    const form = new FormData()
    for (const key of ['name', 'description', 'categoryId', 'ratings', 'rewardPoints', 'hsnCode', 'gstRate', 'buyNowUrl', 'bulkPurchaseUrl']) {
      form.append(key, String(values[key]).trim())
    }
    for (const key of ['inStock', 'isMostBuy', 'isActive']) form.append(key, String(values[key]))
    // Existing images are kept by id; "__new__" marks where each uploaded file goes.
    if (editing) form.append('existingImages', JSON.stringify(values.images.map(image => image.file ? '__new__' : image.public_id)))
    values.images.filter(image => image.file).forEach(image => form.append('images', image.file))
    setSaving(true); setError('')
    try {
      const { data } = editing ? await api.updateProduct(productId, form) : await api.createProduct(form)
      onSaved(data, !editing)
    } catch (err) {
      setError(err.message)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } finally {
      setSaving(false)
    }
  }

  const remove = async () => {
    if (!window.confirm(`Delete "${values.name}"? Its images will be removed too. This cannot be undone.`)) return
    setSaving(true)
    try { await api.deleteProduct(productId); onDeleted({ name: values.name }) }
    catch (err) { setError(err.message); setSaving(false) }
  }

  if (loading) return <div className="panel page-state"><span className="spinner" />Loading product…</div>
  if (loadError) return <div className="panel page-state"><Icon name="alert" size={26} /><h2>Couldn't load this product</h2><p>{loadError}</p><button className="secondary" onClick={onCancel}>Back to products</button></div>

  const categoryOptions = categories.filter(c => c.isActive || c._id === values.categoryId)

  return <form className="product-form" onSubmit={submit}>
    <div className="form-header">
      <button type="button" className="icon-button back-button" onClick={onCancel} aria-label="Back to products"><Icon name="back" /></button>
      <div className="form-title">
        <div className="eyebrow">Products / {editing ? 'Edit' : 'New'}</div>
        <h1>{editing ? 'Edit product' : 'Add product'}</h1>
        <p>{missing.length ? `Still needed: ${missing.join(', ')}.` : 'Everything required is filled in. Ready to save.'}</p>
      </div>
      <div className="form-header-actions">
        <button type="button" className="secondary" onClick={onCancel} disabled={saving}>Cancel</button>
        <button className="primary" type="submit" disabled={missing.length > 0 || busy || saving}>{saving ? <><span className="spinner small" />Saving…</> : <><Icon name="check" size={17} />{editing ? 'Save changes' : 'Save product'}</>}</button>
      </div>
    </div>

    {error && <div className="notice error" role="alert">{error}<button type="button" aria-label="Dismiss" onClick={() => setError('')}><Icon name="close" size={16} /></button></div>}

    <div className="form-layout">
      <div className="form-main">
        <section className="panel form-card">
          <div className="card-head"><h2>Product info</h2><p>The name and description customers will see in the catalogue.</p></div>
          <div className="card-body">
            <label className="field"><span>Product name <em>*</em></span><input value={values.name} onChange={set('name')} placeholder="e.g. My Nutrimax Protein Powder (720gm)" required maxLength={200} /></label>
            <label className="field"><span>Description <em>*</em></span><textarea rows={5} value={values.description} onChange={set('description')} placeholder="Write a product description: benefits, ingredients, usage…" required /></label>
          </div>
        </section>

        <section className="panel form-card">
          <div className="card-head">
            <h2>Product media <em>required</em></h2>
            <p>Upload one image at a time. Each new image opens the next box, up to {MAX_IMAGES} images. The first image is used as the cover.</p>
          </div>
          <div className="card-body">
            <div className="media-grid">
              {values.images.map((image, i) => <figure className="media-slot" key={image.key}>
                <figcaption>
                  <span>Image {i + 1}{i === 0 && <b>Cover</b>}{image.file && <b className="new">New</b>}</span>
                  <span className="media-actions">
                    {i > 0 && <button type="button" className="icon-button" aria-label={`Move image ${i + 1} earlier`} title="Move earlier" onClick={() => move(i, -1)}><Icon name="back" size={15} /></button>}
                    <button type="button" className="icon-button" aria-label={`Replace image ${i + 1}`} title="Replace" onClick={() => pick(i)} disabled={busy}><Icon name="edit" size={15} /></button>
                    <button type="button" className="icon-button danger" aria-label={`Remove image ${i + 1}`} title="Remove" onClick={() => removeImage(i)}><Icon name="trash" size={15} /></button>
                  </span>
                </figcaption>
                <img src={image.url} alt={`Product image ${i + 1}`} />
              </figure>)}
              {values.images.length < MAX_IMAGES && <button type="button" className="media-slot upload-slot" onClick={() => pick(null)} disabled={busy}>
                <span className="media-label">Image {values.images.length + 1}</span>
                <span className="upload-zone">
                  <Icon name="image" size={26} />
                  <strong>{busy ? 'Processing…' : `Upload image ${values.images.length + 1}`}</strong>
                  <small>JPG, PNG or WebP</small>
                </span>
              </button>}
            </div>
            <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={upload} />
            <p className="media-count">{values.images.length} of {MAX_IMAGES} images · Changes upload when you save</p>
          </div>
        </section>

        <section className="panel form-card">
          <div className="card-head"><h2>Tax details</h2><p>Used for invoicing and compliance.</p></div>
          <div className="card-body field-row">
            <label className="field"><span>HSN code</span><input value={values.hsnCode} onChange={set('hsnCode')} inputMode="numeric" pattern="[0-9]{4,8}" title="4 to 8 digits" placeholder="e.g. 3004" /></label>
            <label className="field"><span>GST rate</span><select value={values.gstRate} onChange={set('gstRate')}>{GST_RATES.map(rate => <option key={rate} value={rate}>{rate}%</option>)}</select></label>
          </div>
        </section>

        <section className="panel form-card">
          <div className="card-head"><h2>Nohar links</h2><p>Where the Buy now and Bulk purchase buttons send visitors. Sales happen on nohar.in. Leave blank to use the Nohar home page.</p></div>
          <div className="card-body field-row">
            <label className="field"><span><Icon name="cart" size={13} /> Buy now link</span><input type="url" value={values.buyNowUrl} onChange={set('buyNowUrl')} pattern={noharPattern} title="A https://nohar.in link" placeholder="https://nohar.in/product/…" /></label>
            <label className="field"><span><Icon name="boxes" size={13} /> Bulk purchase link</span><input type="url" value={values.bulkPurchaseUrl} onChange={set('bulkPurchaseUrl')} pattern={noharPattern} title="A https://nohar.in link" placeholder="https://nohar.in/bulk/…" /></label>
          </div>
        </section>
      </div>

      <aside className="form-side">
        <section className="panel form-card">
          <div className="card-head"><h2>Product category</h2><p>Where this product appears in your catalogue.</p></div>
          <div className="card-body">
            <div className="field">
              <div className="field-label-row">
                <label htmlFor="product-category">Category <em>*</em></label>
                {!adding && <button type="button" className="link-button" onClick={() => { setAdding(true); setCategoryError('') }}><Icon name="plus" size={14} />New category</button>}
              </div>
              {adding ? <div className="inline-create">
                <input autoFocus value={newCategory} onChange={event => setNewCategory(event.target.value)} placeholder="e.g. Immunity boosters" aria-label="New category name" maxLength={120}
                  onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); addCategory() } if (event.key === 'Escape') cancelCategory() }} />
                <button type="button" className="primary" onClick={addCategory}>Add</button>
                <button type="button" className="icon-button" aria-label="Cancel new category" onClick={cancelCategory}><Icon name="close" size={16} /></button>
              </div> : <select id="product-category" value={values.categoryId} onChange={set('categoryId')} required>
                <option value="" disabled>{categoryOptions.length ? 'Select a category' : 'Create a category first'}</option>
                {categoryOptions.map(c => <option key={c._id} value={c._id}>{c.name}{c.isActive ? '' : ' (draft)'}</option>)}
              </select>}
              {categoryError && <small className="field-error">{categoryError}</small>}
            </div>
            <div className="field-row">
              <label className="field"><span>Ratings</span><input type="number" min="0" max="5" step="0.1" value={values.ratings} onChange={set('ratings')} placeholder="0 to 5" /></label>
              <label className="field"><span>Reward points</span><input type="number" min="0" step="1" value={values.rewardPoints} onChange={set('rewardPoints')} placeholder="e.g. 50" /></label>
            </div>
            <div className="field"><span id="stock-label">Stock</span>
              <div className="segmented" role="radiogroup" aria-labelledby="stock-label">
                <button type="button" role="radio" aria-checked={values.inStock} className={values.inStock ? 'on' : ''} onClick={() => setValues(v => ({ ...v, inStock: true }))}>In stock</button>
                <button type="button" role="radio" aria-checked={!values.inStock} className={values.inStock ? '' : 'on off'} onClick={() => setValues(v => ({ ...v, inStock: false }))}>Out of stock</button>
              </div>
            </div>
            <label className="check-row">
              <input type="checkbox" checked={values.isMostBuy} onChange={set('isMostBuy')} />
              <span><strong>Mark as most buy</strong><small>Highlight this product as a best seller.</small></span>
            </label>
            <label className="check-row">
              <input type="checkbox" checked={values.isActive} onChange={set('isActive')} />
              <span><strong>Show on website</strong><small>Unticked products stay saved here but are hidden from the catalogue.</small></span>
            </label>
          </div>
        </section>
        {editing && <button type="button" className="danger-button" onClick={remove} disabled={saving}><Icon name="trash" size={16} />Delete product</button>}
      </aside>
    </div>
  </form>
}
