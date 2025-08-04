import React, { useState, useEffect } from 'react';
import { Users, TrendingUp, AlertCircle, Edit, Check, X, Plus, MessageSquare, Calendar, Target, UserCheck, FolderOpen, UserPlus, Save, Trash2 } from 'lucide-react';
import { useAuth } from './hooks/useAuth';
import { useApi } from './hooks/useApi.js';

export default function ProjectOwnerDashboard() {
    const { hasRole } = useAuth();
    const api = useApi();
    
    // ロールベースのタブ制御：memberは参加中のみ、ownerは全機能
    const isOwner = hasRole('owner');
    const defaultTab = isOwner ? 'participating' : 'participating';
    const [activeTab, setActiveTab] = useState(defaultTab);
    const [joinedProjects, setJoinedProjects] = useState([]);
    const [ownedProjects, setOwnedProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [createLoading, setCreateLoading] = useState(false);
    const [newProject, setNewProject] = useState({
        title: '',
        description: '',
        category: '',
        required_skills: [],
        preferred_types: [],
        preferred_strengths: [],
        team_size: 3,
        duration_weeks: 8,
        commitment_hours: 10
    });
    const [newSkill, setNewSkill] = useState('');

    // データ取得
    useEffect(() => {
        const fetchDataOnMount = async () => {
            try {
                setLoading(true);
                const results = await Promise.allSettled([
                    api.get('/api/projects/my-joined'),
                    api.get('/api/projects/my-owned')
                ]);

                console.log('API Results:', results);
                console.log('Joined projects response:', results[0]);
                
                if (results[0].status === 'fulfilled' && results[0].value.success) {
                    console.log('Joined projects data:', results[0].value.data?.projects);
                    setJoinedProjects(results[0].value.data?.projects || []);
                } else {
                    console.error('Failed to fetch joined projects:', results[0].reason);
                }

                if (results[1].status === 'fulfilled' && results[1].value.success) {
                    setOwnedProjects(results[1].value.data?.projects || []);
                } else {
                    console.error('Failed to fetch owned projects:', results[1].reason);
                }
            } catch (err) {
                setError('データの取得中にエラーが発生しました');
                console.error('Error fetching data:', err);
            } finally {
                setLoading(false);
            }
        };
        
        fetchDataOnMount();
    }, [api.get]);

    const fetchData = async () => {
        try {
            setLoading(true);
            const results = await Promise.allSettled([
                api.get('/api/projects/my-joined'),
                api.get('/api/projects/my-owned')
            ]);

            if (results[0].status === 'fulfilled' && results[0].value.success) {
                setJoinedProjects(results[0].value.data?.projects || []);
            } else {
                console.error('Failed to fetch joined projects:', results[0].reason);
            }

            if (results[1].status === 'fulfilled' && results[1].value.success) {
                setOwnedProjects(results[1].value.data?.projects || []);
            } else {
                console.error('Failed to fetch owned projects:', results[1].reason);
            }
        } catch (err) {
            setError('データの取得中にエラーが発生しました');
            console.error('Error fetching data:', err);
        } finally {
            setLoading(false);
        }
    };

    // プロジェクト作成処理
    const handleCreateProject = async () => {
        if (!newProject.title || !newProject.description || !newProject.category) {
            alert('タイトル、説明、カテゴリは必須です');
            return;
        }

        try {
            setCreateLoading(true);
            const response = await api.post('/api/projects', newProject);
            
            if (response.success) {
                alert('プロジェクトを作成しました！');
                setShowCreateModal(false);
                setNewProject({
                    title: '',
                    description: '',
                    category: '',
                    required_skills: [],
                    preferred_types: [],
                    preferred_strengths: [],
                    team_size: 3,
                    duration_weeks: 8,
                    commitment_hours: 10
                });
                setNewSkill('');
                // ownerの場合は作成したプロジェクトタブに切り替え、それ以外は参加中タブに留まる
                if (canManageProjects) {
                    setActiveTab('owned');
                }
                fetchData(); // プロジェクト一覧を再取得
            } else {
                alert('プロジェクトの作成に失敗しました');
            }
        } catch (err) {
            console.error('Create project error:', err);
            alert('プロジェクト作成中にエラーが発生しました');
        } finally {
            setCreateLoading(false);
        }
    };

    // スキル追加
    const addSkillToProject = () => {
        if (newSkill.trim() && !newProject.required_skills.includes(newSkill.trim())) {
            setNewProject({
                ...newProject,
                required_skills: [...newProject.required_skills, newSkill.trim()]
            });
            setNewSkill('');
        }
    };

    // スキル削除
    const removeSkillFromProject = (skillToRemove) => {
        setNewProject({
            ...newProject,
            required_skills: newProject.required_skills.filter(skill => skill !== skillToRemove)
        });
    };

    // ユーザーロールに応じたアクセス制御
    const canCreateProjects = hasRole('owner') || hasRole('admin');
    const canManageProjects = hasRole('owner') || hasRole('admin');


    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 p-6">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center py-12">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
                        <p className="mt-4 text-gray-600">プロジェクトを読み込み中...</p>
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gray-50 p-6">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center py-12">
                        <p className="text-red-600">{error}</p>
                        <button 
                            onClick={fetchData}
                            className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                        >
                            再試行
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-7xl mx-auto">
                {/* ヘッダー */}
                <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
                    <div className="flex justify-between items-start">
                        <div className="flex-1">
                            <h1 className="text-2xl font-bold text-gray-800 mb-2">
                                マイプロジェクト
                            </h1>
                            <p className="text-gray-600">
                                {canManageProjects 
                                    ? '参加中のプロジェクトと自分が作成したプロジェクトを管理できます'
                                    : '参加中のプロジェクトを確認できます'
                                }
                            </p>
                        </div>
                        {canCreateProjects && (
                            <button 
                                onClick={() => setShowCreateModal(true)}
                                className="flex items-center gap-2 px-4 py-2 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                            >
                                <Plus className="w-4 h-4" />
                                新しいプロジェクト
                            </button>
                        )}
                    </div>
                </div>

                {/* タブナビゲーション */}
                <div className="bg-white rounded-xl shadow-sm mb-6">
                    <div className="flex border-b">
                        <button
                            onClick={() => setActiveTab('participating')}
                            className={`px-6 py-3 font-medium transition-colors flex items-center gap-2 ${
                                activeTab === 'participating'
                                    ? 'text-purple-600 border-b-2 border-purple-600'
                                    : 'text-gray-600 hover:text-gray-800'
                            }`}
                        >
                            <UserPlus className="w-4 h-4" />
                            参加中のプロジェクト
                            <span className="ml-1 px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                                {joinedProjects.length}
                            </span>
                        </button>
                        
                        {canManageProjects && (
                            <button
                                onClick={() => setActiveTab('owned')}
                                className={`px-6 py-3 font-medium transition-colors flex items-center gap-2 ${
                                    activeTab === 'owned'
                                        ? 'text-purple-600 border-b-2 border-purple-600'
                                        : 'text-gray-600 hover:text-gray-800'
                                }`}
                            >
                                <FolderOpen className="w-4 h-4" />
                                作成したプロジェクト
                                <span className="ml-1 px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                                    {ownedProjects.length}
                                </span>
                                {ownedProjects.reduce((sum, p) => sum + (p.pendingApplications || 0), 0) > 0 && (
                                    <span className="ml-1 px-2 py-1 bg-red-500 text-white text-xs rounded-full">
                                        {ownedProjects.reduce((sum, p) => sum + (p.pendingApplications || 0), 0)}
                                    </span>
                                )}
                            </button>
                        )}
                    </div>
                </div>

                {/* コンテンツエリア */}
                <div className="space-y-6">
                    {activeTab === 'participating' && (
                        <div className="space-y-4">
                            <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                                <UserPlus className="w-5 h-5" />
                                参加中のプロジェクト
                            </h2>
                            
                            {joinedProjects.length === 0 ? (
                                <div className="bg-white rounded-xl shadow-sm p-8 text-center">
                                    <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                                    <h3 className="text-lg font-medium text-gray-600 mb-2">参加中のプロジェクトはありません</h3>
                                    <p className="text-gray-500">プロジェクト掲示板から興味のあるプロジェクトに参加してみましょう</p>
                                </div>
                            ) : (
                                joinedProjects.map((project) => (
                                    <div key={project.id} className="bg-white rounded-xl shadow-sm p-6">
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="flex-1">
                                                <h3 className="text-lg font-semibold text-gray-800 mb-2">
                                                    {project.title || project.name}
                                                </h3>
                                                <p className="text-gray-600 mb-3">{project.description}</p>
                                                <div className="flex items-center gap-4 text-sm text-gray-500">
                                                    <span>オーナー: {project.owner_name || 'オーナー'}</span>
                                                    <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs">
                                                        {project.status === 'recruiting' ? '募集中' : 
                                                         project.status === 'active' ? '進行中' : 
                                                         project.status === 'completed' ? '完了' : project.status}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-sm text-gray-500">
                                                    参加日: {project.joined_at ? new Date(project.joined_at).toLocaleDateString('ja-JP') : '不明'}
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div className="bg-gray-50 rounded-lg p-3 mb-4">
                                            <div className="text-sm text-gray-700 mb-2">メンバー数</div>
                                            <div className="text-sm text-gray-600">{project.current_members || 0}/{project.team_size || '制限なし'}人</div>
                                        </div>
                                        
                                        <div className="flex gap-2">
                                            <button className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm">
                                                詳細を見る
                                            </button>
                                            <button className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm">
                                                チャット
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}

                    {activeTab === 'owned' && canManageProjects && (
                        <div className="space-y-4">
                            <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                                <FolderOpen className="w-5 h-5" />
                                作成したプロジェクト
                            </h2>
                            
                            {ownedProjects.length === 0 ? (
                                <div className="bg-white rounded-xl shadow-sm p-8 text-center">
                                    <FolderOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                                    <h3 className="text-lg font-medium text-gray-600 mb-2">作成したプロジェクトはありません</h3>
                                    <p className="text-gray-500 mb-4">新しいプロジェクトを作成してメンバーを募集しましょう</p>
                                    <button 
                                        onClick={() => setShowCreateModal(true)}
                                        className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                                    >
                                        プロジェクトを作成
                                    </button>
                                </div>
                            ) : (
                                ownedProjects.map((project) => (
                                    <div key={project.id} className="bg-white rounded-xl shadow-sm p-6">
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="flex-1">
                                                <h3 className="text-lg font-semibold text-gray-800 mb-2">
                                                    {project.title || project.name}
                                                </h3>
                                                <p className="text-gray-600 mb-3">{project.description}</p>
                                                <div className="flex items-center gap-4 text-sm text-gray-500">
                                                    <span className="flex items-center gap-1">
                                                        <Calendar className="w-4 h-4" />
                                                        作成: {project.created_at ? new Date(project.created_at).toLocaleDateString('ja-JP') : '不明'}
                                                    </span>
                                                    <span className="flex items-center gap-1">
                                                        <Users className="w-4 h-4" />
                                                        {project.current_members || 0}/{project.team_size || '制限なし'}人
                                                    </span>
                                                    <span className={`px-2 py-1 rounded-full text-xs ${
                                                        project.status === 'recruiting' 
                                                            ? 'bg-green-100 text-green-700' 
                                                            : 'bg-blue-100 text-blue-700'
                                                    }`}>
                                                        {project.status === 'recruiting' ? '募集中' : project.status}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="text-right text-sm text-gray-500">
                                                プロジェクト詳細
                                            </div>
                                        </div>
                                        
                                        <div className="grid grid-cols-3 gap-4 mb-4">
                                            <div className="bg-green-50 rounded-lg p-3 text-center">
                                                <div className="text-lg font-bold text-green-600">
                                                    {project.pending_applications || 0}
                                                </div>
                                                <div className="text-sm text-green-600">新規申請</div>
                                            </div>
                                            <div className="bg-blue-50 rounded-lg p-3 text-center">
                                                <div className="text-lg font-bold text-blue-600">
                                                    {project.team_size ? Math.round(((project.current_members || 0) / project.team_size) * 100) : 0}%
                                                </div>
                                                <div className="text-sm text-blue-600">充足率</div>
                                            </div>
                                            <div className="bg-purple-50 rounded-lg p-3 text-center">
                                                <div className="text-lg font-bold text-purple-600">
                                                    {project.total_applications || 0}
                                                </div>
                                                <div className="text-sm text-purple-600">総申請数</div>
                                            </div>
                                        </div>
                                        
                                        <div className="flex gap-2">
                                            <button className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm">
                                                詳細表示
                                            </button>
                                            <button className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm">
                                                編集
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* プロジェクト作成モーダル */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="p-6">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-2xl font-bold text-gray-800">
                                    新しいプロジェクトを作成
                                </h2>
                                <button
                                    onClick={() => setShowCreateModal(false)}
                                    className="text-gray-400 hover:text-gray-600"
                                >
                                    <X className="w-6 h-6" />
                                </button>
                            </div>

                            <div className="space-y-6">
                                {/* 基本情報 */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        プロジェクト名 <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={newProject.title}
                                        onChange={(e) => setNewProject({...newProject, title: e.target.value})}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                        placeholder="プロジェクトの名前を入力してください"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        説明 <span className="text-red-500">*</span>
                                    </label>
                                    <textarea
                                        value={newProject.description}
                                        onChange={(e) => setNewProject({...newProject, description: e.target.value})}
                                        rows="4"
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                        placeholder="プロジェクトの詳細な説明を入力してください"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        カテゴリ <span className="text-red-500">*</span>
                                    </label>
                                    <select
                                        value={newProject.category}
                                        onChange={(e) => setNewProject({...newProject, category: e.target.value})}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                    >
                                        <option value="">カテゴリを選択してください</option>
                                        <option value="web-development">Web開発</option>
                                        <option value="mobile-app">モバイルアプリ</option>
                                        <option value="ai-ml">AI・機械学習</option>
                                        <option value="design">デザイン</option>
                                        <option value="marketing">マーケティング</option>
                                        <option value="other">その他</option>
                                    </select>
                                </div>

                                {/* 必要スキル */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        必要スキル
                                    </label>
                                    <div className="flex gap-2 mb-3">
                                        <input
                                            type="text"
                                            value={newSkill}
                                            onChange={(e) => setNewSkill(e.target.value)}
                                            onKeyPress={(e) => e.key === 'Enter' && addSkillToProject()}
                                            placeholder="スキルを追加..."
                                            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                        />
                                        <button
                                            onClick={addSkillToProject}
                                            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2"
                                        >
                                            <Plus className="w-4 h-4" />
                                            追加
                                        </button>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {newProject.required_skills.map((skill) => (
                                            <span
                                                key={skill}
                                                className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm font-medium flex items-center gap-2"
                                            >
                                                {skill}
                                                <button
                                                    onClick={() => removeSkillFromProject(skill)}
                                                    className="text-purple-600 hover:text-purple-800"
                                                >
                                                    <Trash2 className="w-3 h-3" />
                                                </button>
                                            </span>
                                        ))}
                                    </div>
                                </div>

                                {/* プロジェクト設定 */}
                                <div className="grid grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            チームサイズ
                                        </label>
                                        <input
                                            type="number"
                                            min="1"
                                            max="20"
                                            value={newProject.team_size}
                                            onChange={(e) => setNewProject({...newProject, team_size: parseInt(e.target.value) || 3})}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            期間（週）
                                        </label>
                                        <input
                                            type="number"
                                            min="1"
                                            max="52"
                                            value={newProject.duration_weeks}
                                            onChange={(e) => setNewProject({...newProject, duration_weeks: parseInt(e.target.value) || 8})}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            週間時間（時間）
                                        </label>
                                        <input
                                            type="number"
                                            min="1"
                                            max="40"
                                            value={newProject.commitment_hours}
                                            onChange={(e) => setNewProject({...newProject, commitment_hours: parseInt(e.target.value) || 10})}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 mt-8 pt-6 border-t">
                                <button
                                    onClick={() => setShowCreateModal(false)}
                                    className="px-6 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
                                >
                                    キャンセル
                                </button>
                                <button
                                    onClick={handleCreateProject}
                                    disabled={createLoading || !newProject.title || !newProject.description || !newProject.category}
                                    className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                >
                                    {createLoading ? (
                                        <>
                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                            作成中...
                                        </>
                                    ) : (
                                        <>
                                            <Save className="w-4 h-4" />
                                            プロジェクトを作成
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}