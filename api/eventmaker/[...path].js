import https from 'node:https'

const EVENTMAKER_HOST = 'app.eventmaker.io'
const EVENTMAKER_PREFIX = '/api/v1'

export default async function handler(req, res) {
  try {
    const targetPath = buildTargetPath(req)
    const body = await readRequestBody(req)

    const upstream = await requestEventmaker({
      method: req.method || 'GET',
      path: targetPath,
      body,
      contentType: req.headers['content-type'],
      accept: req.headers.accept,
    })

    if (upstream.contentType) {
      res.setHeader('content-type', upstream.contentType)
    }

    res.status(upstream.statusCode).send(upstream.body)
  } catch (error) {
    res.status(502).json({
      error: 'Eventmaker proxy failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}

function buildTargetPath(req) {
  const query = req.query || {}
  const rawPath = Array.isArray(query.path) ? query.path.join('/') : query.path
  const path = String(rawPath || '').replace(/^\/+/, '')
  const params = new URLSearchParams()

  Object.entries(query).forEach(([key, value]) => {
    if (key === 'path') return
    if (Array.isArray(value)) {
      value.forEach((item) => params.append(key, String(item)))
      return
    }
    if (value !== undefined) params.set(key, String(value))
  })

  return `${EVENTMAKER_PREFIX}/${path}${params.toString() ? `?${params.toString()}` : ''}`
}

function readRequestBody(req) {
  if (req.method === 'GET' || req.method === 'HEAD') return Promise.resolve(null)
  if (req.body && typeof req.body === 'object') return Promise.resolve(JSON.stringify(req.body))
  if (typeof req.body === 'string') return Promise.resolve(req.body)

  return new Promise((resolve, reject) => {
    let body = ''
    req.on('data', (chunk) => {
      body += chunk
    })
    req.on('end', () => resolve(body || null))
    req.on('error', reject)
  })
}

function requestEventmaker({ method, path, body, contentType, accept }) {
  return new Promise((resolve, reject) => {
    const request = https.request(
      {
        hostname: EVENTMAKER_HOST,
        path,
        method,
        headers: {
          accept: accept || 'application/json',
          ...(body ? { 'content-type': contentType || 'application/json' } : {}),
        },
      },
      (response) => {
        let responseBody = ''
        response.setEncoding('utf8')
        response.on('data', (chunk) => {
          responseBody += chunk
        })
        response.on('end', () => {
          resolve({
            statusCode: response.statusCode || 502,
            contentType: response.headers['content-type'],
            body: responseBody,
          })
        })
      },
    )

    request.on('error', reject)
    if (body) request.write(body)
    request.end()
  })
}
