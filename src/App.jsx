import { useState, useEffect } from 'react'
import { AuthProvider, useAuth } from './hooks/useAuth'
import LoginForm from './LoginForm'
import SignupForm from './SignupForm'
import AdminDashboard from './AdminDashboard'
import ProjectBoard from './ProjectBoard'
import ProjectOwnerDashboard from './ProjectOwnerDashboard'
import UserProfile from './UserProfile'
import { LogOut, User } from 'lucide-react'
import './App.css'

function AppContent() {
    const { user, isLoading, isAuthenticated, isAdmin, logout } = useAuth()

    const [currentView, setCurrentView] = useState('board')
    const [authView, setAuthView] = useState('login') // 'login' or 'signup'
    const [hasInitialized, setHasInitialized] = useState(false) // 初回ログイン時のみ自動切り替え

    // 初回ログイン時のみ適切な画面に設定
    useEffect(() => {
        if (user && !hasInitialized && currentView === 'board') {
            // 管理者は管理画面を優先、それ以外はプロジェクト掲示板
            const initialView = isAdmin ? 'admin' : 'board'
            if (initialView !== currentView) {
                setCurrentView(initialView)
            }
            setHasInitialized(true) // 一度だけ実行
        }
    }, [user, isAdmin, currentView, hasInitialized])

    // デバッグ用ログ（初回レンダリング時のみ）
    useEffect(() => {
        console.log('App initialized - isLoading:', isLoading, 'isAuthenticated:', isAuthenticated, 'user:', user)
    }, [isAuthenticated])

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">読み込み中...</p>
                </div>
            </div>
        )
    }

    if (!isAuthenticated) {
        if (authView === 'signup') {
            return (
                <SignupForm 
                    onSwitchToLogin={() => setAuthView('login')}
                />
            )
        }
        return (
            <LoginForm 
                onSwitchToSignup={() => setAuthView('signup')}
            />
        )
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <nav className="bg-white shadow-sm border-b p-4">
                <div className="max-w-7xl mx-auto flex justify-between items-center">
                    <h1 className="text-xl font-bold text-gray-800">プロジェクトマッチングプラットフォーム</h1>
                    <div className="flex items-center gap-4">
                        <div className="flex gap-2">
                            {/* 管理者画面 - 管理者のみ */}
                            {isAdmin && (
                                <button
                                    onClick={() => setCurrentView('admin')}
                                    className={`px-4 py-2 rounded-lg transition-colors ${
                                        currentView === 'admin'
                                            ? 'bg-purple-600 text-white'
                                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                    }`}
                                >
                                    管理者画面
                                </button>
                            )}

                            {/* プロジェクト掲示板 - 全員 */}
                            <button
                                onClick={() => setCurrentView('board')}
                                className={`px-4 py-2 rounded-lg transition-colors ${
                                    currentView === 'board'
                                        ? 'bg-purple-600 text-white'
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                            >
                                プロジェクト掲示板
                            </button>

                            {/* マイプロジェクト - 全員 */}
                            <button
                                onClick={() => setCurrentView('owner')}
                                className={`px-4 py-2 rounded-lg transition-colors ${
                                    currentView === 'owner'
                                        ? 'bg-purple-600 text-white'
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                            >
                                マイプロジェクト
                            </button>

                            {/* プロフィール設定 - 全員 */}
                            <button
                                onClick={() => setCurrentView('profile')}
                                className={`px-4 py-2 rounded-lg transition-colors ${
                                    currentView === 'profile'
                                        ? 'bg-purple-600 text-white'
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                            >
                                <User className="h-4 w-4 inline mr-1" />
                                プロフィール設定
                            </button>
                        </div>
                        <div className="flex items-center gap-3">
              <span className="text-sm text-gray-600">
                {user?.name} ({user?.roles?.join(', ')})
              </span>
                            <button
                                onClick={logout}
                                className="flex items-center gap-1 px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                            >
                                <LogOut className="h-4 w-4" />
                                ログアウト
                            </button>
                        </div>
                    </div>
                </div>
            </nav>

            <main>
                {currentView === 'admin' && <AdminDashboard />}
                {currentView === 'board' && <ProjectBoard />}
                {currentView === 'owner' && <ProjectOwnerDashboard />}
                {currentView === 'profile' && <UserProfile />}
            </main>
        </div>
    )
}

function App() {
    return (
        <AuthProvider>
            <AppContent />
        </AuthProvider>
    )
}

export default App
