const EVENTMAKER_BASE = 'https://app.eventmaker.io/api/v1'

export default async function handler(req, res) {
  const path = Array.isArray(req.query.path) ? req.query.path.join('/') : req.query.path
  const params = new URLSearchParams()

  Object.entries(req.query).forEach(([key, value]) => {
    if (key === 'path') return
    if (Array.isArray(value)) {
      value.forEach((item) => params.append(key, item))
      return
    }
    if (value !== undefined) params.set(key, value)
  })

  const url = `${EVENTMAKER_BASE}/${path}${params.toString() ? `?${params.toString()}` : ''}`
  const method = req.method || 'GET'

  try {
    const upstream = await fetch(url, {
      method,
      headers: {
        accept: req.headers.accept || 'application/json',
        'content-type': req.headers['content-type'] || 'application/json',
      },
      body: method === 'GET' || method === 'HEAD' ? undefined : JSON.stringify(req.body ?? {}),
      redirect: 'follow',
    })

    const body = await upstream.text()
    const contentType = upstream.headers.get('content-type')

    if (contentType) res.setHeader('content-type', contentType)
    res.status(upstream.status).send(body)
  } catch (error) {
    res.status(502).json({
      error: 'Eventmaker proxy failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}
