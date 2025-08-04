import { useState, useEffect } from 'react';
import { useAuth } from './hooks/useAuth';
import { LogIn, Eye, EyeOff } from 'lucide-react';

export default function LoginForm({ onSwitchToSignup }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login } = useAuth();

  // デバッグ用：error状態の変化をログ出力
  useEffect(() => {
    console.log('LoginForm: Error state changed to:', error);
  }, [error]);

  const handleSubmit = async (e) => {
    console.log('LoginForm: handleSubmit called');
    e.preventDefault();
    console.log('LoginForm: Clearing error state');
    setError('');
    setIsSubmitting(true);

    if (!email || !password) {
      setError('メールアドレスとパスワードを入力してください');
      setIsSubmitting(false);
      return;
    }

    console.log('LoginForm: Starting login attempt');
    const result = await login(email, password);
    console.log('LoginForm: Login result:', result);
    
    if (!result.success) {
      console.log('LoginForm: Setting error:', result.error);
      setError(result.error);
      console.log('LoginForm: Error state should be set');
    } else {
      console.log('LoginForm: Login successful');
    }
    
    setIsSubmitting(false);
  };


  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        <div className="text-center mb-8">
          <div className="mx-auto w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center mb-4">
            <LogIn className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">ログイン</h1>
          <p className="text-gray-600 mt-2">プロジェクトマッチングプラットフォーム</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              メールアドレス
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="your@example.com"
              disabled={isSubmitting}
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
              パスワード
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="パスワード"
                disabled={isSubmitting}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
                disabled={isSubmitting}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4 text-gray-400" />
                ) : (
                  <Eye className="h-4 w-4 text-gray-400" />
                )}
              </button>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg">
              {error}
              {console.log('LoginForm: Error div is being rendered with message:', error)}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSubmitting ? 'ログイン中...' : 'ログイン'}
          </button>
        </form>


        {onSwitchToSignup && (
          <div className="mt-6 pt-6 border-t border-gray-200 text-center">
            <p className="text-sm text-gray-600">
              アカウントをお持ちでない方は{' '}
              <button
                onClick={onSwitchToSignup}
                className="text-blue-600 hover:text-blue-700 font-medium"
                disabled={isSubmitting}
              >
                新規登録はこちら
              </button>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}