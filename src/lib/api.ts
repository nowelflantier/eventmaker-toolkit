const BASE = '/eventmaker-api'

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

export async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const token = getToken()
  const url = buildApiUrl(path, token)
  let res: Response

  try {
    res = await fetch(url, options)
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

function buildApiUrl(path: string, token: string): string {
  const [pathname, query = ''] = path.split('?')
  const params = new URLSearchParams(query)
  const orderedParams = new URLSearchParams()

  orderedParams.set('auth_token', token)
  params.forEach((value, key) => {
    orderedParams.set(key, value)
  })

  return `${BASE}${pathname}?${orderedParams.toString()}`
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
