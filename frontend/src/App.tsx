import { Navigate, Route, Routes } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { AdminPage } from '@/features/admin/pages/AdminPage';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { HomePage } from '@/features/catalog/pages/HomePage';
import { LibraryPage } from '@/features/library/pages/LibraryPage';
import { LoginPage } from '@/features/auth/pages/LoginPage';
import { ForgotPasswordPage } from '@/features/auth/pages/ForgotPasswordPage';
import { MangaDetailPage } from '@/features/catalog/pages/MangaDetailPage';
import { ReaderPage } from '@/features/catalog/pages/ReaderPage';
import { RegisterPage } from '@/features/auth/pages/RegisterPage';
import { ResetPasswordPage } from '@/features/auth/pages/ResetPasswordPage';
import { SearchPage } from '@/features/catalog/pages/SearchPage';
import { SettingsPage } from '@/features/profile/pages/SettingsPage';
import { SocialChatPage } from '@/features/social/SocialChatPage';

export function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<HomePage />} />
        <Route path='/search' element={<SearchPage />} />
        <Route path='/discover/popular' element={<SearchPage />} />
        <Route path='/discover/latest' element={<SearchPage />} />
        <Route path='/genres/:genre' element={<SearchPage />} />
        <Route path='/manga/:mangaId' element={<MangaDetailPage />} />
        <Route path='/read/:chapterId' element={<ReaderPage />} />
        <Route
          path='/library'
          element={
            <ProtectedRoute>
              <LibraryPage />
            </ProtectedRoute>
          }
        />
        <Route
          path='/settings'
          element={
            <ProtectedRoute>
              <SettingsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path='/messages'
          element={
            <ProtectedRoute>
              <SocialChatPage />
            </ProtectedRoute>
          }
        />
        <Route path='/login' element={<LoginPage />} />
        <Route path='/register' element={<RegisterPage />} />
        <Route path='/forgot-password' element={<ForgotPasswordPage />} />
        <Route path='/reset-password' element={<ResetPasswordPage />} />
        <Route path='/admin' element={<AdminPage />} />
        <Route path='*' element={<Navigate to='/' replace />} />
      </Route>
    </Routes>
  );
}
