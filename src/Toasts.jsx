import Icon from './Icon.jsx'

export function ToastStack({ toasts, onDismiss }) {
  return <div className="toast-stack" aria-live="polite">
    {toasts.map(t => <div key={t.id} className={`toast ${t.type}`} role={t.type === 'error' ? 'alert' : 'status'}>
      <span className="toast-icon"><Icon name={t.type === 'error' ? 'alert' : 'check'} size={16} /></span>
      <span className="toast-message">{t.message}</span>
      <button className="icon-button" aria-label="Dismiss notification" onClick={() => onDismiss(t.id)}><Icon name="close" size={15} /></button>
    </div>)}
  </div>
}
