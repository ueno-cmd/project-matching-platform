// Workers API 基盤
import { AuthUtils, authenticateRequest, createAuthResponse } from './utils/auth.js'

export default {
  async fetch(request, env) {
    const url = new URL(request.url)
    
    // Static assets は Cloudflare Vite Plugin が自動処理
    // API リクエストのみここで処理
    if (!url.pathname.startsWith('/api/')) {
      // static assets へのリクエストは Vite plugin に任せる
      return env.ASSETS.fetch(request)
    }
    
    // CORS ヘッダー設定
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
    
    // OPTIONS リクエスト（プリフライト）対応
    if (request.method === 'OPTIONS') {
      return new Response(null, { 
        status: 200, 
        headers: corsHeaders 
      })
    }
    
    try {
      // API ルーティング処理
      const response = await handleApiRequest(request, env)
      
      // CORS ヘッダーを追加
      return new Response(response.body, {
        status: response.status,
        headers: {
          ...Object.fromEntries(response.headers),
          ...corsHeaders
        }
      })
    } catch (error) {
      console.error('API Error:', error)
      return new Response(
        JSON.stringify({
          success: false,
          error: { 
            code: 'INTERNAL_ERROR', 
            message: 'サーバーエラーが発生しました' 
          }
        }),
        { 
          status: 500, 
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders
          } 
        }
      )
    }
  }
}

// API リクエストハンドラー
async function handleApiRequest(request, env) {
  const url = new URL(request.url)
  const path = url.pathname.replace('/api', '')
  const method = request.method
  
  console.log('=== API REQUEST ===')
  console.log('Full URL:', url.href)
  console.log('Pathname:', url.pathname) 
  console.log('Processed path:', path)
  console.log('Method:', method)
  
  // ヘルスチェック API
  if (method === 'GET' && path === '/health') {
    return new Response(
      JSON.stringify({
        success: true,
        message: 'API is healthy',
        timestamp: new Date().toISOString()
      }),
      { 
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }

  // デバッグ用：全ユーザー一覧表示（認証不要）
  if (method === 'GET' && path === '/debug/users') {
    try {
      const result = await env.DB.prepare('SELECT id, email, name, role FROM users').all()
      return new Response(
        JSON.stringify({
          success: true,
          users: result.results || []
        }),
        { 
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    } catch (error) {
      return new Response(
        JSON.stringify({
          success: false,
          error: error.message
        }),
        { 
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }
  }
  
  // プロジェクト一覧取得 API（D1データベース接続）
  if (method === 'GET' && path === '/projects') {
    try {
      const query = `
        SELECT 
          p.id,
          p.title,
          p.description,
          p.category,
          p.status,
          p.team_size,
          p.duration_weeks,
          p.commitment_hours,
          u.name as owner_name,
          COUNT(pp.user_id) as current_members
        FROM projects p
        LEFT JOIN users u ON p.owner_id = u.id
        LEFT JOIN project_participants pp ON p.id = pp.project_id AND pp.status = 'accepted'
        WHERE p.status IN ('recruiting', 'active')
        GROUP BY p.id, u.name
        ORDER BY p.created_at DESC
      `
      
      const result = await env.DB.prepare(query).all()
      
      return new Response(
        JSON.stringify({
          success: true,
          projects: result.results || []
        }),
        { 
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    } catch (error) {
      console.error('Database query error:', error)
      return new Response(
        JSON.stringify({
          success: false,
          error: {
            code: 'DATABASE_ERROR',
            message: 'データベースエラーが発生しました'
          }
        }),
        { 
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }
  }
  
  // ログインAPI
  if (method === 'POST' && path === '/auth/login') {
    try {
      const body = await request.json()
      const { email, password } = body
      
      if (!email || !password) {
        return createAuthResponse(false, null, {
          code: 'VALIDATION_ERROR',
          message: 'メールアドレスとパスワードが必要です'
        }, 400)
      }

      // ユーザー検索
      const userQuery = `
        SELECT id, email, name, password_hash, password_salt, role, status
        FROM users 
        WHERE email = ?
      `
      const userResult = await env.DB.prepare(userQuery).bind(email).first()
      
      if (!userResult) {
        return createAuthResponse(false, null, {
          code: 'AUTH_ERROR',
          message: 'メールアドレスまたはパスワードが正しくありません'
        }, 401)
      }

      if (userResult.status === 'suspended') {
        return createAuthResponse(false, null, {
          code: 'ACCOUNT_SUSPENDED',
          message: 'アカウントが停止されています'
        }, 403)
      }

      // パスワード検証（一時的に平文比較とハッシュ検証の両方対応）
      const auth = new AuthUtils(env.JWT_SECRET || 'dev-secret-key')
      let isValidPassword = false
      
      // まず平文比較を試行（開発用）
      if (password === userResult.password_hash) {
        isValidPassword = true
      } else if (userResult.password_salt) {
        // ハッシュ化されている場合の検証
        isValidPassword = await auth.verifyPassword(password, userResult.password_hash, userResult.password_salt)
      }

      if (!isValidPassword) {
        return createAuthResponse(false, null, {
          code: 'AUTH_ERROR',
          message: 'メールアドレスまたはパスワードが正しくありません'
        }, 401)
      }

      // JWT生成
      const token = await auth.generateToken({
        id: userResult.id,
        email: userResult.email,
        name: userResult.name,
        role: userResult.role
      })

      return createAuthResponse(true, {
        token,
        user: {
          id: userResult.id,
          email: userResult.email,
          name: userResult.name,
          role: userResult.role,
          roles: [userResult.role] // roles配列も追加
        }
      })

    } catch (error) {
      console.error('Login error:', error)
      return createAuthResponse(false, null, {
        code: 'INTERNAL_ERROR',
        message: 'ログイン処理でエラーが発生しました'
      }, 500)
    }
  }

  // ユーザー情報取得API（認証必須）
  if (method === 'GET' && path === '/auth/me') {
    try {
      const user = await authenticateRequest(request, env)
      
      // 最新のユーザー情報を取得
      const userQuery = `
        SELECT id, email, name, role, status
        FROM users 
        WHERE id = ?
      `
      const userResult = await env.DB.prepare(userQuery).bind(user.id).first()
      
      if (!userResult || userResult.status === 'suspended') {
        return createAuthResponse(false, null, {
          code: 'AUTH_ERROR',
          message: '認証が無効です'
        }, 401)
      }

      return createAuthResponse(true, {
        user: {
          id: userResult.id,
          email: userResult.email,
          name: userResult.name,
          role: userResult.role,
          roles: [userResult.role] // roles配列も追加
        }
      })

    } catch (error) {
      return createAuthResponse(false, null, {
        code: 'AUTH_ERROR',
        message: error.message
      }, 401)
    }
  }

  // ユーザー登録API（管理者専用）
  if (method === 'POST' && path === '/auth/register') {
    try {
      // 管理者認証チェック
      const user = await authenticateRequest(request, env)
      
      if (user.role !== 'admin') {
        return createAuthResponse(false, null, {
          code: 'PERMISSION_ERROR',
          message: '管理者権限が必要です'
        }, 403)
      }

      const body = await request.json()
      const { email, password, name, role = 'member' } = body
      
      if (!email || !password || !name) {
        return createAuthResponse(false, null, {
          code: 'VALIDATION_ERROR',
          message: 'メールアドレス、パスワード、名前が必要です'
        }, 400)
      }

      // 有効な役割チェック
      const validRoles = ['admin', 'owner', 'member']
      if (!validRoles.includes(role)) {
        return createAuthResponse(false, null, {
          code: 'VALIDATION_ERROR',
          message: '無効な役割です'
        }, 400)
      }

      // メールアドレス重複チェック
      const existingUser = await env.DB.prepare('SELECT id FROM users WHERE email = ?')
        .bind(email).first()
      
      if (existingUser) {
        return createAuthResponse(false, null, {
          code: 'VALIDATION_ERROR',
          message: 'このメールアドレスは既に登録されています'
        }, 400)
      }

      // パスワードハッシュ化
      const auth = new AuthUtils(env.JWT_SECRET || 'dev-secret-key')
      const { hash, salt } = await auth.hashPassword(password)

      // ユーザー作成
      const insertQuery = `
        INSERT INTO users (email, password_hash, password_salt, name, role, status)
        VALUES (?, ?, ?, ?, ?, 'active')
      `
      
      const result = await env.DB.prepare(insertQuery)
        .bind(email, hash, salt, name, role)
        .run()

      if (!result.success) {
        throw new Error('ユーザー作成に失敗しました')
      }

      return createAuthResponse(true, {
        user: {
          id: result.meta.last_row_id,
          email,
          name,
          role,
          status: 'active'
        }
      })

    } catch (error) {
      console.error('Register error:', error)
      return createAuthResponse(false, null, {
        code: 'REGISTER_ERROR',
        message: error.message || 'ユーザー登録に失敗しました'
      }, 500)
    }
  }

  // 一般ユーザー自己登録API（認証不要）
  if (method === 'POST' && path === '/auth/signup') {
    try {
      const body = await request.json()
      const { email, password, name } = body
      
      if (!email || !password || !name) {
        return createAuthResponse(false, null, {
          code: 'VALIDATION_ERROR',
          message: 'メールアドレス、パスワード、名前が必要です'
        }, 400)
      }

      // パスワード長チェック
      if (password.length < 8) {
        return createAuthResponse(false, null, {
          code: 'VALIDATION_ERROR',
          message: 'パスワードは8文字以上で入力してください'
        }, 400)
      }

      // メールアドレス重複チェック
      const existingUser = await env.DB.prepare('SELECT id FROM users WHERE email = ?')
        .bind(email).first()
      
      if (existingUser) {
        return createAuthResponse(false, null, {
          code: 'VALIDATION_ERROR',
          message: 'このメールアドレスは既に登録されています'
        }, 400)
      }

      // パスワードハッシュ化
      const auth = new AuthUtils(env.JWT_SECRET || 'dev-secret-key')
      const { hash, salt } = await auth.hashPassword(password)

      // ユーザー作成（自動的にmemberとして登録）
      const insertQuery = `
        INSERT INTO users (email, password_hash, password_salt, name, role, status)
        VALUES (?, ?, ?, ?, 'member', 'active')
      `
      
      const result = await env.DB.prepare(insertQuery)
        .bind(email, hash, salt, name)
        .run()

      if (!result.success) {
        throw new Error('ユーザー作成に失敗しました')
      }

      // 作成されたユーザー情報を取得
      const newUser = {
        id: result.meta.last_row_id,
        email,
        name,
        role: 'member',
        status: 'active'
      }

      // JWTトークン生成（自動ログイン）
      const token = await auth.generateToken({
        id: newUser.id,
        email: newUser.email,
        role: newUser.role
      })

      return createAuthResponse(true, {
        user: newUser,
        token
      })

    } catch (error) {
      console.error('Signup error:', error)
      return createAuthResponse(false, null, {
        code: 'SIGNUP_ERROR',
        message: error.message || 'ユーザー登録に失敗しました'
      }, 500)
    }
  }

  // プロフィール取得API（認証必須）
  if (method === 'GET' && path === '/users/profile') {
    try {
      const user = await authenticateRequest(request, env)
      
      // ユーザーのプロフィール情報を取得
      const profileQuery = `
        SELECT 
          id, email, name, role, status,
          strengths_finder, sixteen_types, bio, 
          skills, experience_years, availability,
          created_at, updated_at
        FROM users 
        WHERE id = ?
      `
      const profileResult = await env.DB.prepare(profileQuery).bind(user.id).first()
      
      if (!profileResult) {
        return createAuthResponse(false, null, {
          code: 'NOT_FOUND',
          message: 'ユーザープロフィールが見つかりません'
        }, 404)
      }

      // JSON文字列のパース
      const profile = {
        id: profileResult.id,
        email: profileResult.email,
        name: profileResult.name,
        role: profileResult.role,
        status: profileResult.status,
        strengths_finder: profileResult.strengths_finder ? JSON.parse(profileResult.strengths_finder) : [],
        sixteen_types: profileResult.sixteen_types ? JSON.parse(profileResult.sixteen_types) : null,
        bio: profileResult.bio || '',
        skills: profileResult.skills ? JSON.parse(profileResult.skills) : [],
        experience_years: profileResult.experience_years || 0,
        availability: profileResult.availability ? JSON.parse(profileResult.availability) : {},
        created_at: profileResult.created_at,
        updated_at: profileResult.updated_at
      }

      return createAuthResponse(true, { profile })

    } catch (error) {
      console.error('Profile fetch error:', error)
      return createAuthResponse(false, null, {
        code: 'SERVER_ERROR',
        message: 'プロフィール取得中にエラーが発生しました'
      }, 500)
    }
  }

  // プロフィール更新API（認証必須）
  if (method === 'PUT' && path === '/users/profile') {
    try {
      const user = await authenticateRequest(request, env)
      const body = await request.json()
      
      const { 
        name, bio, strengths_finder, sixteen_types, 
        skills, experience_years, availability 
      } = body

      // バリデーション
      if (!name || name.trim().length < 2) {
        return createAuthResponse(false, null, {
          code: 'VALIDATION_ERROR',
          message: '名前は2文字以上で入力してください'
        }, 400)
      }

      if (strengths_finder && (!Array.isArray(strengths_finder) || strengths_finder.length !== 5)) {
        return createAuthResponse(false, null, {
          code: 'VALIDATION_ERROR',
          message: 'StrengthsFinder資質は5つ選択してください'
        }, 400)
      }

      if (skills && !Array.isArray(skills)) {
        return createAuthResponse(false, null, {
          code: 'VALIDATION_ERROR',
          message: 'スキルは配列形式で入力してください'
        }, 400)
      }

      // プロフィール更新
      const updateQuery = `
        UPDATE users 
        SET 
          name = ?,
          bio = ?,
          strengths_finder = ?,
          sixteen_types = ?,
          skills = ?,
          experience_years = ?,
          availability = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `
      
      await env.DB.prepare(updateQuery).bind(
        name.trim(),
        bio || '',
        strengths_finder ? JSON.stringify(strengths_finder) : null,
        sixteen_types ? JSON.stringify(sixteen_types) : null,
        skills ? JSON.stringify(skills) : null,
        experience_years || 0,
        availability ? JSON.stringify(availability) : null,
        user.id
      ).run()

      // 更新後のプロフィールを取得
      const updatedProfileQuery = `
        SELECT 
          id, email, name, role, status,
          strengths_finder, sixteen_types, bio, 
          skills, experience_years, availability,
          updated_at
        FROM users 
        WHERE id = ?
      `
      const updatedProfile = await env.DB.prepare(updatedProfileQuery).bind(user.id).first()

      const profile = {
        id: updatedProfile.id,
        email: updatedProfile.email,
        name: updatedProfile.name,
        role: updatedProfile.role,
        status: updatedProfile.status,
        strengths_finder: updatedProfile.strengths_finder ? JSON.parse(updatedProfile.strengths_finder) : [],
        sixteen_types: updatedProfile.sixteen_types ? JSON.parse(updatedProfile.sixteen_types) : null,
        bio: updatedProfile.bio || '',
        skills: updatedProfile.skills ? JSON.parse(updatedProfile.skills) : [],
        experience_years: updatedProfile.experience_years || 0,
        availability: updatedProfile.availability ? JSON.parse(updatedProfile.availability) : {},
        updated_at: updatedProfile.updated_at
      }

      return createAuthResponse(true, { 
        profile,
        message: 'プロフィールを更新しました'
      })

    } catch (error) {
      console.error('Profile update error:', error)
      return createAuthResponse(false, null, {
        code: 'SERVER_ERROR',
        message: 'プロフィール更新中にエラーが発生しました'
      }, 500)
    }
  }

  // プロジェクト作成API
  if (method === 'POST' && path === '/projects') {
    try {
      const user = await authenticateRequest(request, env)
      const body = await request.json()
      
      const { title, description, category, required_skills, preferred_types, preferred_strengths, team_size, duration_weeks, commitment_hours } = body
      
      if (!title || !description || !category) {
        return createAuthResponse(false, null, {
          code: 'VALIDATION_ERROR',
          message: 'タイトル、説明、カテゴリは必須です'
        }, 400)
      }

      const insertQuery = `
        INSERT INTO projects (
          owner_id, title, description, category, status,
          required_skills, preferred_types, preferred_strengths,
          team_size, duration_weeks, commitment_hours
        ) VALUES (?, ?, ?, ?, 'recruiting', ?, ?, ?, ?, ?, ?)
      `
      
      const result = await env.DB.prepare(insertQuery).bind(
        user.id, title, description, category,
        JSON.stringify(required_skills || []),
        JSON.stringify(preferred_types || []),
        JSON.stringify(preferred_strengths || []),
        team_size || 3, duration_weeks || 8, commitment_hours || 10
      ).run()

      return createAuthResponse(true, {
        project: {
          id: result.meta.last_row_id,
          title, description, category, status: 'recruiting',
          owner_id: user.id
        }
      })

    } catch (error) {
      console.error('Project creation error:', error)
      return createAuthResponse(false, null, {
        code: 'INTERNAL_ERROR',
        message: 'プロジェクトの作成でエラーが発生しました'
      }, 500)
    }
  }

  // プロジェクト編集API
  if (method === 'PUT' && path.startsWith('/projects/')) {
    try {
      const user = await authenticateRequest(request, env)
      const projectId = path.split('/')[2]
      const body = await request.json()
      
      // プロジェクト所有者確認
      const ownerCheck = await env.DB.prepare('SELECT owner_id FROM projects WHERE id = ?').bind(projectId).first()
      if (!ownerCheck || (ownerCheck.owner_id !== user.id && user.role !== 'admin')) {
        return createAuthResponse(false, null, {
          code: 'FORBIDDEN',
          message: 'このプロジェクトを編集する権限がありません'
        }, 403)
      }

      const { title, description, category, status, required_skills, preferred_types, preferred_strengths, team_size, duration_weeks, commitment_hours } = body
      
      const updateQuery = `
        UPDATE projects SET
          title = ?, description = ?, category = ?, status = ?,
          required_skills = ?, preferred_types = ?, preferred_strengths = ?,
          team_size = ?, duration_weeks = ?, commitment_hours = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `
      
      await env.DB.prepare(updateQuery).bind(
        title, description, category, status,
        JSON.stringify(required_skills || []),
        JSON.stringify(preferred_types || []),
        JSON.stringify(preferred_strengths || []),
        team_size, duration_weeks, commitment_hours,
        projectId
      ).run()

      return createAuthResponse(true, { message: 'プロジェクトが更新されました' })

    } catch (error) {
      console.error('Project update error:', error)
      return createAuthResponse(false, null, {
        code: 'INTERNAL_ERROR',
        message: 'プロジェクトの更新でエラーが発生しました'
      }, 500)
    }
  }

  // プロジェクト削除API
  if (method === 'DELETE' && path.startsWith('/projects/')) {
    try {
      const user = await authenticateRequest(request, env)
      const projectId = path.split('/')[2]
      
      // プロジェクト所有者確認
      const ownerCheck = await env.DB.prepare('SELECT owner_id FROM projects WHERE id = ?').bind(projectId).first()
      if (!ownerCheck || (ownerCheck.owner_id !== user.id && user.role !== 'admin')) {
        return createAuthResponse(false, null, {
          code: 'FORBIDDEN',
          message: 'このプロジェクトを削除する権限がありません'
        }, 403)
      }

      // 関連データも削除（participants, notifications）
      await env.DB.batch([
        env.DB.prepare('DELETE FROM project_participants WHERE project_id = ?').bind(projectId),
        env.DB.prepare('DELETE FROM notifications WHERE metadata LIKE ?').bind(`%"project_id": ${projectId}%`),
        env.DB.prepare('DELETE FROM projects WHERE id = ?').bind(projectId)
      ])

      return createAuthResponse(true, { message: 'プロジェクトが削除されました' })

    } catch (error) {
      console.error('Project deletion error:', error)
      return createAuthResponse(false, null, {
        code: 'INTERNAL_ERROR',
        message: 'プロジェクトの削除でエラーが発生しました'
      }, 500)
    }
  }

  // ユーザー作成API（管理者用）
  if (method === 'POST' && path === '/users') {
    try {
      const user = await authenticateRequest(request, env)
      
      // 管理者権限チェック
      if (user.role !== 'admin') {
        return createAuthResponse(false, null, {
          code: 'FORBIDDEN',
          message: '管理者権限が必要です'
        }, 403)
      }

      const body = await request.json()
      const { email, name, role, password } = body
      
      if (!email || !name || !role || !password) {
        return createAuthResponse(false, null, {
          code: 'VALIDATION_ERROR',
          message: 'メールアドレス、名前、ロール、パスワードは必須です'
        }, 400)
      }

      // メールアドレス重複チェック
      const existingUser = await env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(email).first()
      if (existingUser) {
        return createAuthResponse(false, null, {
          code: 'VALIDATION_ERROR',
          message: 'このメールアドレスは既に使用されています'
        }, 400)
      }

      const insertQuery = `
        INSERT INTO users (email, password_hash, name, role, status) 
        VALUES (?, ?, ?, ?, 'active')
      `
      
      const result = await env.DB.prepare(insertQuery).bind(email, password, name, role).run()

      return createAuthResponse(true, {
        user: {
          id: result.meta.last_row_id,
          email, name, role, status: 'active'
        }
      })

    } catch (error) {
      console.error('User creation error:', error)
      return createAuthResponse(false, null, {
        code: 'INTERNAL_ERROR',
        message: 'ユーザーの作成でエラーが発生しました'
      }, 500)
    }
  }

  // パスワード変更API（管理者用） - より具体的な条件を先にチェック
  if (method === 'PUT' && path.startsWith('/users/') && path.endsWith('/password')) {
    try {
      const user = await authenticateRequest(request, env)
      const targetUserId = path.split('/')[2]
      
      // 管理者権限チェック
      if (user.role !== 'admin') {
        return createAuthResponse(false, null, {
          code: 'FORBIDDEN',
          message: '管理者権限が必要です'
        }, 403)
      }

      const body = await request.json()
      const { password } = body
      
      console.log('1. Password received:', password ? 'YES' : 'NO', 'Length:', password ? password.length : 'N/A')
      
      if (!password || password.length < 8) {
        return createAuthResponse(false, null, {
          code: 'VALIDATION_ERROR',
          message: 'パスワードは8文字以上で入力してください'
        }, 400)
      }

      console.log('2. Looking for user with ID:', targetUserId)
      
      // 対象ユーザー確認
      const targetUser = await env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(targetUserId).first()
      
      if (!targetUser) {
        return createAuthResponse(false, null, {
          code: 'NOT_FOUND',
          message: 'ユーザーが見つかりません'
        }, 404)
      }
      
      console.log('3. User found:', targetUser.name)

      // パスワードハッシュ化
      console.log('4. Creating AuthUtils instance...')
      let hash, salt
      try {
        const auth = new AuthUtils(env.JWT_SECRET || 'dev-secret-key')
        console.log('5. AuthUtils created successfully')
        
        console.log('6. About to hash password...')
        const hashResult = await auth.hashPassword(password)
        console.log('7. Hash result received:', hashResult ? 'SUCCESS' : 'FAILED')
        
        hash = hashResult.hash
        salt = hashResult.salt
        console.log('8. Extracted hash and salt:', {
          hash: hash ? 'Generated' : 'undefined',
          salt: salt ? 'Generated' : 'undefined'
        })
      } catch (hashError) {
        console.error('Password hashing error:', hashError)
        throw hashError
      }

      // パスワード更新
      console.log('9. About to update database with hash and salt...')
      const updateQuery = `
        UPDATE users SET
          password_hash = ?, password_salt = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `
      
      await env.DB.prepare(updateQuery).bind(hash, salt, targetUserId).run()
      console.log('10. Database update completed successfully')

      return createAuthResponse(true, { 
        message: `${targetUser.name}のパスワードを変更しました` 
      })

    } catch (error) {
      console.error('Password change error:', error)
      return createAuthResponse(false, null, {
        code: 'INTERNAL_ERROR',
        message: 'パスワード変更でエラーが発生しました'
      }, 500)
    }
  }

  // ユーザー編集API（管理者用） - パスワード変更以外の場合
  if (method === 'PUT' && path.startsWith('/users/') && !path.endsWith('/password')) {
    try {
      const user = await authenticateRequest(request, env)
      const targetUserId = path.split('/')[2]
      
      // 管理者権限チェック
      if (user.role !== 'admin') {
        return createAuthResponse(false, null, {
          code: 'FORBIDDEN',
          message: '管理者権限が必要です'
        }, 403)
      }

      const body = await request.json()
      const { email, name, role, status, password } = body
      
      let updateQuery = `
        UPDATE users SET
          email = ?, name = ?, role = ?, status = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `
      let bindings = [email, name, role, status, targetUserId]

      // パスワードが提供された場合は更新
      if (password) {
        updateQuery = `
          UPDATE users SET
            email = ?, name = ?, role = ?, status = ?, password_hash = ?,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `
        bindings = [email, name, role, status, password, targetUserId]
      }
      
      await env.DB.prepare(updateQuery).bind(...bindings).run()

      return createAuthResponse(true, { message: 'ユーザーが更新されました' })

    } catch (error) {
      console.error('User update error:', error)
      return createAuthResponse(false, null, {
        code: 'INTERNAL_ERROR',
        message: 'ユーザーの更新でエラーが発生しました'
      }, 500)
    }
  }

  // ユーザー削除API（管理者用）
  if (method === 'DELETE' && path.startsWith('/users/')) {
    try {
      const user = await authenticateRequest(request, env)
      const targetUserId = path.split('/')[2]
      
      // 管理者権限チェック
      if (user.role !== 'admin') {
        return createAuthResponse(false, null, {
          code: 'FORBIDDEN',
          message: '管理者権限が必要です'
        }, 403)
      }

      // 自分自身は削除できない
      if (user.id === parseInt(targetUserId)) {
        return createAuthResponse(false, null, {
          code: 'VALIDATION_ERROR',
          message: '自分自身を削除することはできません'
        }, 400)
      }

      // 関連データも削除
      await env.DB.batch([
        env.DB.prepare('DELETE FROM project_participants WHERE user_id = ?').bind(targetUserId),
        env.DB.prepare('DELETE FROM notifications WHERE user_id = ?').bind(targetUserId),
        env.DB.prepare('UPDATE projects SET owner_id = NULL WHERE owner_id = ?').bind(targetUserId),
        env.DB.prepare('DELETE FROM users WHERE id = ?').bind(targetUserId)
      ])

      return createAuthResponse(true, { message: 'ユーザーが削除されました' })

    } catch (error) {
      console.error('User deletion error:', error)
      return createAuthResponse(false, null, {
        code: 'INTERNAL_ERROR',
        message: 'ユーザーの削除でエラーが発生しました'
      }, 500)
    }
  }


  // パスワードリセットAPI（管理者用）
  if (method === 'POST' && path.startsWith('/users/') && path.endsWith('/reset-password')) {
    try {
      const user = await authenticateRequest(request, env)
      const targetUserId = path.split('/')[2]
      
      // 管理者権限チェック
      if (user.role !== 'admin') {
        return createAuthResponse(false, null, {
          code: 'FORBIDDEN',
          message: '管理者権限が必要です'
        }, 403)
      }

      // 対象ユーザー存在確認
      const targetUser = await env.DB.prepare('SELECT id, email, name FROM users WHERE id = ?')
        .bind(targetUserId).first()
      
      if (!targetUser) {
        return createAuthResponse(false, null, {
          code: 'NOT_FOUND',
          message: 'ユーザーが見つかりません'
        }, 404)
      }

      // 一時パスワード生成（8文字の英数字）
      const tempPassword = Math.random().toString(36).slice(-8)
      
      // パスワードハッシュ化
      const auth = new AuthUtils(env.JWT_SECRET || 'dev-secret-key')
      const { hash, salt } = await auth.hashPassword(tempPassword)

      // パスワード更新
      const updateQuery = `
        UPDATE users SET
          password_hash = ?, password_salt = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `
      
      await env.DB.prepare(updateQuery).bind(hash, salt, targetUserId).run()

      return createAuthResponse(true, { 
        message: `${targetUser.name}のパスワードをリセットしました`,
        tempPassword: tempPassword, // 実装時は安全な方法で通知
        userEmail: targetUser.email
      })

    } catch (error) {
      console.error('Password reset error:', error)
      return createAuthResponse(false, null, {
        code: 'INTERNAL_ERROR',
        message: 'パスワードリセットでエラーが発生しました'
      }, 500)
    }
  }

  // プロジェクト応募API（簡易版）
  if (method === 'POST' && path === '/applications') {
    console.log('=== APPLICATION API CALLED ===')
    console.log('Method:', method, 'Path:', path)
    try {
      const user = await authenticateRequest(request, env)
      console.log('Authenticated user:', user)
      const body = await request.json()
      console.log('Request body:', body)
      
      const { project_id, role_in_project, message } = body
      
      if (!project_id || !role_in_project) {
        return createAuthResponse(false, null, {
          code: 'VALIDATION_ERROR',
          message: 'プロジェクトIDと役割は必須です'
        }, 400)
      }

      // プロジェクト存在確認
      const project = await env.DB.prepare('SELECT id, owner_id, status FROM projects WHERE id = ?').bind(project_id).first()
      if (!project) {
        return createAuthResponse(false, null, {
          code: 'NOT_FOUND',
          message: 'プロジェクトが見つかりません'
        }, 404)
      }

      if (project.status !== 'recruiting') {
        return createAuthResponse(false, null, {
          code: 'VALIDATION_ERROR',
          message: 'このプロジェクトは現在募集していません'
        }, 400)
      }

      // 重複申請チェック
      const existingApplication = await env.DB.prepare(
        'SELECT id FROM project_participants WHERE project_id = ? AND user_id = ?'
      ).bind(project_id, user.id).first()
      
      if (existingApplication) {
        return createAuthResponse(false, null, {
          code: 'VALIDATION_ERROR',
          message: '既にこのプロジェクトに申請済みです'
        }, 400)
      }

      const insertQuery = `
        INSERT INTO project_participants (
          project_id, user_id, status, role_in_project
        ) VALUES (?, ?, 'accepted', ?)
      `
      
      console.log('Inserting participant:', { project_id, user_id: user.id, role_in_project, status: 'accepted' })
      
      const insertResult = await env.DB.prepare(insertQuery).bind(
        project_id, user.id, role_in_project
      ).run()
      
      console.log('Insert result:', insertResult)

      return createAuthResponse(true, { message: 'プロジェクトに参加しました' })

    } catch (error) {
      console.error('Application creation error:', error)
      return createAuthResponse(false, null, {
        code: 'INTERNAL_ERROR',
        message: 'プロジェクト申請でエラーが発生しました'
      }, 500)
    }
  }

  // プロジェクト参加申請API（既存版・/projects/{id}/apply）
  if (method === 'POST' && path.startsWith('/projects/') && path.endsWith('/apply')) {
    try {
      const user = await authenticateRequest(request, env)
      const projectId = path.split('/')[2]
      const body = await request.json()
      
      const { role_in_project, message } = body
      
      if (!role_in_project) {
        return createAuthResponse(false, null, {
          code: 'VALIDATION_ERROR',
          message: 'プロジェクトでの役割は必須です'
        }, 400)
      }

      // プロジェクト存在確認
      const project = await env.DB.prepare('SELECT id, owner_id, status FROM projects WHERE id = ?').bind(projectId).first()
      if (!project) {
        return createAuthResponse(false, null, {
          code: 'NOT_FOUND',
          message: 'プロジェクトが見つかりません'
        }, 404)
      }

      if (project.status !== 'recruiting') {
        return createAuthResponse(false, null, {
          code: 'VALIDATION_ERROR',
          message: 'このプロジェクトは現在募集していません'
        }, 400)
      }

      // 重複申請チェック
      const existingApplication = await env.DB.prepare(
        'SELECT id FROM project_participants WHERE project_id = ? AND user_id = ?'
      ).bind(projectId, user.id).first()
      
      if (existingApplication) {
        return createAuthResponse(false, null, {
          code: 'VALIDATION_ERROR',
          message: '既にこのプロジェクトに申請済みです'
        }, 400)
      }

      const insertQuery = `
        INSERT INTO project_participants (
          project_id, user_id, status, role_in_project
        ) VALUES (?, ?, 'accepted', ?)
      `
      
      await env.DB.prepare(insertQuery).bind(
        projectId, user.id, role_in_project
      ).run()

      return createAuthResponse(true, { message: 'プロジェクトに参加しました' })

    } catch (error) {
      console.error('Project application error:', error)
      return createAuthResponse(false, null, {
        code: 'INTERNAL_ERROR',
        message: 'プロジェクト申請でエラーが発生しました'
      }, 500)
    }
  }

  // プロジェクト参加申請承認/拒否API
  if (method === 'PUT' && path.includes('/applications/')) {
    try {
      const user = await authenticateRequest(request, env)
      const pathParts = path.split('/')
      const projectId = pathParts[2]
      const applicationId = pathParts[4]
      const body = await request.json()
      
      const { status, response_message } = body // status: 'accepted' | 'rejected'
      
      if (!['accepted', 'rejected'].includes(status)) {
        return createAuthResponse(false, null, {
          code: 'VALIDATION_ERROR',
          message: 'ステータスは accepted または rejected である必要があります'
        }, 400)
      }

      // プロジェクト所有者確認
      const ownerCheck = await env.DB.prepare('SELECT owner_id FROM projects WHERE id = ?').bind(projectId).first()
      if (!ownerCheck || (ownerCheck.owner_id !== user.id && user.role !== 'admin')) {
        return createAuthResponse(false, null, {
          code: 'FORBIDDEN',
          message: 'この申請を処理する権限がありません'
        }, 403)
      }

      const updateQuery = `
        UPDATE project_participants SET
          status = ?, response_message = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND project_id = ?
      `
      
      await env.DB.prepare(updateQuery).bind(
        status, response_message || '', applicationId, projectId
      ).run()

      return createAuthResponse(true, { 
        message: status === 'accepted' ? '申請を承認しました' : '申請を拒否しました' 
      })

    } catch (error) {
      console.error('Application response error:', error)
      return createAuthResponse(false, null, {
        code: 'INTERNAL_ERROR',
        message: '申請処理でエラーが発生しました'
      }, 500)
    }
  }

  // プロジェクト参加者一覧取得API
  if (method === 'GET' && path.startsWith('/projects/') && path.endsWith('/participants')) {
    try {
      await authenticateRequest(request, env) // 認証のみ、ユーザー情報は未使用
      const projectId = path.split('/')[2]
      
      const query = `
        SELECT 
          pp.id,
          pp.status,
          pp.role_in_project,
          pp.joined_at,
          u.id as user_id,
          u.name as user_name,
          u.email as user_email
        FROM project_participants pp
        JOIN users u ON pp.user_id = u.id
        WHERE pp.project_id = ?
        ORDER BY pp.joined_at DESC
      `
      
      const result = await env.DB.prepare(query).bind(projectId).all()
      
      return createAuthResponse(true, {
        participants: result.results || []
      })

    } catch (error) {
      console.error('Participants query error:', error)
      return createAuthResponse(false, null, {
        code: 'INTERNAL_ERROR',
        message: '参加者データの取得でエラーが発生しました'
      }, 500)
    }
  }

  // 自分が作成したプロジェクト一覧取得API
  if (method === 'GET' && path === '/projects/my-owned') {
    try {
      const user = await authenticateRequest(request, env)
      
      const query = `
        SELECT 
          p.id,
          p.title,
          p.description,
          p.category,
          p.status,
          p.team_size,
          p.duration_weeks,
          p.commitment_hours,
          p.created_at,
          COUNT(CASE WHEN pp.status = 'accepted' THEN 1 END) as current_members,
          COUNT(CASE WHEN pp.status = 'applied' THEN 1 END) as pending_applications
        FROM projects p
        LEFT JOIN project_participants pp ON p.id = pp.project_id AND pp.status IN ('accepted', 'applied')
        WHERE p.owner_id = ?
        GROUP BY p.id
        ORDER BY p.created_at DESC
      `
      
      const result = await env.DB.prepare(query).bind(user.id).all()
      
      return createAuthResponse(true, {
        projects: result.results || []
      })

    } catch (error) {
      console.error('My owned projects query error:', error)
      return createAuthResponse(false, null, {
        code: 'INTERNAL_ERROR',
        message: '作成プロジェクトの取得でエラーが発生しました'
      }, 500)
    }
  }

  // 自分が参加中のプロジェクト一覧取得API
  if (method === 'GET' && path === '/projects/my-joined') {
    try {
      const user = await authenticateRequest(request, env)
      
      const query = `
        SELECT 
          p.id,
          p.title,
          p.description,
          p.category,
          p.status,
          p.team_size,
          p.duration_weeks,
          p.commitment_hours,
          u.name as owner_name,
          pp.role_in_project,
          pp.status as participation_status,
          pp.joined_at as joined_at,
          (SELECT COUNT(*) FROM project_participants pp2 
           WHERE pp2.project_id = p.id AND pp2.status = 'accepted') as current_members
        FROM project_participants pp
        JOIN projects p ON pp.project_id = p.id
        JOIN users u ON p.owner_id = u.id
        WHERE pp.user_id = ? AND pp.status = 'accepted'
        ORDER BY pp.joined_at DESC
      `
      
      const result = await env.DB.prepare(query).bind(user.id).all()
      
      return createAuthResponse(true, {
        projects: result.results || []
      })

    } catch (error) {
      console.error('My joined projects query error:', error)
      return createAuthResponse(false, null, {
        code: 'INTERNAL_ERROR',
        message: '参加プロジェクトの取得でエラーが発生しました'
      }, 500)
    }
  }

  // ユーザー一覧取得API（管理者用）
  if (method === 'GET' && path === '/users') {
    try {
      const user = await authenticateRequest(request, env)
      
      // 管理者権限チェック
      if (user.role !== 'admin') {
        return createAuthResponse(false, null, {
          code: 'FORBIDDEN',
          message: '管理者権限が必要です'
        }, 403)
      }

      const query = `
        SELECT 
          id, 
          email, 
          name, 
          role, 
          status, 
          created_at,
          (SELECT COUNT(*) FROM project_participants WHERE user_id = users.id AND status = 'accepted') as joined_projects,
          (SELECT COUNT(*) FROM projects WHERE owner_id = users.id) as owned_projects
        FROM users 
        ORDER BY created_at DESC
      `
      
      const result = await env.DB.prepare(query).all()
      
      const formattedUsers = result.results.map(user => ({
        id: user.id,
        name: user.name,
        email: user.email,
        roles: [user.role],
        joinedProjects: user.joined_projects,
        ownedProjects: user.owned_projects,
        status: user.status,
        lastActive: '最近'
      }))
      
      return new Response(
        JSON.stringify({
          success: true,
          users: formattedUsers
        }),
        { 
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    } catch (error) {
      console.error('Users query error:', error)
      return new Response(
        JSON.stringify({
          success: false,
          error: {
            code: 'DATABASE_ERROR',
            message: 'ユーザーデータの取得でエラーが発生しました'
          }
        }),
        { 
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }
  }

  // 未定義のエンドポイント
  return new Response(
    JSON.stringify({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: `エンドポイント ${method} ${path} が見つかりません`
      }
    }),
    { 
      status: 404,
      headers: { 'Content-Type': 'application/json' }
    }
  )
}