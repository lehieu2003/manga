import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/features/auth/stores/auth.store';
import { AuthPanel, Field, GoogleSignInButton } from '@/features/auth/components';

export { AuthPanel, Field } from '@/features/auth/components';

export function LoginPage() {
  const navigate = useNavigate();
  const { login, loginWithGoogle } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    try {
      await login({ email, password });
      navigate('/');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Login failed');
    }
  }

  async function onGoogleLogin() {
    setError('');
    setIsGoogleLoading(true);
    try {
      await loginWithGoogle();
      navigate('/');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Google sign-in failed');
    } finally {
      setIsGoogleLoading(false);
    }
  }

  return (
    <AuthPanel title='Welcome back' footer={<AuthFooter />}>
      <div className='space-y-4'>
        <GoogleSignInButton isLoading={isGoogleLoading} onClick={onGoogleLogin} />
        <div className='flex items-center gap-3 text-xs font-bold uppercase tracking-[0.18em] text-[var(--muted)]'>
          <span className='h-px flex-1 bg-[var(--line)]' />
          or
          <span className='h-px flex-1 bg-[var(--line)]' />
        </div>
      </div>
      <form className='mt-4 space-y-4' onSubmit={onSubmit}>
        <Field label='Email' value={email} onChange={setEmail} type='email' />
        <Field
          label='Password'
          value={password}
          onChange={setPassword}
          type='password'
        />
        {error ? <p className='text-sm text-[var(--danger)]'>{error}</p> : null}
        <button className='btn btn-primary w-full' type='submit'>
          Login
        </button>
      </form>
    </AuthPanel>
  );
}

function AuthFooter() {
  return (
    <div className='grid gap-2'>
      <Link to='/forgot-password'>Forgot password?</Link>
      <Link to='/register'>Create an account</Link>
    </div>
  );
}
