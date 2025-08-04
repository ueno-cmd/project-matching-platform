import React, { useState, useEffect } from 'react';
import { User, Edit3, Save, X, Plus, Trash2, Star, Brain, Clock, MapPin } from 'lucide-react';
import { useApi } from './hooks/useApi';

// StrengthsFinder 資質リスト（34資質）英語→日本語
const STRENGTHS_LIST = [
  { en: 'Achiever', ja: '達成欲' },
  { en: 'Activator', ja: '活発性' },
  { en: 'Adaptability', ja: '適応性' },
  { en: 'Analytical', ja: '分析思考' },
  { en: 'Arranger', ja: 'アレンジ' },
  { en: 'Belief', ja: '信念' },
  { en: 'Command', ja: '指令性' },
  { en: 'Communication', ja: 'コミュニケーション' },
  { en: 'Competition', ja: '競争性' },
  { en: 'Connectedness', ja: '運命思考' },
  { en: 'Consistency', ja: '公平性' },
  { en: 'Context', ja: '背景思考' },
  { en: 'Deliberative', ja: '慎重さ' },
  { en: 'Developer', ja: '成長促進' },
  { en: 'Discipline', ja: '規律性' },
  { en: 'Empathy', ja: '共感性' },
  { en: 'Focus', ja: '目標志向' },
  { en: 'Futuristic', ja: '未来志向' },
  { en: 'Harmony', ja: '調和性' },
  { en: 'Ideation', ja: '着想' },
  { en: 'Includer', ja: '包含' },
  { en: 'Individualization', ja: '個別化' },
  { en: 'Input', ja: '収集心' },
  { en: 'Intellection', ja: '内省' },
  { en: 'Learner', ja: '学習欲' },
  { en: 'Maximizer', ja: '最上志向' },
  { en: 'Positivity', ja: 'ポジティブ' },
  { en: 'Relator', ja: '親密性' },
  { en: 'Responsibility', ja: '責任感' },
  { en: 'Restorative', ja: '回復志向' },
  { en: 'Self-Assurance', ja: '自己確信' },
  { en: 'Significance', ja: '自我' },
  { en: 'Strategic', ja: '戦略性' },
  { en: 'Woo', ja: '社交性' }
];

// 16タイプリスト
const SIXTEEN_TYPES = [
  { type: 'INTJ', name: '建築家型' },
  { type: 'INTP', name: '論理学者型' },
  { type: 'ENTJ', name: '指揮官型' },
  { type: 'ENTP', name: '討論者型' },
  { type: 'INFJ', name: '提唱者型' },
  { type: 'INFP', name: '仲介者型' },
  { type: 'ENFJ', name: '主人公型' },
  { type: 'ENFP', name: '運動家型' },
  { type: 'ISTJ', name: '管理者型' },
  { type: 'ISFJ', name: '擁護者型' },
  { type: 'ESTJ', name: '幹部型' },
  { type: 'ESFJ', name: '領事官型' },
  { type: 'ISTP', name: '巨匠型' },
  { type: 'ISFP', name: '冒険家型' },
  { type: 'ESTP', name: '起業家型' },
  { type: 'ESFP', name: 'エンターテイナー型' }
];

export default function UserProfile() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({});
  const [newSkill, setNewSkill] = useState('');

  const api = useApi();

  // プロフィール情報を取得
  useEffect(() => {
    const fetchProfileOnMount = async () => {
      try {
        setLoading(true);
        const response = await api.get('/api/users/profile');
        if (response.success) {
          setProfile(response.data.profile);
          setEditData(response.data.profile);
        } else {
          setError('プロフィールの取得に失敗しました');
        }
      } catch (err) {
        const errorMessage = err.message || 'プロフィールの取得中にエラーが発生しました';
        setError(errorMessage);
        console.error('Profile fetch error:', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchProfileOnMount();
  }, [api.get]);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/users/profile');
      if (response.success) {
        setProfile(response.data.profile);
        setEditData(response.data.profile);
      } else {
        setError('プロフィールの取得に失敗しました');
      }
    } catch (err) {
      const errorMessage = err.message || 'プロフィールの取得中にエラーが発生しました';
      setError(errorMessage);
      console.error('Profile fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  // プロフィール更新
  const handleSave = async () => {
    try {
      setSaving(true);
      const response = await api.put('/api/users/profile', editData);
      if (response.success) {
        setProfile(response.data.profile);
        setIsEditing(false);
        setError(null);
      } else {
        setError(response.error?.message || 'プロフィールの更新に失敗しました');
      }
    } catch (err) {
      setError('プロフィールの更新中にエラーが発生しました');
      console.error('Profile update error:', err);
    } finally {
      setSaving(false);
    }
  };

  // 編集キャンセル
  const handleCancel = () => {
    setEditData(profile);
    setIsEditing(false);
    setError(null);
  };

  // SF資質の選択切り替え（英語名で保存）
  const toggleStrength = (strengthEn) => {
    const currentStrengths = editData.strengths_finder || [];
    if (currentStrengths.includes(strengthEn)) {
      setEditData({
        ...editData,
        strengths_finder: currentStrengths.filter(s => s !== strengthEn)
      });
    } else if (currentStrengths.length < 5) {
      setEditData({
        ...editData,
        strengths_finder: [...currentStrengths, strengthEn]
      });
    }
  };

  // 英語の資質名を日本語に変換
  const getStrengthJaName = (enName) => {
    const strength = STRENGTHS_LIST.find(s => s.en === enName);
    return strength ? strength.ja : enName;
  };

  // スキル追加
  const addSkill = () => {
    if (newSkill.trim() && !(editData.skills || []).includes(newSkill.trim())) {
      setEditData({
        ...editData,
        skills: [...(editData.skills || []), newSkill.trim()]
      });
      setNewSkill('');
    }
  };

  // スキル削除
  const removeSkill = (skillToRemove) => {
    setEditData({
      ...editData,
      skills: (editData.skills || []).filter(skill => skill !== skillToRemove)
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">プロフィールを読み込み中...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error && !profile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-12">
            <p className="text-red-600">{error}</p>
            <button 
              onClick={fetchProfile}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              再試行
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* ヘッダー */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">
              プロフィール設定
            </h1>
            <p className="text-gray-600">
              あなたの資質・スキル情報を設定してマッチング精度を向上させましょう
            </p>
          </div>
          <div className="flex gap-3">
            {isEditing ? (
              <>
                <button
                  onClick={handleCancel}
                  className="flex items-center gap-2 px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  <X className="w-4 h-4" />
                  キャンセル
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  {saving ? '保存中...' : '保存'}
                </button>
              </>
            ) : (
              <button
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Edit3 className="w-4 h-4" />
                編集
              </button>
            )}
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-600">{error}</p>
          </div>
        )}

        <div className="space-y-6">
          {/* 基本情報 */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <User className="w-6 h-6 text-blue-600" />
              <h2 className="text-xl font-semibold text-gray-800">基本情報</h2>
            </div>
            
            <div className="space-y-6">
              <div className="text-left">
                <label className="block text-left text-sm font-medium text-gray-700 mb-2">
                  名前
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    value={editData.name || ''}
                    onChange={(e) => setEditData({...editData, name: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-left"
                  />
                ) : (
                  <p className="text-left text-gray-800">{profile?.name || '未設定'}</p>
                )}
              </div>
              
              <div className="text-left">
                <label className="block text-left text-sm font-medium text-gray-700 mb-2">
                  メールアドレス
                </label>
                <p className="text-left text-gray-800">{profile?.email}</p>
                <p className="text-left text-xs text-gray-500">メールアドレスは変更できません</p>
              </div>

              <div className="text-left">
                <label className="block text-left text-sm font-medium text-gray-700 mb-2">
                  自己紹介
                </label>
                {isEditing ? (
                  <textarea
                    value={editData.bio || ''}
                    onChange={(e) => setEditData({...editData, bio: e.target.value})}
                    rows="4"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-left"
                    placeholder="あなたの経験や得意分野について教えてください..."
                  />
                ) : (
                  <p className="text-left text-gray-800">{profile?.bio || '未設定'}</p>
                )}
              </div>

              <div className="text-left">
                <label className="block text-left text-sm font-medium text-gray-700 mb-2">
                  経験年数
                </label>
                {isEditing ? (
                  <input
                    type="number"
                    min="0"
                    max="50"
                    value={editData.experience_years || 0}
                    onChange={(e) => setEditData({...editData, experience_years: parseInt(e.target.value) || 0})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-left"
                  />
                ) : (
                  <p className="text-left text-gray-800">{profile?.experience_years || 0}年</p>
                )}
              </div>
            </div>
          </div>

          {/* StrengthsFinder 資質 */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <Star className="w-6 h-6 text-yellow-600" />
              <h2 className="text-xl font-semibold text-gray-800">StrengthsFinder 資質</h2>
              <span className="text-sm text-gray-500">（上位5つを選択）</span>
            </div>

            {isEditing ? (
              <div className="space-y-4">
                <p className="text-sm text-gray-600">
                  選択中: {(editData.strengths_finder || []).length}/5
                </p>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
                  {STRENGTHS_LIST.map((strength) => {
                    const isSelected = (editData.strengths_finder || []).includes(strength.en);
                    return (
                      <button
                        key={strength.en}
                        onClick={() => toggleStrength(strength.en)}
                        disabled={!isSelected && (editData.strengths_finder || []).length >= 5}
                        className={`px-3 py-2 text-sm rounded-lg border transition-colors ${
                          isSelected
                            ? 'bg-yellow-100 border-yellow-500 text-yellow-800'
                            : 'bg-gray-50 border-gray-300 text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed'
                        }`}
                      >
                        {strength.ja}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {profile?.strengths_finder?.map((strength, index) => (
                  <span
                    key={strength}
                    className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-medium"
                  >
                    {index + 1}. {getStrengthJaName(strength)}
                  </span>
                )) || <p className="text-gray-500">未設定</p>}
              </div>
            )}
          </div>

          {/* 16タイプ */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <Brain className="w-6 h-6 text-purple-600" />
              <h2 className="text-xl font-semibold text-gray-800">16タイプ診断</h2>
            </div>

            {isEditing ? (
              <select
                value={editData.sixteen_types?.type || ''}
                onChange={(e) => {
                  const selectedType = SIXTEEN_TYPES.find(t => t.type === e.target.value);
                  setEditData({
                    ...editData,
                    sixteen_types: selectedType || null
                  });
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">タイプを選択してください</option>
                {SIXTEEN_TYPES.map((type) => (
                  <option key={type.type} value={type.type}>
                    {type.type} - {type.name}
                  </option>
                ))}
              </select>
            ) : (
              <div className="text-left">
                {profile?.sixteen_types ? (
                  <span className="px-4 py-2 bg-purple-100 text-purple-800 rounded-full text-sm font-medium">
                    {profile.sixteen_types.type} - {profile.sixteen_types.description || profile.sixteen_types.name}
                  </span>
                ) : (
                  <p className="text-left text-gray-500">未設定</p>
                )}
              </div>
            )}
          </div>

          {/* スキル */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <Clock className="w-6 h-6 text-green-600" />
              <h2 className="text-xl font-semibold text-gray-800">スキル・技術</h2>
            </div>

            {isEditing ? (
              <div className="space-y-4">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newSkill}
                    onChange={(e) => setNewSkill(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addSkill()}
                    placeholder="新しいスキルを追加..."
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <button
                    onClick={addSkill}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    追加
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {(editData.skills || []).map((skill) => (
                    <span
                      key={skill}
                      className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium flex items-center gap-2"
                    >
                      {skill}
                      <button
                        onClick={() => removeSkill(skill)}
                        className="text-green-600 hover:text-green-800"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {profile?.skills?.map((skill) => (
                  <span
                    key={skill}
                    className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium"
                  >
                    {skill}
                  </span>
                )) || <p className="text-gray-500">未設定</p>}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}