declare const process: {
  env: {
    APPS_SCRIPT_WEB_APP_URL?: string
  }
}

const JSON_HEADERS = {
  'Cache-Control': 'no-store',
  'Content-Type': 'application/json; charset=utf-8',
}

function jsonResponse(
  body: Record<string, unknown>,
  status: number,
  headers: Record<string, string> = {},
) {
  return Response.json(body, {
    status,
    headers: {
      ...JSON_HEADERS,
      ...headers,
    },
  })
}

function errorResponse(
  status: number,
  code: 'SERVER_MISCONFIGURED' | 'UPSTREAM_ERROR' | 'UPSTREAM_TIMEOUT',
  headers?: Record<string, string>,
) {
  return jsonResponse({ ok: false, error: code }, status, headers)
}

function getUpstreamUrl() {
  const configuredUrl = process.env.APPS_SCRIPT_WEB_APP_URL

  if (!configuredUrl) {
    return null
  }

  try {
    const upstreamUrl = new URL(configuredUrl)

    if (
      upstreamUrl.protocol !== 'https:' ||
      upstreamUrl.hostname !== 'script.google.com' ||
      !upstreamUrl.pathname.endsWith('/exec')
    ) {
      return null
    }

    upstreamUrl.searchParams.set('action', 'health')
    return upstreamUrl
  } catch {
    return null
  }
}

function isHealthPayload(
  value: unknown,
): value is {
  ok: true
  service: string
  version: string
  timestamp: string
} {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const payload = value as Record<string, unknown>

  return (
    payload.ok === true &&
    typeof payload.service === 'string' &&
    typeof payload.version === 'string' &&
    typeof payload.timestamp === 'string'
  )
}

export default {
  async fetch(request: Request) {
    if (request.method !== 'GET') {
      return errorResponse(405, 'UPSTREAM_ERROR', { Allow: 'GET' })
    }

    const upstreamUrl = getUpstreamUrl()

    if (!upstreamUrl) {
      return errorResponse(500, 'SERVER_MISCONFIGURED')
    }

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 8_000)

    try {
      const upstreamResponse = await fetch(upstreamUrl, {
        method: 'GET',
        cache: 'no-store',
        signal: controller.signal,
      })

      if (!upstreamResponse.ok) {
        return errorResponse(502, 'UPSTREAM_ERROR')
      }

      let payload: unknown

      try {
        payload = await upstreamResponse.json()
      } catch {
        return errorResponse(502, 'UPSTREAM_ERROR')
      }

      if (!isHealthPayload(payload)) {
        return errorResponse(502, 'UPSTREAM_ERROR')
      }

      return jsonResponse(
        {
          ok: true,
          service: 'AI_UNDERCOVER_PROXY',
          upstream: {
            service: payload.service,
            version: payload.version,
            timestamp: payload.timestamp,
          },
        },
        200,
      )
    } catch {
      if (controller.signal.aborted) {
        return errorResponse(504, 'UPSTREAM_TIMEOUT')
      }

      return errorResponse(502, 'UPSTREAM_ERROR')
    } finally {
      clearTimeout(timeout)
    }
  },
}
