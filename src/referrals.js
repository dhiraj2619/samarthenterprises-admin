// A referral is one click on "Buy now" or "Bulk purchase" that sent a visitor to nohar.in.
// Sales happen on Nohar; the order value is recorded here afterwards.

export const REFERRAL_TYPES = { buy: 'Buy now', bulk: 'Bulk purchase' }
export const REFERRAL_STATUSES = ['REDIRECTED', 'CONVERTED', 'NOT_CONVERTED']
export const STATUS_LABELS = { REDIRECTED: 'Awaiting update', CONVERTED: 'Converted', NOT_CONVERTED: 'Not converted' }

export const inr = value => `₹${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
export const formatWhen = iso => new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })
