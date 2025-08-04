-- プロジェクトマッチングプラットフォーム - 初期スキーマ

-- ユーザーテーブル
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT CHECK(role IN ('admin', 'owner', 'member')) DEFAULT 'member',
  status TEXT CHECK(status IN ('active', 'suspended')) DEFAULT 'active',
  
  -- 診断結果フィールド（JSON形式で保存）
  strengths_finder TEXT,  -- JSON: ["Strategic", "Learner", "Achiever", "Focus", "Relator"]
  sixteen_types TEXT,     -- JSON: {"type": "ENFP", "description": "..."}
  
  -- プロフィール情報
  bio TEXT,
  skills TEXT,            -- JSON: ["React", "Node.js", "Python"]
  experience_years INTEGER DEFAULT 0,
  availability TEXT,      -- JSON: {"hours_per_week": 10, "timezone": "Asia/Tokyo"}
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- プロジェクトテーブル
CREATE TABLE projects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  owner_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  status TEXT CHECK(status IN ('draft', 'recruiting', 'active', 'completed', 'cancelled')) DEFAULT 'draft',
  
  -- 募集要項
  required_skills TEXT,    -- JSON: ["React", "Node.js"]
  preferred_types TEXT,    -- JSON: ["ENFP", "INTJ"]
  preferred_strengths TEXT, -- JSON: ["Strategic", "Learner"]
  team_size INTEGER DEFAULT 1,
  duration_weeks INTEGER,
  commitment_hours INTEGER, -- 週あたりの必要時間
  
  -- メタデータ
  reported BOOLEAN DEFAULT FALSE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (owner_id) REFERENCES users(id)
);

-- プロジェクト参加テーブル
CREATE TABLE project_participants (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  status TEXT CHECK(status IN ('applied', 'accepted', 'rejected', 'left')) DEFAULT 'applied',
  match_score REAL, -- マッチング度（0-100）
  role_in_project TEXT,
  joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (project_id) REFERENCES projects(id),
  FOREIGN KEY (user_id) REFERENCES users(id),
  UNIQUE(project_id, user_id)
);

-- マッチング履歴テーブル（分析用）
CREATE TABLE matching_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  project_id INTEGER NOT NULL,
  match_score REAL NOT NULL,
  algorithm_version TEXT DEFAULT 'v1.0',
  factors TEXT, -- JSON: マッチング要因の詳細
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (project_id) REFERENCES projects(id)
);

-- 通知テーブル
CREATE TABLE notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  type TEXT NOT NULL, -- 'project_match', 'application_status', 'project_update'
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  read BOOLEAN DEFAULT FALSE,
  metadata TEXT, -- JSON: 関連データ
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- インデックス作成
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_projects_owner ON projects(owner_id);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_project_participants_project ON project_participants(project_id);
CREATE INDEX idx_project_participants_user ON project_participants(user_id);
CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(read);