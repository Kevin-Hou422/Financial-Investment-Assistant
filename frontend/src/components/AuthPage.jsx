import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

const MOCK_ACCOUNTS = JSON.parse(localStorage.getItem('ai_invest_accounts') || '[]');

function saveAccount(email, password) {
  const accounts = JSON.parse(localStorage.getItem('ai_invest_accounts') || '[]');
  if (!accounts.find((a) => a.email === email)) {
    accounts.push({ email, password });
    localStorage.setItem('ai_invest_accounts', JSON.stringify(accounts));
  }
}

function verifyAccount(email, password) {
  const accounts = JSON.parse(localStorage.getItem('ai_invest_accounts') || '[]');
  return accounts.find((a) => a.email === email && a.password === password);
}

export default function AuthPage() {
  const { login } = useAuth();
  const [mode, setMode] = useState('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleGoogle = () => {
    setGoogleLoading(true);
    setError('');
    setTimeout(() => {
      login({
        name: 'Google User',
        email: 'user@gmail.com',
        avatar: 'G',
        provider: 'google',
      });
      setGoogleLoading(false);
    }, 1200);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    if (!email || !password) { setError('Please fill in all fields.'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }

    if (mode === 'signup') {
      const accounts = JSON.parse(localStorage.getItem('ai_invest_accounts') || '[]');
      if (accounts.find((a) => a.email === email)) {
        setError('An account with this email already exists. Please sign in.');
        return;
      }
      saveAccount(email, password);
      login({ name: name || email.split('@')[0], email, avatar: (name || email)[0].toUpperCase(), provider: 'email' });
    } else {
      const found = verifyAccount(email, password);
      if (!found) {
        setError('Invalid email or password.');
        return;
      }
      login({ name: email.split('@')[0], email, avatar: email[0].toUpperCase(), provider: 'email' });
    }
  };

  const inputCls = 'w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-3 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/40 placeholder:text-gray-500 text-sm transition-all';

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center px-4 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-violet-600/10 blur-3xl" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-indigo-600/10 blur-3xl" />
        <div className="absolute top-[40%] left-[40%] w-[300px] h-[300px] rounded-full bg-cyan-600/5 blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-md space-y-8">
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 shadow-2xl shadow-violet-500/30 mb-2">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight">
            AI Investment Assistant
          </h1>
          <p className="text-gray-400 text-base leading-relaxed">
            Invest smart with <span className="text-violet-400 font-semibold">AI-powered insights</span>.<br />
            Your portfolio, analyzed in real time.
          </p>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 shadow-2xl shadow-black/40 space-y-5">
          <button
            type="button"
            onClick={handleGoogle}
            disabled={googleLoading}
            className="w-full flex items-center justify-center gap-3 bg-white hover:bg-gray-100 text-gray-800 font-semibold rounded-xl px-4 py-3 transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed shadow-sm"
          >
            {googleLoading ? (
              <svg className="w-5 h-5 animate-spin text-gray-500" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z" />
              </svg>
            ) : (
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
            )}
            {googleLoading ? 'Signing in...' : 'Continue with Google'}
          </button>

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-gray-800" />
            <span className="text-xs text-gray-600 font-medium">or</span>
            <div className="flex-1 h-px bg-gray-800" />
          </div>

          <div className="flex rounded-xl overflow-hidden border border-gray-800 p-1 gap-1 bg-gray-800/50">
            {['signin', 'signup'].map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => { setMode(m); setError(''); }}
                className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all duration-200 ${
                  mode === m
                    ? 'bg-violet-600 text-white shadow-md'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {m === 'signin' ? 'Sign In' : 'Sign Up'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <div>
                <label className="text-xs text-gray-400 mb-1.5 block font-medium">Display Name</label>
                <input
                  type="text"
                  placeholder="Your name"
                  className={inputCls}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
            )}
            <div>
              <label className="text-xs text-gray-400 mb-1.5 block font-medium">Email Address</label>
              <input
                type="email"
                required
                placeholder="you@example.com"
                className={inputCls}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1.5 block font-medium">Password</label>
              <input
                type="password"
                required
                placeholder="••••••••"
                className={inputCls}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 bg-rose-500/10 border border-rose-500/30 rounded-xl px-3 py-2.5">
                <svg className="w-4 h-4 text-rose-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M12 3a9 9 0 110 18A9 9 0 0112 3z" />
                </svg>
                <p className="text-rose-400 text-xs">{error}</p>
              </div>
            )}

            <button
              type="submit"
              className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-bold rounded-xl py-3 transition-all duration-200 shadow-lg shadow-violet-500/20 hover:shadow-violet-500/30 text-sm"
            >
              {mode === 'signin' ? 'Sign In' : 'Create Account'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-gray-600">
          By continuing, you agree to our{' '}
          <span className="text-gray-500 hover:text-gray-400 cursor-pointer transition-colors">Terms of Service</span>
          {' '}and{' '}
          <span className="text-gray-500 hover:text-gray-400 cursor-pointer transition-colors">Privacy Policy</span>.
        </p>
      </div>
    </div>
  );
}
