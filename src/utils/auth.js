// 認証システム基盤
// JWT生成・検証、パスワードハッシュ化

// 基本設定
const JWT_ALGORITHM = 'HS256'
const JWT_EXPIRES_IN = '24h' // 24時間

// JWT関連のユーティリティ
export class AuthUtils {
  constructor(secret) {
    this.secret = secret
  }

  // パスワードハッシュ化（SHA-256 + Salt）
  async hashPassword(password, salt = null) {
    // Saltが指定されていない場合は新しく生成
    if (!salt) {
      salt = crypto.getRandomValues(new Uint8Array(16))
      salt = Array.from(salt, byte => byte.toString(16).padStart(2, '0')).join('')
    }
    
    const encoder = new TextEncoder()
    const data = encoder.encode(password + salt)
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
    
    return {
      hash: hashHex,
      salt: salt
    }
  }

  // パスワード検証
  async verifyPassword(password, storedHash, salt) {
    const { hash } = await this.hashPassword(password, salt)
    return hash === storedHash
  }

  // JWT生成
  async generateToken(payload) {
    const header = {
      alg: JWT_ALGORITHM,
      typ: 'JWT'
    }

    const now = Math.floor(Date.now() / 1000)
    const tokenPayload = {
      ...payload,
      iat: now,
      exp: now + (24 * 60 * 60) // 24時間後
    }

    // Base64URL エンコード
    const headerB64 = this.base64URLEncode(JSON.stringify(header))
    const payloadB64 = this.base64URLEncode(JSON.stringify(tokenPayload))
    
    // 署名生成
    const signature = await this.sign(`${headerB64}.${payloadB64}`)
    
    return `${headerB64}.${payloadB64}.${signature}`
  }

  // JWT検証・デコード
  async verifyToken(token) {
    try {
      const [headerB64, payloadB64, signature] = token.split('.')
      
      if (!headerB64 || !payloadB64 || !signature) {
        throw new Error('Invalid token format')
      }

      // 署名検証
      const expectedSignature = await this.sign(`${headerB64}.${payloadB64}`)
      if (signature !== expectedSignature) {
        throw new Error('Invalid signature')
      }

      // ペイロードデコード
      const payload = JSON.parse(this.base64URLDecode(payloadB64))
      
      // 有効期限チェック
      const now = Math.floor(Date.now() / 1000)
      if (payload.exp && payload.exp < now) {
        throw new Error('Token expired')
      }

      return payload
    } catch (error) {
      throw new Error(`Token verification failed: ${error.message}`)
    }
  }

  // HMAC-SHA256署名生成
  async sign(data) {
    const encoder = new TextEncoder()
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(this.secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    )
    
    const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(data))
    const signatureArray = Array.from(new Uint8Array(signature))
    return this.base64URLEncode(String.fromCharCode(...signatureArray))
  }

  // Base64URL エンコード（Cloudflare Workers対応）
  base64URLEncode(str) {
    // 文字列を直接btoa()に渡す（日本語対応）
    const base64 = btoa(unescape(encodeURIComponent(str)))
    return base64
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '')
  }

  // Base64URL デコード（Cloudflare Workers対応）
  base64URLDecode(str) {
    str += '='.repeat((4 - str.length % 4) % 4)
    str = str.replace(/-/g, '+').replace(/_/g, '/')
    // 日本語対応でデコード
    return decodeURIComponent(escape(atob(str)))
  }
}

// 認証ミドルウェア
export async function authenticateRequest(request, env) {
  const authHeader = request.headers.get('Authorization')
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('Authorization header missing or invalid')
  }

  const token = authHeader.substring(7) // "Bearer " を除去
  const auth = new AuthUtils(env.JWT_SECRET || 'dev-secret-key')
  
  try {
    const payload = await auth.verifyToken(token)
    return payload
  } catch (error) {
    throw new Error(`Authentication failed: ${error.message}`)
  }
}

// レスポンス生成ヘルパー
export function createAuthResponse(success, data = null, error = null, status = 200) {
  const response = { success }
  
  if (data) response.data = data
  if (error) response.error = error
  
  return new Response(JSON.stringify(response), {
    status,
    headers: { 'Content-Type': 'application/json' }
  })
}