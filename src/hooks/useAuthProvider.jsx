import { useState, useEffect } from 'react';
import { AuthContext } from './AuthContext';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // 初期化：ローカルストレージからトークン確認
  useEffect(() => {
    let isMounted = true;
    
    const initializeAuth = async () => {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        if (isMounted) setIsLoading(false);
        return;
      }

      try {
        const response = await fetch('/api/auth/me', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok && isMounted) {
          const userData = await response.json();
          const userObj = userData.data?.user || userData.user;
          
          // roles配列の正規化
          if (userObj) {
            if (typeof userObj.roles === 'string') {
              userObj.roles = JSON.parse(userObj.roles);
            } else if (userObj.role && !userObj.roles) {
              // 単一roleをroles配列に変換
              userObj.roles = [userObj.role];
            }
          }
          
          setUser(userObj);
        } else {
          // トークンが無効な場合はクリア
          localStorage.removeItem('auth_token');
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        localStorage.removeItem('auth_token');
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    initializeAuth();
    
    return () => {
      isMounted = false;
    };
  }, []);

  const login = async (email, password) => {
    // 認証失敗時もフォームリセットを避けるため、isLoadingは変更しない
    try {
      console.log('Login attempt with:', email);
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });

      console.log('Login response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('Login response data:', data);
        const { token, user: userData } = data.data || data;
        
        console.log('Extracted token:', !!token, 'user:', userData);
        
        // roles配列の正規化
        if (userData) {
          if (typeof userData.roles === 'string') {
            console.log('Parsing roles from string:', userData.roles);
            userData.roles = JSON.parse(userData.roles);
          } else if (userData.role && !userData.roles) {
            // 単一roleをroles配列に変換
            console.log('Converting single role to array:', userData.role);
            userData.roles = [userData.role];
          }
        }
        
        console.log('Storing token and setting user state');
        localStorage.setItem('auth_token', token);
        setUser(userData);
        
        console.log('Login successful, user set:', userData);
        return { success: true };
      } else {
        const errorData = await response.json();
        console.error('Login failed with status:', response.status, 'error:', errorData);
        
        // エラーメッセージの抽出を改善
        let errorMessage = 'ログインに失敗しました';
        if (errorData.error?.message) {
          errorMessage = errorData.error.message;
        } else if (errorData.error) {
          errorMessage = errorData.error;
        } else if (errorData.message) {
          errorMessage = errorData.message;
        }
        
        return { success: false, error: errorMessage };
      }
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: 'ネットワークエラーが発生しました' };
    }
  };

  const signup = async (name, email, password) => {
    // 認証失敗時もフォームリセットを避けるため、isLoadingは変更しない
    try {
      console.log('Signup attempt with:', { name, email });
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name, email, password })
      });

      console.log('Signup response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('Signup response data:', data);
        const { token, user: userData } = data.data || data;
        
        console.log('Extracted token:', !!token, 'user:', userData);
        
        // roles配列の正規化
        if (userData) {
          if (typeof userData.roles === 'string') {
            console.log('Parsing roles from string:', userData.roles);
            userData.roles = JSON.parse(userData.roles);
          } else if (userData.role && !userData.roles) {
            // 単一roleをroles配列に変換
            console.log('Converting single role to array:', userData.role);
            userData.roles = [userData.role];
          }
        }
        
        console.log('Storing token and setting user state');
        localStorage.setItem('auth_token', token);
        setUser(userData);
        
        console.log('Signup successful, user set:', userData);
        return { success: true };
      } else {
        const errorData = await response.json();
        console.error('Signup failed with status:', response.status, 'error:', errorData);
        
        // エラーメッセージの抽出を改善
        let errorMessage = 'ユーザー登録に失敗しました';
        if (errorData.error?.message) {
          errorMessage = errorData.error.message;
        } else if (errorData.error) {
          errorMessage = errorData.error;
        } else if (errorData.message) {
          errorMessage = errorData.message;
        }
        
        return { success: false, error: errorMessage };
      }
    } catch (error) {
      console.error('Signup error:', error);
      return { success: false, error: 'ネットワークエラーが発生しました' };
    }
  };

  const logout = () => {
    setUser(null);
    setProfile(null);
    localStorage.removeItem('auth_token');
  };

  // プロフィール情報を取得
  const fetchProfile = async () => {
    if (!user) return null;
    
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) return null;

      const response = await fetch('/api/users/profile', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        const profileData = data.data?.profile;
        setProfile(profileData);
        return profileData;
      } else {
        console.error('Profile fetch failed:', response.status);
        return null;
      }
    } catch (error) {
      console.error('Profile fetch error:', error);
      return null;
    }
  };

  // プロフィール情報を更新
  const updateProfile = async (profileData) => {
    if (!user) return { success: false, error: '認証が必要です' };
    
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) return { success: false, error: '認証トークンがありません' };

      const response = await fetch('/api/users/profile', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(profileData)
      });

      if (response.ok) {
        const data = await response.json();
        const updatedProfile = data.data?.profile;
        setProfile(updatedProfile);
        return { success: true, profile: updatedProfile };
      } else {
        const errorData = await response.json();
        return { success: false, error: errorData.error?.message || 'プロフィール更新に失敗しました' };
      }
    } catch (error) {
      console.error('Profile update error:', error);
      return { success: false, error: 'ネットワークエラーが発生しました' };
    }
  };

  // 役割ベースのヘルパー関数
  const hasRole = (role) => {
    return user?.roles?.includes(role) || false;
  };

  const isAdmin = hasRole('admin');
  const isOwner = hasRole('owner');
  const isParticipant = hasRole('participant');
  const isAuthenticated = !!user;

  const value = {
    user,
    profile,
    isLoading,
    isAuthenticated,
    isAdmin,
    isOwner,
    isParticipant,
    hasRole,
    login,
    signup,
    logout,
    fetchProfile,
    updateProfile
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};