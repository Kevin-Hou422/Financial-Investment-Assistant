import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

const authApi = axios.create({ baseURL: '/api/auth' });

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // On mount: verify stored token
  useEffect(() => {
    const token = localStorage.getItem('ai_invest_token');
    if (!token) { setLoading(false); return; }
    authApi
      .get('/me', { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => setUser(res.data))
      .catch(() => {
        localStorage.removeItem('ai_invest_token');
        localStorage.removeItem('ai_invest_user');
      })
      .finally(() => setLoading(false));
  }, []);

  // Check URL for Google OAuth callback token
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const googleError = params.get('google_error');
    if (googleError) {
      window.history.replaceState({}, '', '/');
    }
  }, []);

  const loginWithToken = useCallback((token, userData) => {
    localStorage.setItem('ai_invest_token', token);
    localStorage.setItem('ai_invest_user', JSON.stringify(userData));
    setUser(userData);
  }, []);

  const login = useCallback(async ({ email, password }) => {
    const res = await authApi.post('/login', { email, password });
    loginWithToken(res.data.token, res.data.user);
    return res.data;
  }, [loginWithToken]);

  const register = useCallback(async ({ email, password, name }) => {
    const res = await authApi.post('/register', { email, password, name });
    loginWithToken(res.data.token, res.data.user);
    return res.data;
  }, [loginWithToken]);

  const logout = useCallback(() => {
    localStorage.removeItem('ai_invest_token');
    localStorage.removeItem('ai_invest_user');
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, loginWithToken }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
