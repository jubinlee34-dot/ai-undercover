declare const process: {
  env: {
    APPS_SCRIPT_DB_WEB_APP_URL?: string
    APPS_SCRIPT_DB_API_SECRET?: string
    SESSION_ADMIN_API_SECRET?: string
  }
}

const JSON_HEADERS = {
  'Cache-Control': 'no-store',
  'Content-Type': 'application/json; charset=utf-8',
}

type ErrorCode =
  | 'INVALID_JOIN_CODE'
  | 'INVALID_REQUEST'
  | 'METHOD_NOT_ALLOWED'
  | 'SERVER_MISCONFIGURED'
  | 'SESSION_NOT_FOUND'
  | 'UNAUTHORIZED'
  | 'UPSTREAM_ERROR'
  | 'UPSTREAM_TIMEOUT'

type CreateSessionInput = {
  title: string
  maxTeams: number
}

type PublicSession = {
  sessionId: string
  joinCode: string
  title: string
  status: string
  currentPhase: string
  currentRound: number
  maxTeams: number
}

type CreatedSession = PublicSession & {
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

function getUpstreamConfig() {
  const configuredUrl = process.env.APPS_SCRIPT_DB_WEB_APP_URL
  const appsScriptApiSecret = process.env.APPS_SCRIPT_DB_API_SECRET

  if (!configuredUrl || !appsScriptApiSecret) {
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

    return { upstreamUrl, appsScriptApiSecret }
  } catch {
    return null
  }
}

function getSessionAdminSecret() {
  return process.env.SESSION_ADMIN_API_SECRET || null
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

function selectPublicSessionData(value: unknown): PublicSession | null {
  if (!isPlainObject(value)) {
    return null
  }

  const {
    sessionId,
    joinCode,
    title,
    status,
    currentPhase,
    currentRound,
    maxTeams,
  } = value

  if (
    typeof sessionId !== 'string' ||
    !sessionId ||
    typeof joinCode !== 'string' ||
    !/^[A-F0-9]{6}$/.test(joinCode) ||
    typeof title !== 'string' ||
    !title.trim() ||
    typeof status !== 'string' ||
    !status ||
    typeof currentPhase !== 'string' ||
    !currentPhase ||
    typeof currentRound !== 'number' ||
    !Number.isInteger(currentRound) ||
    currentRound < 0 ||
    currentRound > 2 ||
    typeof maxTeams !== 'number' ||
    !Number.isInteger(maxTeams) ||
    maxTeams < 3 ||
    maxTeams > 7
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
  }
}

function selectCreatedSessionPayload(value: unknown): CreatedSession | null {
  if (!isPlainObject(value) || value.ok !== true || !isPlainObject(value.data)) {
    return null
  }

  const session = selectPublicSessionData(value.data)
  const createdAt = value.data.createdAt

  if (
    !session ||
    session.status !== 'active' ||
    session.currentPhase !== 'lobby' ||
    session.currentRound !== 0 ||
    typeof createdAt !== 'string' ||
    !Number.isFinite(Date.parse(createdAt))
  ) {
    return null
  }

  return {
    ...session,
    createdAt,
  }
}

async function getPublicSession(request: Request) {
  const joinCode = new URL(request.url).searchParams
    .get('joinCode')
    ?.trim()
    .toUpperCase()

  if (!joinCode || !/^[A-F0-9]{6}$/.test(joinCode)) {
    return errorResponse(400, 'INVALID_JOIN_CODE')
  }

  const upstreamConfig = getUpstreamConfig()

  if (!upstreamConfig) {
    return errorResponse(500, 'SERVER_MISCONFIGURED')
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 8_000)

  try {
    const upstreamResponse = await fetch(upstreamConfig.upstreamUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'session.getPublic',
        apiSecret: upstreamConfig.appsScriptApiSecret,
        data: { joinCode },
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

    if (
      isPlainObject(payload) &&
      payload.ok === false &&
      payload.error === 'SESSION_NOT_FOUND'
    ) {
      return errorResponse(404, 'SESSION_NOT_FOUND')
    }

    if (
      !isPlainObject(payload) ||
      payload.ok !== true ||
      !isPlainObject(payload.data)
    ) {
      return errorResponse(502, 'UPSTREAM_ERROR')
    }

    const session = selectPublicSessionData(payload.data)

    if (!session || session.joinCode !== joinCode) {
      return errorResponse(502, 'UPSTREAM_ERROR')
    }

    return jsonResponse({ ok: true, data: session }, 200)
  } catch {
    if (controller.signal.aborted) {
      return errorResponse(504, 'UPSTREAM_TIMEOUT')
    }

    return errorResponse(502, 'UPSTREAM_ERROR')
  } finally {
    clearTimeout(timeout)
  }
}

export default {
  async fetch(request: Request) {
    if (request.method === 'GET') {
      return getPublicSession(request)
    }

    if (request.method !== 'POST') {
      return errorResponse(405, 'METHOD_NOT_ALLOWED', { Allow: 'GET, POST' })
    }

    const upstreamConfig = getUpstreamConfig()
    const sessionAdminSecret = getSessionAdminSecret()

    if (!upstreamConfig || !sessionAdminSecret) {
      return errorResponse(500, 'SERVER_MISCONFIGURED')
    }

    if (
      request.headers.get('authorization') !==
      `Bearer ${sessionAdminSecret}`
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
      const upstreamResponse = await fetch(upstreamConfig.upstreamUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'session.create',
          apiSecret: upstreamConfig.appsScriptApiSecret,
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

      const session = selectCreatedSessionPayload(payload)

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
