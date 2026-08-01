declare const process: {
  env: {
    APPS_SCRIPT_WEB_APP_URL?: string
    APPS_SCRIPT_API_SECRET?: string
    SESSION_ADMIN_API_SECRET?: string
  }
}

const JSON_HEADERS = {
  'Cache-Control': 'no-store',
  'Content-Type': 'application/json; charset=utf-8',
}

type ErrorCode =
  | 'INVALID_REQUEST'
  | 'METHOD_NOT_ALLOWED'
  | 'SERVER_MISCONFIGURED'
  | 'UNAUTHORIZED'
  | 'UPSTREAM_ERROR'
  | 'UPSTREAM_TIMEOUT'

type CreateSessionInput = {
  title: string
  maxTeams: number
}

type Session = {
  sessionId: string
  joinCode: string
  title: string
  status: string
  currentPhase: string
  currentRound: number
  maxTeams: number
  createdAt: string
}

function jsonResponse(
  body: Record<string, unknown>,
  status: number,
  headers: Record<string, string> = {},
) {
  return Response.json(body, {
    status,
    headers: { ...JSON_HEADERS, ...headers },
  })
}

function errorResponse(
  status: number,
  code: ErrorCode,
  headers?: Record<string, string>,
) {
  return jsonResponse({ ok: false, error: code }, status, headers)
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false
  }

  const prototype = Object.getPrototypeOf(value)
  return prototype === Object.prototype || prototype === null
}

function getServerConfig() {
  const configuredUrl = process.env.APPS_SCRIPT_WEB_APP_URL
  const appsScriptApiSecret = process.env.APPS_SCRIPT_API_SECRET
  const sessionAdminApiSecret = process.env.SESSION_ADMIN_API_SECRET

  if (!configuredUrl || !appsScriptApiSecret || !sessionAdminApiSecret) {
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

    return { upstreamUrl, appsScriptApiSecret, sessionAdminApiSecret }
  } catch {
    return null
  }
}

function selectInput(value: unknown): CreateSessionInput | null {
  if (!isPlainObject(value)) {
    return null
  }

  const title = typeof value.title === 'string' ? value.title.trim() : ''
  const maxTeams = value.maxTeams

  if (
    !title ||
    typeof maxTeams !== 'number' ||
    !Number.isInteger(maxTeams) ||
    maxTeams < 3 ||
    maxTeams > 7
  ) {
    return null
  }

  return { title, maxTeams }
}

function selectSessionPayload(value: unknown): Session | null {
  if (!isPlainObject(value) || value.ok !== true || !isPlainObject(value.data)) {
    return null
  }

  const data = value.data
  const {
    sessionId,
    joinCode,
    title,
    status,
    currentPhase,
    currentRound,
    maxTeams,
    createdAt,
  } = data

  if (
    typeof sessionId !== 'string' ||
    !sessionId ||
    typeof joinCode !== 'string' ||
    !/^[A-F0-9]{6}$/.test(joinCode) ||
    typeof title !== 'string' ||
    !title.trim() ||
    status !== 'active' ||
    currentPhase !== 'lobby' ||
    currentRound !== 0 ||
    typeof maxTeams !== 'number' ||
    !Number.isInteger(maxTeams) ||
    maxTeams < 3 ||
    maxTeams > 7 ||
    typeof createdAt !== 'string' ||
    !Number.isFinite(Date.parse(createdAt))
  ) {
    return null
  }

  return {
    sessionId,
    joinCode,
    title,
    status,
    currentPhase,
    currentRound,
    maxTeams,
    createdAt,
  }
}

export default {
  async fetch(request: Request) {
    if (request.method !== 'POST') {
      return errorResponse(405, 'METHOD_NOT_ALLOWED', { Allow: 'POST' })
    }

    const serverConfig = getServerConfig()

    if (!serverConfig) {
      return errorResponse(500, 'SERVER_MISCONFIGURED')
    }

    if (
      request.headers.get('authorization') !==
      `Bearer ${serverConfig.sessionAdminApiSecret}`
    ) {
      return errorResponse(401, 'UNAUTHORIZED')
    }

    let requestBody: unknown

    try {
      requestBody = await request.json()
    } catch {
      return errorResponse(400, 'INVALID_REQUEST')
    }

    const input = selectInput(requestBody)

    if (!input) {
      return errorResponse(400, 'INVALID_REQUEST')
    }

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 8_000)

    try {
      const upstreamResponse = await fetch(serverConfig.upstreamUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'session.create',
          apiSecret: serverConfig.appsScriptApiSecret,
          data: input,
        }),
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

      const session = selectSessionPayload(payload)

      if (
        !session ||
        session.title !== input.title ||
        session.maxTeams !== input.maxTeams
      ) {
        return errorResponse(502, 'UPSTREAM_ERROR')
      }

      return jsonResponse({ ok: true, data: session }, 201)
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
