import { useEffect, useRef, useState } from 'react'
import Icon from './Icon.jsx'
import { api } from './api.js'

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_SLIDES = 10
const emptyProfile = { companyName: '', ownerName: '', phone: '', email: '', address: '', gstNumber: '', instagram: '', youtube: '', whatsapp: '' }

const fromProfile = p => ({
  companyName: p.companyName || '', ownerName: p.ownerName || '', phone: p.phone || '', email: p.email || '',
  address: p.address || '', gstNumber: p.gstNumber || '',
  instagram: p.socialLinks?.instagram || '', youtube: p.socialLinks?.youtube || '', whatsapp: p.socialLinks?.whatsapp || '',
})

const checkImage = file => {
  if (!IMAGE_TYPES.includes(file.type)) return 'Slides must be JPG, PNG or WebP images.'
  if (file.size > 5 * 1024 * 1024) return 'Each slide image must be 5 MB or smaller.'
  return ''
}

function ProfileForm({ initial, onToast }) {
  const [values, setValues] = useState(initial)
  const [saved, setSaved] = useState(initial)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const dirty = Object.keys(values).some(key => values[key] !== saved[key])

  const set = key => event => setValues(v => ({ ...v, [key]: event.target.value }))

  const submit = async event => {
    event.preventDefault()
    const v = Object.fromEntries(Object.entries(values).map(([key, value]) => [key, value.trim()]))
    setSaving(true); setError('')
    try {
      const { data } = await api.updateProfile({
        companyName: v.companyName, ownerName: v.ownerName, phone: v.phone, email: v.email, address: v.address, gstNumber: v.gstNumber,
        socialLinks: { instagram: v.instagram, youtube: v.youtube, whatsapp: v.whatsapp },
      })
      const next = fromProfile(data)
      setValues(next); setSaved(next)
      onToast('Profile saved.')
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return <form className="settings-grid" onSubmit={submit}>
    <section className="panel form-card">
      <div className="card-head"><h2>Business profile</h2><p>Shown on the website and app wherever your contact details appear.</p></div>
      <div className="card-body">
        {error && <div className="notice error" role="alert">{error}<button type="button" aria-label="Dismiss" onClick={() => setError('')}><Icon name="close" size={16} /></button></div>}
        <div className="field-row">
          <label className="field"><span>Company name <em>*</em></span><input value={values.companyName} onChange={set('companyName')} required maxLength={150} /></label>
          <label className="field"><span>Owner name <em>*</em></span><input value={values.ownerName} onChange={set('ownerName')} required maxLength={100} /></label>
        </div>
        <div className="field-row">
          <label className="field"><span>Mobile number</span>
            <span className="prefixed-field"><span>+91</span><input type="tel" inputMode="numeric" value={values.phone} onChange={e => setValues(v => ({ ...v, phone: e.target.value.replace(/\D/g, '').slice(0, 10) }))} pattern="[6-9][0-9]{9}" title="10-digit mobile number" placeholder="98765 43210" /></span>
          </label>
          <label className="field"><span>Email ID</span><input type="email" value={values.email} onChange={set('email')} maxLength={150} placeholder="hello@samarth.in" /></label>
        </div>
        <label className="field"><span>Address</span><textarea rows={3} value={values.address} onChange={set('address')} maxLength={500} placeholder="Shop / office address" /></label>
        <label className="field"><span>GST number</span><input value={values.gstNumber} onChange={e => setValues(v => ({ ...v, gstNumber: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 15) }))} placeholder="27AAAAA0000A1Z5" className="code-input" /></label>
      </div>
    </section>

    <section className="panel form-card">
      <div className="card-head"><h2>Social media</h2><p>Links for the website footer and app. Leave any blank to hide it.</p></div>
      <div className="card-body">
        <label className="field"><span><Icon name="instagram" size={14} /> Instagram</span><input value={values.instagram} onChange={set('instagram')} maxLength={300} placeholder="instagram.com/yourpage" /></label>
        <label className="field"><span><Icon name="youtube" size={14} /> YouTube</span><input value={values.youtube} onChange={set('youtube')} maxLength={300} placeholder="youtube.com/@yourchannel" /></label>
        <label className="field"><span><Icon name="whatsapp" size={14} /> WhatsApp</span><input value={values.whatsapp} onChange={set('whatsapp')} maxLength={300} placeholder="WhatsApp number or wa.me link" /><small className="field-hint">A 10-digit number is turned into a wa.me chat link.</small></label>
        <div className="settings-save">
          <span className="field-hint">{dirty ? 'You have unsaved changes.' : 'All changes saved.'}</span>
          <button className="primary" type="submit" disabled={saving || !dirty}>{saving ? <><span className="spinner small" />Saving…</> : <><Icon name="check" size={17} />Save profile</>}</button>
        </div>
      </div>
    </section>
  </form>
}

function QuoteSlides({ initial, onToast }) {
  const [slides, setSlides] = useState(initial)
  const [busy, setBusy] = useState(null) // 'add' or a slide id while uploading/deleting
  const fileInput = useRef(null)
  const target = useRef(null) // null = add a new slide, otherwise the slide id to replace

  const pick = id => { target.current = id; fileInput.current.click() }

  const upload = async event => {
    const file = event.target.files[0]
    event.target.value = ''
    if (!file) return
    const problem = checkImage(file)
    if (problem) { onToast(problem, 'error'); return }
    const id = target.current
    const form = new FormData()
    form.append('image', file)
    setBusy(id || 'add')
    try {
      if (id) {
        const { data } = await api.updateQuoteSlide(id, form)
        setSlides(list => list.map(s => s._id === id ? data : s))
        onToast('Slide image replaced.')
      } else {
        const { data } = await api.addQuoteSlide(form)
        setSlides(list => [...list, data])
        onToast('Quote slide added.')
      }
    } catch (err) {
      onToast(err.message, 'error')
    } finally {
      setBusy(null)
    }
  }

  const remove = async (slide, index) => {
    if (!window.confirm(`Delete slide ${index + 1}? This cannot be undone.`)) return
    setBusy(slide._id)
    try {
      await api.deleteQuoteSlide(slide._id)
      setSlides(list => list.filter(s => s._id !== slide._id))
      onToast(`Slide ${index + 1} deleted.`)
    } catch (err) {
      onToast(err.message, 'error')
    } finally {
      setBusy(null)
    }
  }

  const full = slides.length >= MAX_SLIDES

  return <section className="panel form-card quote-panel">
    <div className="card-head quote-head">
      <div><h2>Quote slider</h2><p>Images shown in the quote slider on the website and app, in this order. Up to {MAX_SLIDES} slides.</p></div>
      <span className="count-pill">{slides.length} of {MAX_SLIDES}</span>
    </div>
    <div className="card-body">
      <div className="quote-grid">
        {!full && <button type="button" className="quote-add" onClick={() => pick(null)} disabled={busy !== null}>
          <span className="quote-add-icon">{busy === 'add' ? <span className="spinner" /> : <Icon name="image" size={22} />}</span>
          <strong>{busy === 'add' ? 'Uploading…' : 'Choose an image'}</strong>
          <small>Images only · JPG, PNG or WebP · up to 5 MB</small>
        </button>}
        {slides.map((slide, i) => <figure className="quote-slide" key={slide._id}>
          <figcaption>Slide {i + 1}</figcaption>
          <div className="quote-image">
            <img src={slide.image.url} alt={`Quote slide ${i + 1}`} loading="lazy" />
            {busy === slide._id && <span className="quote-busy"><span className="spinner" /></span>}
          </div>
          <div className="quote-actions">
            <button type="button" className="secondary" onClick={() => pick(slide._id)} disabled={busy !== null}><Icon name="edit" size={15} />Replace</button>
            <button type="button" className="danger-button" onClick={() => remove(slide, i)} disabled={busy !== null}><Icon name="trash" size={15} />Delete</button>
          </div>
        </figure>)}
      </div>
      {full && <p className="field-hint">You've reached {MAX_SLIDES} slides. Delete one to add another.</p>}
      <input ref={fileInput} type="file" accept={IMAGE_TYPES.join(',')} hidden onChange={upload} />
    </div>
  </section>
}

export default function Settings({ onToast }) {
  const [state, setState] = useState({ loading: true, error: '', data: null })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let cancelled = false
    api.settings()
      .then(({ data }) => { if (!cancelled) setState({ loading: false, error: '', data }) })
      .catch(err => { if (!cancelled) setState({ loading: false, error: err.message, data: null }) })
    return () => { cancelled = true }
  }, [attempt])

  if (state.loading) return <div className="panel page-state"><span className="spinner" />Loading settings…</div>
  if (state.error) return <div className="panel page-state"><Icon name="alert" size={28} /><h2>Couldn't load settings</h2><p>{state.error}</p><button className="secondary" onClick={() => { setState({ loading: true, error: '', data: null }); setAttempt(a => a + 1) }}>Try again</button></div>

  return <div className="settings-page">
    <ProfileForm initial={state.data.profile ? fromProfile(state.data.profile) : emptyProfile} onToast={onToast} />
    <QuoteSlides initial={state.data.quoteSlides || []} onToast={onToast} />
  </div>
}
