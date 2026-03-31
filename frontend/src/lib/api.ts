const API_URL = process.env.API_URL || 'http://localhost:4000'

type RequestOptions = {
  method?: string
  body?: unknown
  token?: string
  queueToken?: string
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, token, queueToken } = options

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }

  if (token) headers['Authorization'] = `Bearer ${token}`
  if (queueToken) headers['X-Queue-Token'] = queueToken

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })

  const data = await res.json()

  if (!res.ok) {
    throw new Error(data.message || '요청 실패')
  }

  return data
}

export const api = {
  get: <T>(path: string, token?: string, queueToken?: string) =>
    request<T>(path, { token, queueToken }),
  post: <T>(path: string, body: unknown, token?: string, queueToken?: string) =>
    request<T>(path, { method: 'POST', body, token, queueToken }),
  patch: <T>(path: string, body: unknown, token?: string) =>
    request<T>(path, { method: 'PATCH', body, token }),
  delete: <T>(path: string, token?: string) =>
    request<T>(path, { method: 'DELETE', token }),
}
