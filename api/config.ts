declare const process: {
  env: {
    APPS_SCRIPT_WEB_APP_URL?: string
    APPS_SCRIPT_API_SECRET?: string
  }
}

const JSON_HEADERS = {
  'Cache-Control': 'no-store',
  'Content-Type': 'application/json; charset=utf-8',
}

const FORBIDDEN_KEYS = new Set(['__proto__', 'proto', 'prototype', 'constructor'])

type ErrorCode = 'SERVER_MISCONFIGURED' | 'UPSTREAM_ERROR' | 'UPSTREAM_TIMEOUT'
type SafeSetting = string | number | boolean
type SafeOption = {
  key: string
  label: string
  order: number
  color: string
  description: string
}
type SafeConfig = {
  version: string
  settings: Record<string, SafeSetting>
  options: Record<string, SafeOption[]>
}

function jsonResponse(body: Record<string, unknown>, status: number) {
  return Response.json(body, { status, headers: JSON_HEADERS })
}

function errorResponse(status: number, code: ErrorCode, allowGet = false) {
  return Response.json(
    { ok: false, error: code },
    {
      status,
      headers: {
        ...JSON_HEADERS,
        ...(allowGet ? { Allow: 'GET' } : {}),
      },
    },
  )
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false
  }

  const prototype = Object.getPrototypeOf(value)
  return prototype === Object.prototype || prototype === null
}

function hasForbiddenKey(value: Record<string, unknown>) {
  return Object.keys(value).some((key) => FORBIDDEN_KEYS.has(key))
}

function getUpstreamConfig() {
  const configuredUrl = process.env.APPS_SCRIPT_WEB_APP_URL
  const apiSecret = process.env.APPS_SCRIPT_API_SECRET

  if (!configuredUrl || !apiSecret) {
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

    return { upstreamUrl, apiSecret }
  } catch {
    return null
  }
}

function selectSettings(value: unknown): Record<string, SafeSetting> | null {
  if (!isPlainObject(value) || hasForbiddenKey(value)) {
    return null
  }

  const settings: Record<string, SafeSetting> = {}

  for (const [key, setting] of Object.entries(value)) {
    if (
      typeof setting !== 'string' &&
      typeof setting !== 'number' &&
      typeof setting !== 'boolean'
    ) {
      return null
    }

    if (typeof setting === 'number' && !Number.isFinite(setting)) {
      return null
    }

    settings[key] = setting
  }

  return settings
}

function selectOptions(value: unknown): Record<string, SafeOption[]> | null {
  if (!isPlainObject(value) || hasForbiddenKey(value)) {
    return null
  }

  const options: Record<string, SafeOption[]> = {}

  for (const [groupName, group] of Object.entries(value)) {
    if (!Array.isArray(group)) {
      return null
    }

    const selectedGroup: SafeOption[] = []

    for (const item of group) {
      if (!isPlainObject(item) || hasForbiddenKey(item)) {
        return null
      }

      const { key, label, order, color, description } = item

      if (
        typeof key !== 'string' ||
        typeof label !== 'string' ||
        typeof order !== 'number' ||
        !Number.isFinite(order) ||
        typeof color !== 'string' ||
        typeof description !== 'string'
      ) {
        return null
      }

      selectedGroup.push({ key, label, order, color, description })
    }

    options[groupName] = selectedGroup
  }

  return options
}

function selectConfigPayload(value: unknown): SafeConfig | null {
  if (!isPlainObject(value) || hasForbiddenKey(value) || value.ok !== true) {
    return null
  }

  const data = value.data

  if (
    !isPlainObject(data) ||
    hasForbiddenKey(data) ||
    typeof data.version !== 'string'
  ) {
    return null
  }

  const settings = selectSettings(data.settings)
  const options = selectOptions(data.options)

  if (!settings || !options) {
    return null
  }

  return { version: data.version, settings, options }
}

export default {
  async fetch(request: Request) {
    if (request.method !== 'GET') {
      return errorResponse(405, 'UPSTREAM_ERROR', true)
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
          action: 'config',
          apiSecret: upstreamConfig.apiSecret,
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

      const config = selectConfigPayload(payload)

      if (!config) {
        return errorResponse(502, 'UPSTREAM_ERROR')
      }

      return jsonResponse(
        {
          ok: true,
          data: {
            settings: config.settings,
            options: config.options,
            version: config.version,
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
