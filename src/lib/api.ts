const PROD_PROXY = '/api/eventmaker'
const DEV_PROXY = '/api/eventmaker-dev'
const DEV_APP_PROXY = '/api/eventmaker-app-dev'

type EventmakerApiBase = 'api' | 'app'

interface EventmakerRequestInit extends RequestInit {
  apiBase?: EventmakerApiBase
}

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly details?: {
      status?: number
      contentType?: string | null
      bodyPreview?: string
      retryAfter?: string | null
      url?: string
    },
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

function getToken(): string {
  const token = sessionStorage.getItem('em_token')
  if (!token) throw new Error('No auth token in session')
  return token
}

export async function apiFetch<T>(path: string, options?: EventmakerRequestInit): Promise<T> {
  const token = getToken()
  const { apiBase = 'api', ...requestOptions } = options ?? {}
  const url = buildApiUrl(path, token, apiBase)
  let res: Response

  try {
    res = await fetch(url, requestOptions)
  } catch (err) {
    console.error('Eventmaker API fetch failed', { url, error: err })
    throw new ApiError('API request failed before response', {
      url,
      bodyPreview: err instanceof Error ? err.message : 'Unknown fetch error',
    })
  }

  return readJsonResponse<T>(res, url)
}

export interface EventmakerUser {
  id: string
  email: string
  first_name: string
  last_name: string
}

export async function verifyToken(token: string): Promise<EventmakerUser> {
  const url = buildApiUrl('/me.json', token)
  const res = await fetch(url)
  return readJsonResponse<EventmakerUser>(res, url)
}

function buildApiUrl(path: string, token: string, apiBase: EventmakerApiBase = 'api'): string {
  const [pathname, query = ''] = path.split('?')
  const params = new URLSearchParams(query)
  const orderedParams = new URLSearchParams()

  orderedParams.set('auth_token', token)
  params.forEach((value, key) => {
    orderedParams.set(key, value)
  })

  if (import.meta.env.DEV) {
    const proxy = apiBase === 'app' ? DEV_APP_PROXY : DEV_PROXY
    return `${proxy}${pathname}?${orderedParams.toString()}`
  }

  orderedParams.set('path', pathname.replace(/^\/+/, ''))
  if (apiBase === 'app') orderedParams.set('api_base', 'app')
  return `${PROD_PROXY}?${orderedParams.toString()}`
}

async function readJsonResponse<T>(res: Response, url: string): Promise<T> {
  const contentType = res.headers.get('content-type')
  const body = await res.text()

  if (!res.ok) {
    throw new ApiError(`API error ${res.status}`, {
      status: res.status,
      contentType,
      bodyPreview: body.slice(0, 240),
      retryAfter: res.headers.get('retry-after'),
      url,
    })
  }

  try {
    return JSON.parse(body) as T
  } catch {
    throw new ApiError('API response is not valid JSON', {
      status: res.status,
      contentType,
      bodyPreview: body.slice(0, 240),
      url,
    })
  }
}
