import React, { useState, useEffect } from 'react';
import { BarChart3, Users, FolderOpen, AlertTriangle, Shield, TrendingUp, Search, Filter, MoreVertical, CheckCircle, XCircle, Eye, Edit, UserCheck, UserX, Crown, User, Plus, Lock, Key } from 'lucide-react';
import { useProjects, useUsers } from './hooks/useApi.js';
import { useApi } from './hooks/useApi.js';

export default function AdminDashboard() {
    const [activeTab, setActiveTab] = useState('users');
    const [searchTerm, setSearchTerm] = useState('');
    const [projects, setProjects] = useState([]);
    const [users, setUsers] = useState([]);
    const [openDropdown, setOpenDropdown] = useState(null);
    const [isUpdating, setIsUpdating] = useState(false);
    const [showCreateUserModal, setShowCreateUserModal] = useState(false);
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    const [newUser, setNewUser] = useState({
        name: '',
        email: '',
        password: '',
        role: 'member'
    });
    const [passwordData, setPasswordData] = useState({
        newPassword: '',
        confirmPassword: ''
    });
    const { getProjects } = useProjects();
    const { getUsers } = useUsers();
    const api = useApi();

    useEffect(() => {
        let isMounted = true;
        
        const fetchData = async () => {
            if (!isMounted) return;
            
            try {
                const results = await Promise.allSettled([
                    getProjects(),
                    getUsers()
                ]);
                
                if (!isMounted) return;
                
                if (results[0].status === 'fulfilled') {
                    setProjects(results[0].value.projects || []);
                }
                
                if (results[1].status === 'fulfilled') {
                    setUsers(results[1].value.users || []);
                }
                
                results.forEach((result, index) => {
                    if (result.status === 'rejected') {
                        console.error(`Failed to fetch ${index === 0 ? 'projects' : 'users'}:`, result.reason);
                    }
                });
            } catch (error) {
                if (isMounted) {
                    console.error('Failed to fetch admin data:', error);
                }
            }
        };

        fetchData();
        
        return () => {
            isMounted = false;
        };
    }, [getProjects, getUsers]);

    // ドロップダウンを閉じる
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (openDropdown && !event.target.closest('.relative')) {
                setOpenDropdown(null);
            }
        };

        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, [openDropdown]);

    // ユーザー更新機能
    const updateUser = async (userId, updates) => {
        try {
            setIsUpdating(true);
            const response = await api.put(`/api/users/${userId}`, updates);
            if (response.success) {
                // ユーザーリストを再取得
                const usersResponse = await getUsers();
                if (usersResponse.success) {
                    setUsers(usersResponse.users || []);
                }
                setOpenDropdown(null);
            } else {
                console.error('Failed to update user:', response.error);
                alert('ユーザーの更新に失敗しました');
            }
        } catch (error) {
            console.error('Error updating user:', error);
            alert('ユーザーの更新中にエラーが発生しました');
        } finally {
            setIsUpdating(false);
        }
    };

    // 権限変更
    const changeRole = (userId, currentRole) => {
        const newRole = currentRole === 'owner' ? 'member' : 'owner';
        const roleText = newRole === 'owner' ? 'オーナー' : 'メンバー';
        
        if (confirm(`このユーザーの権限を「${roleText}」に変更しますか？`)) {
            updateUser(userId, { role: newRole });
        }
    };

    // アカウント状態変更
    const toggleUserStatus = (userId, currentStatus) => {
        const newStatus = currentStatus === 'active' ? 'suspended' : 'active';
        const statusText = newStatus === 'active' ? 'アクティブ' : '停止';
        
        if (confirm(`このユーザーのアカウントを「${statusText}」に変更しますか？`)) {
            updateUser(userId, { status: newStatus });
        }
    };

    // ユーザー作成機能
    const createUser = async () => {
        try {
            setIsUpdating(true);
            
            // 詳細バリデーション
            const errors = [];
            
            if (!newUser.name || newUser.name.trim().length === 0) {
                errors.push('氏名を入力してください');
            }
            
            if (!newUser.email || newUser.email.trim().length === 0) {
                errors.push('メールアドレスを入力してください');
            } else {
                // メールアドレス形式チェック
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRegex.test(newUser.email)) {
                    errors.push('有効なメールアドレスを入力してください');
                }
            }
            
            if (!newUser.password || newUser.password.length === 0) {
                errors.push('パスワードを入力してください');
            } else if (newUser.password.length < 8) {
                errors.push('パスワードは8文字以上で入力してください');
            }
            
            if (errors.length > 0) {
                alert(errors.join('\n'));
                return;
            }
            
            const response = await api.post('/api/auth/register', newUser);
            if (response.success) {
                // ユーザーリストを再取得
                const usersResponse = await getUsers();
                if (usersResponse.success) {
                    setUsers(usersResponse.users || []);
                }
                // フォームリセット
                setNewUser({
                    name: '',
                    email: '',
                    password: '',
                    role: 'member'
                });
                setShowCreateUserModal(false);
                alert('ユーザーを作成しました');
            } else {
                console.error('Failed to create user:', response.error);
                alert(response.error || 'ユーザーの作成に失敗しました');
            }
        } catch (error) {
            console.error('Error creating user:', error);
            alert('ユーザーの作成中にエラーが発生しました');
        } finally {
            setIsUpdating(false);
        }
    };

    // パスワード変更機能
    const changePassword = async () => {
        try {
            setIsUpdating(true);
            
            // バリデーション
            if (!passwordData.newPassword || !passwordData.confirmPassword) {
                alert('新しいパスワードと確認用パスワードを入力してください');
                return;
            }
            
            if (passwordData.newPassword !== passwordData.confirmPassword) {
                alert('パスワードが一致しません');
                return;
            }
            
            if (passwordData.newPassword.length < 8) {
                alert('パスワードは8文字以上で入力してください');
                return;
            }
            
            const response = await api.put(`/api/users/${selectedUser.id}/password`, {
                password: passwordData.newPassword
            });
            
            if (response.success) {
                // フォームリセット
                setPasswordData({
                    newPassword: '',
                    confirmPassword: ''
                });
                setShowPasswordModal(false);
                setSelectedUser(null);
                alert('パスワードを変更しました');
            } else {
                console.error('Failed to change password:', response.error);
                alert(response.error || 'パスワードの変更に失敗しました');
            }
        } catch (error) {
            console.error('Error changing password:', error);
            alert('パスワードの変更中にエラーが発生しました');
        } finally {
            setIsUpdating(false);
        }
    };

    // パスワードリセット機能
    const resetPassword = async (userId) => {
        try {
            setIsUpdating(true);
            
            if (!confirm('パスワードをリセットしますか？新しい一時パスワードが生成されます。')) {
                return;
            }
            
            const response = await api.post(`/api/users/${userId}/reset-password`);
            
            if (response.success) {
                alert(`パスワードをリセットしました。\n新しい一時パスワード: ${response.data.tempPassword}\n\nユーザーにお知らせください。`);
                setOpenDropdown(null);
            } else {
                console.error('Failed to reset password:', response.error);
                alert(response.error || 'パスワードのリセットに失敗しました');
            }
        } catch (error) {
            console.error('Error resetting password:', error);
            alert('パスワードのリセット中にエラーが発生しました');
        } finally {
            setIsUpdating(false);
        }
    };

    const systemStats = {
        totalUsers: users.length || 0,
        activeProjects: projects.filter(p => p.status === 'recruiting' || p.status === 'active').length || 0,
        monthlyMatches: projects.reduce((sum, p) => sum + (p.current_members || 0), 0),
        successRate: projects.length > 0 ? Math.round((projects.filter(p => p.status === 'completed').length / projects.length) * 100) : 0,
        userGrowth: users.filter(u => u.status === 'active').length > 0 ? Math.round(((users.length - users.filter(u => u.status === 'suspended').length) / users.length) * 100) : 0,
        projectGrowth: projects.length > 0 ? Math.round((projects.filter(p => p.status === 'recruiting').length / projects.length) * 100) : 0,
        reportedIssues: projects.filter(p => p.reported).length || 0
    };


    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-7xl mx-auto">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-800 mb-2">
                        管理者ダッシュボード
                    </h1>
                    <p className="text-gray-600">
                        システム全体の監視と管理
                    </p>
                </div>

                <div className="grid md:grid-cols-4 gap-6 mb-8">
                    <div className="bg-white rounded-xl shadow-sm p-6">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-gray-600">総ユーザー数</span>
                            <Users className="w-5 h-5 text-blue-500" />
                        </div>
                        <div className="text-2xl font-bold text-gray-800">
                            {systemStats.totalUsers.toLocaleString()}
                        </div>
                        <div className="text-sm text-green-600 mt-1">
                            +{systemStats.userGrowth}% 前月比
                        </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm p-6">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-gray-600">アクティブプロジェクト</span>
                            <FolderOpen className="w-5 h-5 text-purple-500" />
                        </div>
                        <div className="text-2xl font-bold text-gray-800">
                            {systemStats.activeProjects}
                        </div>
                        <div className="text-sm text-green-600 mt-1">
                            +{systemStats.projectGrowth}% 前月比
                        </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm p-6">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-gray-600">月間マッチング数</span>
                            <TrendingUp className="w-5 h-5 text-green-500" />
                        </div>
                        <div className="text-2xl font-bold text-gray-800">
                            {systemStats.monthlyMatches}
                        </div>
                        <div className="text-sm text-gray-600 mt-1">
                            成功率 {systemStats.successRate}%
                        </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm p-6">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-gray-600">報告された問題</span>
                            <AlertTriangle className="w-5 h-5 text-red-500" />
                        </div>
                        <div className="text-2xl font-bold text-gray-800">
                            {systemStats.reportedIssues}
                        </div>
                        <div className="text-sm text-red-600 mt-1">
                            要対応
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm mb-6">
                    <div className="flex border-b">
                        <button
                            onClick={() => setActiveTab('projects')}
                            className={`px-6 py-3 font-medium transition-colors ${
                                activeTab === 'projects'
                                    ? 'text-purple-600 border-b-2 border-purple-600'
                                    : 'text-gray-600 hover:text-gray-800'
                            }`}
                        >
                            プロジェクト管理
                        </button>
                        <button
                            onClick={() => setActiveTab('users')}
                            className={`px-6 py-3 font-medium transition-colors ${
                                activeTab === 'users'
                                    ? 'text-purple-600 border-b-2 border-purple-600'
                                    : 'text-gray-600 hover:text-gray-800'
                            }`}
                        >
                            ユーザー管理
                        </button>
                    </div>
                </div>

                <div>

                    {activeTab === 'projects' && (
                        <div>
                            <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
                                <div className="flex gap-4">
                                    <div className="flex-1 relative">
                                        <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                                        <input
                                            type="text"
                                            placeholder="プロジェクト名で検索..."
                                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                        />
                                    </div>
                                    <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                                        <Filter className="w-4 h-4" />
                                        フィルター
                                    </button>
                                </div>
                            </div>

                            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                                <table className="w-full">
                                    <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            プロジェクト名
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            オーナー
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            状態
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            参加者
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            マッチ率
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            アクション
                                        </th>
                                    </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                    {projects.map((project) => (
                                        <tr key={project.id} className={project.reported ? 'bg-red-50' : ''}>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div>
                                                    <div className="text-sm font-medium text-gray-900">
                                                        {project.title || project.name}
                                                    </div>
                                                    {project.reported && (
                                                        <div className="text-xs text-red-600 mt-1">
                                                            ⚠️ {project.reportReason}
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {project.owner_name || project.owner}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              project.status === 'recruiting' || project.status === 'active'
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-gray-100 text-gray-800'
                          }`}>
                            {project.status === 'recruiting' || project.status === 'active' ? '募集中' : '完了'}
                          </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {project.current_members || project.members}人
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {project.matchRate || Math.round((project.current_members || 0) / (project.team_size || 1) * 100)}%
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                <button className="text-gray-400 hover:text-gray-600">
                                                    <MoreVertical className="w-5 h-5" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {activeTab === 'users' && (
                        <div>
                            <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
                                <div className="flex gap-4">
                                    <div className="flex-1 relative">
                                        <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                                        <input
                                            type="text"
                                            placeholder="ユーザー名またはメールで検索..."
                                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                        />
                                    </div>
                                    <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                                        <Filter className="w-4 h-4" />
                                        フィルター
                                    </button>
                                    <button 
                                        onClick={() => setShowCreateUserModal(true)}
                                        className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                                    >
                                        <Plus className="w-4 h-4" />
                                        新規ユーザー作成
                                    </button>
                                </div>
                            </div>

                            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                                <table className="w-full">
                                    <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            ユーザー
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            役割
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            参加/所有
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            状態
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            最終アクセス
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            アクション
                                        </th>
                                    </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                    {users.map((user) => (
                                        <tr key={user.id} className={user.status === 'suspended' ? 'bg-orange-50' : ''}>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div>
                                                    <div className="text-sm font-medium text-gray-900">
                                                        {user.name}
                                                    </div>
                                                    <div className="text-sm text-gray-500">
                                                        {user.email}
                                                    </div>
                                                    {user.suspendReason && (
                                                        <div className="text-xs text-orange-600 mt-1">
                                                            停止理由: {user.suspendReason}
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex gap-1">
                                                    {user.roles.map((role, index) => (
                                                        <span key={index} className="px-2 py-1 text-xs bg-purple-100 text-purple-700 rounded">
                                {role === 'owner' ? 'オーナー' : role === 'member' ? 'メンバー' : role}
                              </span>
                                                    ))}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                参加: {user.joinedProjects} / 所有: {user.ownedProjects}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              user.status === 'active'
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-orange-100 text-orange-800'
                          }`}>
                            {user.status === 'active' ? 'アクティブ' : '停止中'}
                          </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {user.lastActive}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                <div className="relative">
                                                    <button 
                                                        onClick={() => setOpenDropdown(openDropdown === user.id ? null : user.id)}
                                                        className="text-gray-400 hover:text-gray-600 p-1"
                                                        disabled={isUpdating}
                                                    >
                                                        <MoreVertical className="w-5 h-5" />
                                                    </button>
                                                    
                                                    {openDropdown === user.id && (
                                                        <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg border border-gray-200 z-10">
                                                            <div className="py-1">
                                                                <button
                                                                    onClick={() => changeRole(user.id, user.roles[0])}
                                                                    className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                                                    disabled={isUpdating}
                                                                >
                                                                    {user.roles[0] === 'owner' ? (
                                                                        <>
                                                                            <User className="w-4 h-4" />
                                                                            メンバーに変更
                                                                        </>
                                                                    ) : (
                                                                        <>
                                                                            <Crown className="w-4 h-4" />
                                                                            オーナーに変更
                                                                        </>
                                                                    )}
                                                                </button>
                                                                
                                                                <button
                                                                    onClick={() => {
                                                                        setSelectedUser(user);
                                                                        setShowPasswordModal(true);
                                                                        setOpenDropdown(null);
                                                                    }}
                                                                    className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                                                    disabled={isUpdating}
                                                                >
                                                                    <Lock className="w-4 h-4 text-blue-500" />
                                                                    パスワード変更
                                                                </button>
                                                                
                                                                <button
                                                                    onClick={() => resetPassword(user.id)}
                                                                    className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                                                    disabled={isUpdating}
                                                                >
                                                                    <Key className="w-4 h-4 text-orange-500" />
                                                                    パスワードリセット
                                                                </button>
                                                                
                                                                <button
                                                                    onClick={() => toggleUserStatus(user.id, user.status)}
                                                                    className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                                                    disabled={isUpdating}
                                                                >
                                                                    {user.status === 'active' ? (
                                                                        <>
                                                                            <UserX className="w-4 h-4 text-red-500" />
                                                                            アカウント停止
                                                                        </>
                                                                    ) : (
                                                                        <>
                                                                            <UserCheck className="w-4 h-4 text-green-500" />
                                                                            アカウント復活
                                                                        </>
                                                                    )}
                                                                </button>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                </div>

                {/* ユーザー作成モーダル */}
                {showCreateUserModal && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                        <div className="bg-white rounded-xl shadow-lg max-w-md w-full mx-4">
                            <div className="p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-lg font-semibold text-gray-800">新規ユーザー作成</h3>
                                    <button
                                        onClick={() => {
                                            setShowCreateUserModal(false);
                                            setNewUser({
                                                name: '',
                                                email: '',
                                                password: '',
                                                role: 'member'
                                            });
                                        }}
                                        className="text-gray-400 hover:text-gray-600"
                                    >
                                        <XCircle className="w-6 h-6" />
                                    </button>
                                </div>
                                
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            氏名 *
                                        </label>
                                        <input
                                            type="text"
                                            value={newUser.name}
                                            onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                            placeholder="山田太郎"
                                        />
                                    </div>
                                    
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            メールアドレス *
                                        </label>
                                        <input
                                            type="email"
                                            value={newUser.email}
                                            onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                            placeholder="user@promachi.local"
                                        />
                                    </div>
                                    
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            パスワード *
                                        </label>
                                        <input
                                            type="password"
                                            value={newUser.password}
                                            onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                            placeholder="8文字以上"
                                        />
                                    </div>
                                    
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            役割
                                        </label>
                                        <select
                                            value={newUser.role}
                                            onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                        >
                                            <option value="member">メンバー</option>
                                            <option value="owner">オーナー</option>
                                            <option value="admin">管理者</option>
                                        </select>
                                    </div>
                                </div>
                                
                                <div className="flex gap-3 mt-6">
                                    <button
                                        onClick={() => {
                                            setShowCreateUserModal(false);
                                            setNewUser({
                                                name: '',
                                                email: '',
                                                password: '',
                                                role: 'member'
                                            });
                                        }}
                                        className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                                        disabled={isUpdating}
                                    >
                                        キャンセル
                                    </button>
                                    <button
                                        onClick={createUser}
                                        className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
                                        disabled={isUpdating}
                                    >
                                        {isUpdating ? '作成中...' : 'ユーザー作成'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* パスワード変更モーダル */}
                {showPasswordModal && selectedUser && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                        <div className="bg-white rounded-xl shadow-lg max-w-md w-full mx-4">
                            <div className="p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-lg font-semibold text-gray-800">
                                        パスワード変更 - {selectedUser.name}
                                    </h3>
                                    <button
                                        onClick={() => {
                                            setShowPasswordModal(false);
                                            setSelectedUser(null);
                                            setPasswordData({
                                                newPassword: '',
                                                confirmPassword: ''
                                            });
                                        }}
                                        className="text-gray-400 hover:text-gray-600"
                                    >
                                        <XCircle className="w-6 h-6" />
                                    </button>
                                </div>
                                
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            新しいパスワード *
                                        </label>
                                        <input
                                            type="password"
                                            value={passwordData.newPassword}
                                            onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                            placeholder="8文字以上"
                                        />
                                    </div>
                                    
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            パスワード確認 *
                                        </label>
                                        <input
                                            type="password"
                                            value={passwordData.confirmPassword}
                                            onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                            placeholder="同じパスワードを再入力"
                                        />
                                    </div>
                                </div>
                                
                                <div className="flex gap-3 mt-6">
                                    <button
                                        onClick={() => {
                                            setShowPasswordModal(false);
                                            setSelectedUser(null);
                                            setPasswordData({
                                                newPassword: '',
                                                confirmPassword: ''
                                            });
                                        }}
                                        className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                                        disabled={isUpdating}
                                    >
                                        キャンセル
                                    </button>
                                    <button
                                        onClick={changePassword}
                                        className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                                        disabled={isUpdating}
                                    >
                                        {isUpdating ? '変更中...' : 'パスワード変更'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}