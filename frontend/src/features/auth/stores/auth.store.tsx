import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  api,
  clearTokens,
  getAccessToken,
  getRefreshToken,
  setTokens,
} from '@/api';
import type { User } from '@/types';

export type UpdateProfileInput = {
  displayName?: string;
  avatarUrl?: string | null;
};
export type ChangePasswordInput = {
  currentPassword: string;
  newPassword: string;
};

type AuthState = {
  user: User | null;
  isLoading: boolean;
  login: (input: { email: string; password: string }) => Promise<void>;
  register: (input: {
    email: string;
    password: string;
    displayName: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (input: UpdateProfileInput) => Promise<void>;
  changePassword: (input: ChangePasswordInput) => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(Boolean(getAccessToken()));

  useEffect(() => {
    if (!getAccessToken()) return;
    api
      .me()
      .then((payload) => setUser(payload.user))
      .catch(() => clearTokens())
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    const onAuthCleared = () => setUser(null);
    window.addEventListener('manga:auth-cleared', onAuthCleared);
    return () =>
      window.removeEventListener('manga:auth-cleared', onAuthCleared);
  }, []);

  const login = useCallback(
    async (input: { email: string; password: string }) => {
      const payload = await api.login(input);
      setTokens(payload.accessToken, payload.refreshToken);
      setUser(payload.user);
    },
    [],
  );

  const register = useCallback(
    async (input: { email: string; password: string; displayName: string }) => {
      const payload = await api.register(input);
      setTokens(payload.accessToken, payload.refreshToken);
      setUser(payload.user);
    },
    [],
  );

  const logout = useCallback(async () => {
    const refreshToken = getRefreshToken();
    try {
      if (refreshToken) await api.logout(refreshToken);
    } catch {
      // Local logout must not be blocked by a stale or already-revoked refresh token.
    } finally {
      clearTokens();
      setUser(null);
    }
  }, []);

  const updateProfile = useCallback(async (input: UpdateProfileInput) => {
    const payload = await api.updateMe(input);
    setUser(payload.user);
  }, []);

  const changePassword = useCallback(async (input: ChangePasswordInput) => {
    const payload = await api.changePassword(input);
    setTokens(payload.accessToken, payload.refreshToken);
    setUser(payload.user);
  }, []);

  const value = useMemo(
    () => ({
      user,
      isLoading,
      login,
      register,
      logout,
      updateProfile,
      changePassword,
    }),
    [user, isLoading, login, register, logout, updateProfile, changePassword],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
