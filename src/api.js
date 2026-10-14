// Thin client for the Samarth backend. VITE_API_URL (see .env) is the backend's full /api/v1 URL.
// Set it to /api/v1 to go through the Vite dev proxy to a local backend instead (see vite.config.js).
export const API_URL = (import.meta.env.VITE_API_URL || '/api/v1').replace(/\/$/, '')
const REMOTE = /^https?:\/\//.test(API_URL)
const UNREACHABLE = REMOTE
  ? `Can't reach the Samarth backend at ${new URL(API_URL).host}. If it was asleep it can take up to a minute to wake. Wait a moment and try again.`
  : "Can't reach the Samarth backend. Make sure it is running (npm start in samarth-backend) and that its terminal shows \"Samarth backend running on port 5000\"."
const TOKEN_KEY = 'samarth-admin-token'

export const getToken = () => { try { return localStorage.getItem(TOKEN_KEY) } catch { return null } }
export const setToken = token => { try { token ? localStorage.setItem(TOKEN_KEY, token) : localStorage.removeItem(TOKEN_KEY) } catch { /* storage unavailable */ } }

// Lets the app react when the session expires mid-use.
const listeners = new Set()
export const onUnauthorized = fn => { listeners.add(fn); return () => listeners.delete(fn) }

export class ApiError extends Error {
  constructor(message, status) { super(message); this.status = status }
}

async function request(path, { method = 'GET', body, query, auth = true } = {}) {
  const url = new URL(API_URL + path, window.location.origin)
  for (const [key, value] of Object.entries(query || {})) {
    if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, value)
  }
  const headers = {}
  const token = getToken()
  if (auth && token) headers.Authorization = `Bearer ${token}`
  let payload = body
  if (body && !(body instanceof FormData)) { headers['Content-Type'] = 'application/json'; payload = JSON.stringify(body) }

  let response
  try {
    response = await fetch(url, { method, headers, body: payload })
  } catch {
    throw new ApiError(UNREACHABLE, 0)
  }
  const json = await response.json().catch(() => null)
  // The dev proxy answers with a non-JSON 5xx when the backend is down.
  if (json === null && response.status >= 500) throw new ApiError(UNREACHABLE, 0)
  if (json === null && !response.ok) throw new ApiError(`Request failed (${response.status})`, response.status)
  if (json === null) return {}
  if (response.status === 401 && auth) { setToken(null); listeners.forEach(fn => fn()) }
  if (!response.ok || json.success === false) throw new ApiError(json.message || `Request failed (${response.status})`, response.status)
  return json
}

export const api = {
  login: (email, password) => request('/admin/login', { method: 'POST', body: { email, password }, auth: false }),
  me: () => request('/admin/me'),

  products: query => request('/products/admin/get-all', { query }),
  product: id => request(`/products/admin/get-by-id/${id}`),
  createProduct: form => request('/products/add', { method: 'POST', body: form }),
  updateProduct: (id, form) => request(`/products/update/${id}`, { method: 'PUT', body: form }),
  deleteProduct: id => request(`/products/delete/${id}`, { method: 'DELETE' }),

  categories: query => request('/categories/admin/get-all', { query: { limit: 100, ...query } }),
  createCategory: body => request('/categories/add', { method: 'POST', body }),
  updateCategory: (id, body) => request(`/categories/update/${id}`, { method: 'PUT', body }),
  deleteCategory: id => request(`/categories/delete/${id}`, { method: 'DELETE' }),

  broadcasts: query => request('/broadcasts/admin/get-all', { query }),
  createBroadcast: form => request('/broadcasts/add', { method: 'POST', body: form }),
  updateBroadcast: (id, form) => request(`/broadcasts/update/${id}`, { method: 'PUT', body: form }),
  deleteBroadcast: id => request(`/broadcasts/delete/${id}`, { method: 'DELETE' }),

  distributors: query => request('/distributors/admin/get-all', { query }),
  createDistributor: form => request('/distributors/add', { method: 'POST', body: form }),
  updateDistributor: (id, form) => request(`/distributors/update/${id}`, { method: 'PUT', body: form }),
  deleteDistributor: id => request(`/distributors/delete/${id}`, { method: 'DELETE' }),
}
