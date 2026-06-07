import {
  createContext,
  use,
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useSyncExternalStore,
  type ReactNode,
} from 'react';
import {
  api,
  clearTokens,
  getAuthTokenSnapshot,
  getRefreshToken,
  setTokens,
  subscribeAuthTokens,
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

type AuthProviderState = {
  user: User | null;
  isLoading: boolean;
};

type AuthAction =
  | { type: 'sessionLoading' }
  | { type: 'sessionLoaded'; user: User }
  | { type: 'sessionCleared' }
  | { type: 'userUpdated'; user: User };

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const hasAccessToken = useSyncExternalStore(
    subscribeAuthTokens,
    getAuthTokenSnapshot,
    () => false,
  );
  const [state, dispatch] = useReducer(authReducer, {
    user: null,
    isLoading: hasAccessToken,
  });

  useEffect(() => {
    if (!hasAccessToken) {
      dispatch({ type: 'sessionCleared' });
      return;
    }
    if (state.user) return;
    let isCurrent = true;
    dispatch({ type: 'sessionLoading' });
    api
      .me()
      .then((payload) => {
        if (isCurrent) dispatch({ type: 'sessionLoaded', user: payload.user });
      })
      .catch(() => clearTokens());
    return () => {
      isCurrent = false;
    };
  }, [hasAccessToken, state.user]);

  const login = useCallback(
    async (input: { email: string; password: string }) => {
      const payload = await api.login(input);
      dispatch({ type: 'sessionLoaded', user: payload.user });
      setTokens(payload.accessToken, payload.refreshToken);
    },
    [],
  );

  const register = useCallback(
    async (input: { email: string; password: string; displayName: string }) => {
      const payload = await api.register(input);
      dispatch({ type: 'sessionLoaded', user: payload.user });
      setTokens(payload.accessToken, payload.refreshToken);
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
      dispatch({ type: 'sessionCleared' });
    }
  }, []);

  const updateProfile = useCallback(async (input: UpdateProfileInput) => {
    const payload = await api.updateMe(input);
    dispatch({ type: 'userUpdated', user: payload.user });
  }, []);

  const changePassword = useCallback(async (input: ChangePasswordInput) => {
    const payload = await api.changePassword(input);
    dispatch({ type: 'sessionLoaded', user: payload.user });
    setTokens(payload.accessToken, payload.refreshToken);
  }, []);

  const value = useMemo(
    () => ({
      user: state.user,
      isLoading: state.isLoading,
      login,
      register,
      logout,
      updateProfile,
      changePassword,
    }),
    [
      state.user,
      state.isLoading,
      login,
      register,
      logout,
      updateProfile,
      changePassword,
    ],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = use(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}

function authReducer(
  state: AuthProviderState,
  action: AuthAction,
): AuthProviderState {
  switch (action.type) {
    case 'sessionLoading':
      return { ...state, isLoading: true };
    case 'sessionLoaded':
      return { user: action.user, isLoading: false };
    case 'sessionCleared':
      return { user: null, isLoading: false };
    case 'userUpdated':
      return { ...state, user: action.user };
    default:
      return state;
  }
}
