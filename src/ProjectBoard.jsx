import React, { useState, useEffect } from 'react';
import { Search, Filter, MapPin, Users, Calendar, Clock, Star, Heart, Send } from 'lucide-react';
import { useApi } from './hooks/useApi';

export default function ProjectBoard() {
    const [projects, setProjects] = useState([]);
    const [userProfile, setUserProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterCategory, setFilterCategory] = useState('all');
    const [selectedProject, setSelectedProject] = useState(null);
    const [showApplicationModal, setShowApplicationModal] = useState(false);
    const [applicationMessage, setApplicationMessage] = useState('');
    const [applying, setApplying] = useState(false);
    
    const api = useApi();

    // データを取得
    useEffect(() => {
        const fetchDataOnMount = async () => {
            try {
                setLoading(true);
                const [projectsResponse, profileResponse] = await Promise.allSettled([
                    api.get('/api/projects'),
                    api.get('/api/users/profile')
                ]);

                if (projectsResponse.status === 'fulfilled' && projectsResponse.value.success) {
                    setProjects(projectsResponse.value.projects || []);
                } else {
                    setError('プロジェクトの取得に失敗しました');
                }

                if (profileResponse.status === 'fulfilled' && profileResponse.value.success) {
                    setUserProfile(profileResponse.value.data.profile);
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
            const [projectsResponse, profileResponse] = await Promise.allSettled([
                api.get('/api/projects'),
                api.get('/api/users/profile')
            ]);

            if (projectsResponse.status === 'fulfilled' && projectsResponse.value.success) {
                setProjects(projectsResponse.value.projects || []);
            } else {
                setError('プロジェクトの取得に失敗しました');
            }

            if (profileResponse.status === 'fulfilled' && profileResponse.value.success) {
                setUserProfile(profileResponse.value.data.profile);
            }
        } catch (err) {
            setError('データの取得中にエラーが発生しました');
            console.error('Error fetching data:', err);
        } finally {
            setLoading(false);
        }
    };

    // マッチング度を計算する（Level1 実装）
    const calculateMatchScore = (project) => {
        if (!userProfile) return 50; // プロフィール未設定の場合は50%

        let totalScore = 0;
        let weights = { skills: 0.4, strengths: 0.3, type: 0.2, experience: 0.1 };
        
        // 1. スキルマッチング（40%の重み）
        const userSkills = userProfile.skills || [];
        const requiredSkills = project.required_skills ? JSON.parse(project.required_skills) : [];
        
        let skillScore = 0;
        if (requiredSkills.length > 0) {
            const matchingSkills = userSkills.filter(skill => 
                requiredSkills.some(required => 
                    required.toLowerCase().includes(skill.toLowerCase()) ||
                    skill.toLowerCase().includes(required.toLowerCase())
                )
            );
            skillScore = (matchingSkills.length / requiredSkills.length) * 100;
        } else {
            skillScore = 50; // 必要スキル未設定の場合は中性
        }
        
        // 2. StrengthsFinder マッチング（30%の重み）
        const userStrengths = userProfile.strengths_finder || [];
        const preferredStrengths = project.preferred_strengths ? JSON.parse(project.preferred_strengths) : [];
        
        let strengthScore = 0;
        if (preferredStrengths.length > 0 && userStrengths.length > 0) {
            const matchingStrengths = userStrengths.filter(strength => 
                preferredStrengths.includes(strength)
            );
            strengthScore = (matchingStrengths.length / Math.min(preferredStrengths.length, userStrengths.length)) * 100;
        } else {
            strengthScore = 50; // 未設定の場合は中性
        }
        
        // 3. 16タイプマッチング（20%の重み）
        const userType = userProfile.sixteen_types?.type;
        const preferredTypes = project.preferred_types ? JSON.parse(project.preferred_types) : [];
        
        let typeScore = 50; // デフォルト
        if (userType && preferredTypes.length > 0) {
            typeScore = preferredTypes.includes(userType) ? 100 : 30;
        }
        
        // 4. 経験年数マッチング（10%の重み）
        const userExperience = userProfile.experience_years || 0;
        let experienceScore = 50;
        if (userExperience >= 3) experienceScore = 80;
        else if (userExperience >= 1) experienceScore = 60;
        else experienceScore = 40;
        
        // 総合スコア計算
        totalScore = Math.round(
            skillScore * weights.skills +
            strengthScore * weights.strengths +
            typeScore * weights.type +
            experienceScore * weights.experience
        );
        
        // 50-95の範囲に調整（100%は現実的ではない）
        return Math.max(50, Math.min(95, totalScore));
    };

    // マッチング理由を生成
    const getMatchReasons = (project) => {
        if (!userProfile) return ['プロフィールを設定するとマッチング理由が表示されます'];

        const reasons = [];
        const userSkills = userProfile.skills || [];
        const requiredSkills = project.required_skills ? JSON.parse(project.required_skills) : [];
        
        // スキルマッチング理由
        if (requiredSkills.length > 0) {
            const matchingSkills = userSkills.filter(skill => 
                requiredSkills.some(required => 
                    required.toLowerCase().includes(skill.toLowerCase()) ||
                    skill.toLowerCase().includes(required.toLowerCase())
                )
            );
            
            if (matchingSkills.length > 0) {
                reasons.push(`あなたのスキル「${matchingSkills.join('、')}」がプロジェクトの必要スキルと一致`);
            }
        }
        
        // StrengthsFinder理由
        const userStrengths = userProfile.strengths_finder || [];
        const preferredStrengths = project.preferred_strengths ? JSON.parse(project.preferred_strengths) : [];
        
        if (preferredStrengths.length > 0 && userStrengths.length > 0) {
            const matchingStrengths = userStrengths.filter(strength => 
                preferredStrengths.includes(strength)
            );
            
            if (matchingStrengths.length > 0) {
                // 英語名を日本語名に変換（簡易版）
                const strengthsJa = matchingStrengths.map(s => {
                    const mapping = {
                        'Strategic': '戦略性', 'Learner': '学習欲', 'Achiever': '達成欲',
                        'Focus': '目標志向', 'Relator': '親密性', 'Analytical': '分析思考'
                    };
                    return mapping[s] || s;
                });
                reasons.push(`あなたの資質「${strengthsJa.join('、')}」がプロジェクトに適合`);
            }
        }
        
        // 16タイプ理由
        const userType = userProfile.sixteen_types?.type;
        const preferredTypes = project.preferred_types ? JSON.parse(project.preferred_types) : [];
        
        if (userType && preferredTypes.includes(userType)) {
            reasons.push(`あなたの性格タイプ「${userType}」がプロジェクトの希望タイプと一致`);
        }
        
        // 経験年数理由
        const userExperience = userProfile.experience_years || 0;
        if (userExperience >= 3) {
            reasons.push(`${userExperience}年の豊富な経験がプロジェクトに活かせます`);
        }
        
        return reasons.length > 0 ? reasons : ['基本的なスキルセットが適合しています'];
    };

    // プロジェクトをフィルタリング
    const filteredProjects = projects.filter(project => {
        const matchesSearch = project.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            project.description?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = filterCategory === 'all' || project.category === filterCategory;
        const isRecruiting = project.status === 'recruiting';
        
        return matchesSearch && matchesCategory && isRecruiting;
    });

    // 応募処理
    const handleApply = async () => {
        if (!selectedProject || !applicationMessage.trim()) return;

        try {
            setApplying(true);
            const response = await api.post('/api/applications', {
                project_id: selectedProject.id,
                role_in_project: 'member', // デフォルトの役割を追加
                message: applicationMessage.trim()
            });

            if (response.success) {
                alert('プロジェクトに参加しました！');
                setShowApplicationModal(false);
                setSelectedProject(null);
                setApplicationMessage('');
                // プロジェクト一覧を更新
                await fetchData();
            } else {
                alert('応募に失敗しました。もう一度お試しください。');
            }
        } catch (err) {
            console.error('Application error:', err);
            alert('応募中にエラーが発生しました。');
        } finally {
            setApplying(false);
        }
    };

    const getMatchScoreColor = (score) => {
        if (score >= 80) return 'bg-green-100 text-green-800';
        if (score >= 60) return 'bg-yellow-100 text-yellow-800';
        return 'bg-red-100 text-red-800';
    };

    const getMatchScoreText = (score) => {
        if (score >= 80) return '高マッチ';
        if (score >= 60) return '中マッチ';
        return '低マッチ';
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-6">
                <div className="max-w-6xl mx-auto">
                    <div className="text-center py-12">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                        <p className="mt-4 text-gray-600">プロジェクトを読み込み中...</p>
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-6">
                <div className="max-w-6xl mx-auto">
                    <div className="text-center py-12">
                        <p className="text-red-600">{error}</p>
                        <button 
                            onClick={fetchData}
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
            <div className="max-w-6xl mx-auto">
                {/* ヘッダー */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-800 mb-2">
                        プロジェクト掲示板
                    </h1>
                    <p className="text-gray-600">
                        参加したいプロジェクトを見つけて応募しよう
                    </p>
                </div>

                {/* 検索・フィルター */}
                <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="flex-1 relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                            <input
                                type="text"
                                placeholder="プロジェクト名やキーワードで検索..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>
                        <div className="relative">
                            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                            <select
                                value={filterCategory}
                                onChange={(e) => setFilterCategory(e.target.value)}
                                className="pl-10 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                                <option value="all">すべてのカテゴリ</option>
                                <option value="web-development">Web開発</option>
                                <option value="mobile-app">モバイルアプリ</option>
                                <option value="ai-ml">AI・機械学習</option>
                                <option value="design">デザイン</option>
                                <option value="marketing">マーケティング</option>
                                <option value="other">その他</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* プロジェクト一覧 */}
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredProjects.map((project) => {
                        const matchScore = calculateMatchScore(project);
                        return (
                            <div key={project.id} className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow cursor-pointer">
                                <div className="flex justify-between items-start mb-4">
                                    <h3 className="text-lg font-semibold text-gray-800 line-clamp-2">
                                        {project.title}
                                    </h3>
                                    <div className={`px-2 py-1 rounded-full text-xs font-medium ${getMatchScoreColor(matchScore)}`}>
                                        {matchScore}% {getMatchScoreText(matchScore)}
                                    </div>
                                </div>

                                <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                                    {project.description}
                                </p>

                                <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
                                    <div className="flex items-center gap-1">
                                        <MapPin className="w-4 h-4" />
                                        <span>{project.location || 'リモート'}</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <Users className="w-4 h-4" />
                                        <span>{project.current_members || 0}/{project.team_size || 5}</span>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-1 text-sm text-gray-500">
                                        <Calendar className="w-4 h-4" />
                                        <span>{project.created_at ? new Date(project.created_at).toLocaleDateString('ja-JP') : ''}</span>
                                    </div>
                                    
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setSelectedProject(project)}
                                            className="px-3 py-1 text-sm border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
                                        >
                                            詳細
                                        </button>
                                        <button
                                            onClick={() => {
                                                setSelectedProject(project);
                                                setShowApplicationModal(true);
                                            }}
                                            className="px-3 py-1 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-1"
                                        >
                                            <Send className="w-3 h-3" />
                                            応募
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {filteredProjects.length === 0 && (
                    <div className="text-center py-12">
                        <p className="text-gray-500">条件に合うプロジェクトが見つかりませんでした。</p>
                    </div>
                )}
            </div>

            {/* プロジェクト詳細モーダル */}
            {selectedProject && !showApplicationModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
                        <div className="p-6">
                            <div className="flex justify-between items-start mb-4">
                                <h2 className="text-2xl font-bold text-gray-800">
                                    {selectedProject.title}
                                </h2>
                                <button
                                    onClick={() => setSelectedProject(null)}
                                    className="text-gray-400 hover:text-gray-600"
                                >
                                    ✕
                                </button>
                            </div>

                            <div className="space-y-4">
                                {/* マッチング情報 */}
                                <div className="bg-blue-50 rounded-lg p-4">
                                    <div className="flex items-center justify-between mb-2">
                                        <h3 className="font-semibold text-gray-800">マッチング度</h3>
                                        <div className={`px-3 py-1 rounded-full text-sm font-medium ${getMatchScoreColor(calculateMatchScore(selectedProject))}`}>
                                            {calculateMatchScore(selectedProject)}% {getMatchScoreText(calculateMatchScore(selectedProject))}
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-sm font-medium text-gray-700">マッチング理由：</p>
                                        {getMatchReasons(selectedProject).map((reason, index) => (
                                            <p key={index} className="text-sm text-gray-600">• {reason}</p>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <h3 className="font-semibold text-gray-800 mb-2">プロジェクト概要</h3>
                                    <p className="text-gray-600">{selectedProject.description}</p>
                                </div>

                                <div className="grid md:grid-cols-2 gap-4">
                                    <div>
                                        <h4 className="font-medium text-gray-800">場所</h4>
                                        <p className="text-gray-600">{selectedProject.location || 'リモート'}</p>
                                    </div>
                                    <div>
                                        <h4 className="font-medium text-gray-800">チームサイズ</h4>
                                        <p className="text-gray-600">
                                            {selectedProject.current_members || 0}/{selectedProject.team_size || 5}人
                                        </p>
                                    </div>
                                    <div>
                                        <h4 className="font-medium text-gray-800">カテゴリ</h4>
                                        <p className="text-gray-600">{selectedProject.category || 'その他'}</p>
                                    </div>
                                    <div>
                                        <h4 className="font-medium text-gray-800">ステータス</h4>
                                        <p className="text-gray-600">
                                            {selectedProject.status === 'recruiting' ? '募集中' : 'その他'}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex justify-end gap-3 pt-4 border-t">
                                    <button
                                        onClick={() => setSelectedProject(null)}
                                        className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
                                    >
                                        閉じる
                                    </button>
                                    <button
                                        onClick={() => setShowApplicationModal(true)}
                                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                                    >
                                        <Send className="w-4 h-4" />
                                        応募する
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* 応募モーダル */}
            {showApplicationModal && selectedProject && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl max-w-lg w-full">
                        <div className="p-6">
                            <div className="flex justify-between items-start mb-4">
                                <h2 className="text-xl font-bold text-gray-800">
                                    プロジェクトに応募
                                </h2>
                                <button
                                    onClick={() => {
                                        setShowApplicationModal(false);
                                        setApplicationMessage('');
                                    }}
                                    className="text-gray-400 hover:text-gray-600"
                                >
                                    ✕
                                </button>
                            </div>

                            <div className="mb-4">
                                <h3 className="font-medium text-gray-800 mb-2">
                                    {selectedProject.title}
                                </h3>
                                <p className="text-sm text-gray-600">
                                    このプロジェクトへの応募メッセージを入力してください。
                                </p>
                            </div>

                            <div className="mb-6">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    応募メッセージ
                                </label>
                                <textarea
                                    value={applicationMessage}
                                    onChange={(e) => setApplicationMessage(e.target.value)}
                                    placeholder="プロジェクトに興味を持った理由や、あなたのスキル・経験について教えてください..."
                                    rows="4"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                            </div>

                            <div className="flex justify-end gap-3">
                                <button
                                    onClick={() => {
                                        setShowApplicationModal(false);
                                        setApplicationMessage('');
                                    }}
                                    className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
                                >
                                    キャンセル
                                </button>
                                <button
                                    onClick={handleApply}
                                    disabled={!applicationMessage.trim() || applying}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                >
                                    {applying ? (
                                        <>
                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                            応募中...
                                        </>
                                    ) : (
                                        <>
                                            <Send className="w-4 h-4" />
                                            応募する
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