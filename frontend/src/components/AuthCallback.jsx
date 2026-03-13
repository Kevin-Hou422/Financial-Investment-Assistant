import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function AuthCallback() {
  const navigate = useNavigate();
  const { loginWithToken } = useAuth();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    const error = params.get('google_error');

    if (token) {
      // Fetch user info with the token then store it
      fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } })
        .then((r) => r.json())
        .then((user) => {
          loginWithToken(token, user);
          navigate('/', { replace: true });
        })
        .catch(() => navigate('/?google_error=token_invalid', { replace: true }));
    } else {
      navigate(`/?google_error=${error || 'unknown'}`, { replace: true });
    }
  }, []);

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="text-center space-y-4">
        <svg className="w-10 h-10 animate-spin text-violet-500 mx-auto" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z" />
        </svg>
        <p className="text-gray-400 text-sm">Completing sign-in…</p>
      </div>
    </div>
  );
}
