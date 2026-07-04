// life-in-weeks 同步后端：GitHub OAuth 登录 + 带版本号的快照同步
// 零依赖，Web 标准 API（fetch / crypto.subtle / D1）

const enc = new TextEncoder()

// ---------- base64url / HMAC 签名 ----------

function b64url(buf) {
  const bytes = buf instanceof ArrayBuffer ? new Uint8Array(buf) : buf
  let s = ''
  for (const b of bytes) s += String.fromCharCode(b)
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function b64urlDecode(str) {
  const s = str.replace(/-/g, '+').replace(/_/g, '/')
  const bin = atob(s)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return bytes
}

async function hmacKey(secret, usages) {
  return crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, usages)
}

// sign(payload) -> "base64url(json).base64url(hmac)"
async function sign(payload, secret) {
  const body = b64url(enc.encode(JSON.stringify(payload)))
  const sig = await crypto.subtle.sign('HMAC', await hmacKey(secret, ['sign']), enc.encode(body))
  return `${body}.${b64url(sig)}`
}

// verify -> payload | null（签名或有效期不对都返回 null）
async function verify(token, secret) {
  try {
    const [body, sig] = String(token).split('.')
    if (!body || !sig) return null
    const ok = await crypto.subtle.verify(
      'HMAC',
      await hmacKey(secret, ['verify']),
      b64urlDecode(sig),
      enc.encode(body),
    )
    if (!ok) return null
    const payload = JSON.parse(new TextDecoder().decode(b64urlDecode(body)))
    if (!payload.exp || payload.exp < Date.now() / 1000) return null
    return payload
  } catch {
    return null
  }
}

// ---------- CORS ----------

function allowedOrigins(env) {
  return (env.ALLOWED_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean)
}

function corsHeaders(request, env) {
  const origin = request.headers.get('Origin')
  if (!origin || !allowedOrigins(env).includes(origin)) return {}
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET,PUT,OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization,Content-Type',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  }
}

function json(data, status, cors) {
  return new Response(JSON.stringify(data), {
    status: status || 200,
    headers: { 'Content-Type': 'application/json', ...cors },
  })
}

// OAuth 回跳地址必须落在白名单来源上，防止 token 被重定向到别处
function validReturnBase(o, env) {
  try {
    const u = new URL(o)
    return allowedOrigins(env).includes(u.origin) ? u.href : null
  } catch {
    return null
  }
}

// ---------- 用户与会话 ----------

async function upsertUser(env, ghUser) {
  const row = await env.DB.prepare(
    `INSERT INTO users (github_id, login, name, avatar_url) VALUES (?1, ?2, ?3, ?4)
     ON CONFLICT(github_id) DO UPDATE SET login = ?2, name = ?3, avatar_url = ?4
     RETURNING id`,
  )
    .bind(ghUser.id, ghUser.login, ghUser.name || null, ghUser.avatar_url || null)
    .first()
  return row.id
}

async function sessionToken(env, userId) {
  const THIRTY_DAYS = 30 * 24 * 3600
  return sign({ u: userId, exp: Math.floor(Date.now() / 1000) + THIRTY_DAYS }, env.SESSION_SECRET)
}

async function authUserId(request, env) {
  const m = (request.headers.get('Authorization') || '').match(/^Bearer (.+)$/)
  if (!m) return null
  const payload = await verify(m[1], env.SESSION_SECRET)
  return payload ? payload.u : null
}

// ---------- GitHub OAuth ----------

async function githubStart(url, env) {
  const o = validReturnBase(url.searchParams.get('o'), env)
  if (!o) return new Response('invalid return url', { status: 400 })
  const state = await sign(
    { o, n: b64url(crypto.getRandomValues(new Uint8Array(12))), exp: Math.floor(Date.now() / 1000) + 600 },
    env.SESSION_SECRET,
  )
  const gh = new URL('https://github.com/login/oauth/authorize')
  gh.searchParams.set('client_id', env.GITHUB_CLIENT_ID)
  gh.searchParams.set('redirect_uri', `${url.origin}/auth/github/callback`)
  gh.searchParams.set('state', state)
  return Response.redirect(gh.href, 302)
}

async function githubCallback(url, env) {
  const statePayload = await verify(url.searchParams.get('state'), env.SESSION_SECRET)
  const o = statePayload && validReturnBase(statePayload.o, env)
  if (!o) return new Response('invalid state', { status: 400 })
  const fail = (code) => Response.redirect(`${o}#sync_error=${code}`, 302)

  const code = url.searchParams.get('code')
  if (!code) return fail('no_code')

  const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ client_id: env.GITHUB_CLIENT_ID, client_secret: env.GITHUB_CLIENT_SECRET, code }),
  })
  const tokenData = await tokenRes.json().catch(() => ({}))
  if (!tokenData.access_token) return fail('token_exchange')

  const userRes = await fetch('https://api.github.com/user', {
    headers: {
      Authorization: `Bearer ${tokenData.access_token}`,
      Accept: 'application/vnd.github+json',
      'User-Agent': 'life-in-weeks-sync',
    },
  })
  if (!userRes.ok) return fail('user_fetch')
  const ghUser = await userRes.json()

  const userId = await upsertUser(env, ghUser)
  const token = await sessionToken(env, userId)
  return Response.redirect(`${o}#sync_token=${encodeURIComponent(token)}`, 302)
}

// 本地开发专用（.dev.vars 里 DEV_LOGIN=1 才开启）：跳过 GitHub，直接给假用户发 token
async function devLogin(url, env) {
  if (env.DEV_LOGIN !== '1') return new Response('not found', { status: 404 })
  const o = validReturnBase(url.searchParams.get('o') || 'http://localhost:5174/', env)
  if (!o) return new Response('invalid return url', { status: 400 })
  const name = url.searchParams.get('u') || 'dev'
  let hash = 0
  for (const c of name) hash = (hash * 31 + c.charCodeAt(0)) | 0
  const userId = await upsertUser(env, { id: -Math.abs(hash) - 1, login: name, name: `Dev ${name}` })
  const token = await sessionToken(env, userId)
  return Response.redirect(`${o}#sync_token=${encodeURIComponent(token)}`, 302)
}

// ---------- 同步 ----------

const MAX_DATA_BYTES = 600_000

async function getSync(userId, env, cors) {
  const row = await env.DB.prepare('SELECT version, data, updated_at FROM snapshots WHERE user_id = ?1')
    .bind(userId)
    .first()
  if (!row) return json({ version: 0, data: null, updatedAt: null }, 200, cors)
  return json({ version: row.version, data: JSON.parse(row.data), updatedAt: row.updated_at }, 200, cors)
}

async function putSync(request, userId, env, cors) {
  let body
  try {
    body = await request.json()
  } catch {
    return json({ error: 'bad_json' }, 400, cors)
  }
  const baseVersion = Number(body.baseVersion) || 0
  if (!body.data || typeof body.data !== 'object') return json({ error: 'bad_data' }, 400, cors)
  const dataStr = JSON.stringify(body.data)
  if (dataStr.length > MAX_DATA_BYTES) return json({ error: 'too_large' }, 413, cors)

  // 乐观锁：版本号对得上才写入（首次无快照时直接插入 version 1）
  const row = await env.DB.prepare(
    `INSERT INTO snapshots (user_id, version, data, updated_at) VALUES (?1, 1, ?2, datetime('now'))
     ON CONFLICT(user_id) DO UPDATE SET version = snapshots.version + 1, data = ?2, updated_at = datetime('now')
     WHERE snapshots.version = ?3
     RETURNING version, updated_at`,
  )
    .bind(userId, dataStr, baseVersion)
    .first()

  if (row) return json({ version: row.version, updatedAt: row.updated_at }, 200, cors)

  // 版本冲突：另一台设备先写入了 — 把服务器当前数据还给客户端去合并
  const current = await env.DB.prepare('SELECT version, data, updated_at FROM snapshots WHERE user_id = ?1')
    .bind(userId)
    .first()
  return json(
    { error: 'conflict', version: current.version, data: JSON.parse(current.data), updatedAt: current.updated_at },
    409,
    cors,
  )
}

async function getMe(userId, env, cors) {
  const row = await env.DB.prepare('SELECT login, name, avatar_url FROM users WHERE id = ?1').bind(userId).first()
  if (!row) return json({ error: 'unauthorized' }, 401, cors)
  return json({ login: row.login, name: row.name, avatarUrl: row.avatar_url }, 200, cors)
}

// ---------- 路由 ----------

export default {
  async fetch(request, env) {
    const url = new URL(request.url)
    const cors = corsHeaders(request, env)

    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors })

    try {
      if (request.method === 'GET' && url.pathname === '/') {
        return json({ ok: true, service: 'life-in-weeks-api' }, 200, cors)
      }
      if (request.method === 'GET' && url.pathname === '/auth/github/start') return githubStart(url, env)
      if (request.method === 'GET' && url.pathname === '/auth/github/callback') return githubCallback(url, env)
      if (request.method === 'GET' && url.pathname === '/auth/dev/login') return devLogin(url, env)

      // 以下都需要登录
      const userId = await authUserId(request, env)
      if (!userId) return json({ error: 'unauthorized' }, 401, cors)

      if (request.method === 'GET' && url.pathname === '/me') return getMe(userId, env, cors)
      if (request.method === 'GET' && url.pathname === '/sync') return getSync(userId, env, cors)
      if (request.method === 'PUT' && url.pathname === '/sync') return putSync(request, userId, env, cors)

      return json({ error: 'not_found' }, 404, cors)
    } catch (e) {
      return json({ error: 'internal', message: String(e && e.message) }, 500, cors)
    }
  },
}
