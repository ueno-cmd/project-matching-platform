-- プロジェクトマッチングプラットフォーム - 初期データ投入

-- 管理者ユーザー
INSERT INTO users (email, password_hash, name, role, strengths_finder, sixteen_types, bio, skills) VALUES 
('admin@promachi.local', '$2b$10$example.hash.for.admin.password', '管理者', 'admin', 
 '["Strategic", "Command", "Achiever", "Focus", "Analytical"]',
 '{"type": "ENTJ", "description": "指揮官型"}',
 'システム管理者として全体を統括します。',
 '["System Administration", "Project Management", "Team Leadership"]');

-- テストオーナーユーザー
INSERT INTO users (email, password_hash, name, role, strengths_finder, sixteen_types, bio, skills, experience_years) VALUES 
('owner1@promachi.local', '$2b$10$example.hash.for.owner1.password', 'プロジェクトオーナー田中', 'owner',
 '["Strategic", "Learner", "Ideation", "Input", "Intellection"]',
 '{"type": "ENFP", "description": "運動家型"}',
 'Webアプリケーション開発を中心に活動しています。新しい技術への挑戦を重視します。',
 '["React", "Node.js", "TypeScript", "AWS", "Product Management"]', 5),

('owner2@promachi.local', '$2b$10$example.hash.for.owner2.password', 'スタートアップ佐藤', 'owner',
 '["Activator", "Entrepreneur", "Achiever", "Communication", "Positivity"]',
 '{"type": "ESTP", "description": "起業家型"}',
 'スタートアップでのプロダクト開発経験豊富。スピード重視でMVP開発を得意とします。',
 '["Python", "Django", "React", "Mobile Development", "Startup"]', 7);

-- テストメンバーユーザー
INSERT INTO users (email, password_hash, name, role, strengths_finder, sixteen_types, bio, skills, experience_years) VALUES 
('member1@promachi.local', '$2b$10$example.hash.for.member1.password', 'フロントエンド山田', 'member',
 '["Learner", "Input", "Intellection", "Analytical", "Responsibility"]',
 '{"type": "INFP", "description": "仲介者型"}',
 'フロントエンド開発が得意。ユーザー体験を重視した設計を心がけています。',
 '["React", "Vue.js", "TypeScript", "CSS", "UI/UX Design"]', 3),

('member2@promachi.local', '$2b$10$example.hash.for.member2.password', 'バックエンド鈴木', 'member',
 '["Achiever", "Focus", "Discipline", "Deliberative", "Consistency"]',
 '{"type": "ISTJ", "description": "管理者型"}',
 'バックエンド開発とインフラが専門。安定したシステム構築を得意とします。',
 '["Node.js", "Python", "PostgreSQL", "Docker", "AWS"]', 4),

('member3@promachi.local', '$2b$10$example.hash.for.member3.password', 'デザイナー高橋', 'member',
 '["Ideation", "Strategic", "Futuristic", "Individualization", "Developer"]',
 '{"type": "ENFP", "description": "運動家型"}',
 'UI/UXデザインとブランディングが専門。ユーザー中心設計を重視します。',
 '["Figma", "Adobe Creative Suite", "UI/UX Design", "Prototyping", "User Research"]', 6);

-- サンプルプロジェクト
INSERT INTO projects (owner_id, title, description, category, status, required_skills, preferred_types, preferred_strengths, team_size, duration_weeks, commitment_hours) VALUES 
(2, 'AIチャットボット搭載ECサイト', 
 '中小企業向けのECサイトにAIチャットボットを統合し、顧客サポートを自動化するプロジェクトです。React + Node.jsでの開発を予定しており、OpenAI APIを活用します。',
 'web-development', 'recruiting',
 '["React", "Node.js", "TypeScript", "OpenAI API"]',
 '["ENFP", "ENTP", "INFP"]',
 '["Learner", "Strategic", "Ideation", "Developer"]',
 4, 12, 15),

(3, 'モバイル家計簿アプリMVP開発',
 'スタートアップでのモバイル家計簿アプリのMVP開発。React Native + Firebaseでの構成を予定。シンプルで使いやすいUIと基本的な家計管理機能を実装します。',
 'mobile', 'recruiting', 
 '["React Native", "Firebase", "JavaScript", "Mobile UI"]',
 '["ESTP", "ENFP", "ESFP"]',
 '["Activator", "Achiever", "Adaptability", "Communication"]',
 3, 8, 20),

(2, 'データ可視化ダッシュボード',
 '企業内データを可視化するダッシュボードの開発。Python + React での構成で、リアルタイムデータ表示とインタラクティブなグラフ機能を実装します。',
 'data-analysis', 'active',
 '["Python", "React", "D3.js", "Data Analysis"]',
 '["INTJ", "ISTJ", "INTP"]', 
 '["Analytical", "Strategic", "Focus", "Learner"]',
 3, 10, 12);

-- プロジェクト参加データ
INSERT INTO project_participants (project_id, user_id, status, match_score, role_in_project) VALUES 
(1, 4, 'accepted', 85.5, 'Frontend Developer'),
(1, 5, 'accepted', 78.2, 'Backend Developer'),
(2, 6, 'accepted', 92.1, 'UI/UX Designer'),
(2, 4, 'applied', 74.8, 'Frontend Developer'),
(3, 5, 'accepted', 88.9, 'Backend Developer'),
(3, 4, 'accepted', 71.3, 'Frontend Developer');

-- サンプル通知
INSERT INTO notifications (user_id, type, title, message, metadata) VALUES 
(4, 'project_match', '新しいプロジェクトマッチ', 'あなたのスキルにマッチするプロジェクト「AIチャットボット搭載ECサイト」が見つかりました', '{"project_id": 1, "match_score": 85.5}'),
(5, 'application_status', '参加申請が承認されました', 'プロジェクト「データ可視化ダッシュボード」への参加申請が承認されました', '{"project_id": 3, "status": "accepted"}'),
(6, 'project_update', 'プロジェクト更新通知', '参加中のプロジェクト「モバイル家計簿アプリMVP開発」で新しい情報が更新されました', '{"project_id": 2, "update_type": "milestone"}');