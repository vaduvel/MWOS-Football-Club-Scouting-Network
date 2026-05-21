type NetlifyHandlerResponse = {
  statusCode?: number
  headers?: Record<string, string>
  body?: string
}

type NetlifyHandler = (event: any, context?: any) => Promise<NetlifyHandlerResponse>

function normalizeHeaders(headers: Record<string, string | string[] | undefined>) {
  return Object.fromEntries(
    Object.entries(headers).map(([key, value]) => [
      key,
      Array.isArray(value) ? value.join(', ') : value ?? '',
    ]),
  )
}

function buildRawBody(body: unknown) {
  if (body == null) {
    return ''
  }

  if (typeof body === 'string') {
    return body
  }

  if (Buffer.isBuffer(body)) {
    return body.toString('utf8')
  }

  return JSON.stringify(body)
}

function toNetlifyEvent(req: any) {
  const host = req.headers['x-forwarded-host'] || req.headers.host || 'localhost'
  const protocol = req.headers['x-forwarded-proto'] || 'https'
  const rawUrl = new URL(req.url || '/', `${protocol}://${host}`)

  return {
    httpMethod: req.method || 'GET',
    headers: normalizeHeaders(req.headers || {}),
    body: buildRawBody(req.body),
    rawUrl: rawUrl.toString(),
    path: rawUrl.pathname,
    queryStringParameters: Object.fromEntries(rawUrl.searchParams.entries()),
    isBase64Encoded: false,
  }
}

export async function serveNetlifyHandler(req: any, res: any, handler: NetlifyHandler) {
  const response = await handler(toNetlifyEvent(req), {})

  if (response?.headers) {
    for (const [key, value] of Object.entries(response.headers)) {
      res.setHeader(key, value)
    }
  }

  res.status(response?.statusCode || 200).send(response?.body || '')
}

export async function serveFetchResponse(
  res: any,
  factory: () => Promise<Response>,
) {
  const response = await factory()

  response.headers.forEach((value, key) => {
    res.setHeader(key, value)
  })

  const text = await response.text()
  res.status(response.status || 200).send(text)
}
