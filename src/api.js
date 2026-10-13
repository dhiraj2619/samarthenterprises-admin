// Thin client for the Samarth backend. In development, /api is proxied to the backend by Vite
// (see vite.config.js). For a deployed panel, set VITE_API_URL to the backend's full /api/v1 URL.
export const API_URL = (import.meta.env.VITE_API_URL || '/api/v1').replace(/\/$/, '')
const UNREACHABLE = "Can't reach the Samarth backend. Make sure it is running (npm start in samarth-backend) and that its terminal shows \"Samarth backend running on port 5000\"."
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

  referrals: query => request('/referrals/admin/get-all', { query }),
  referralSummary: () => request('/referrals/admin/summary'),
  createReferral: body => request('/referrals/admin/add', { method: 'POST', body }),
  updateReferral: (id, body) => request(`/referrals/update/${id}`, { method: 'PUT', body }),
}
