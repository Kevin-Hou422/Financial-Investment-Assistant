import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import AuthPage from './components/AuthPage';
import AuthCallback from './components/AuthCallback';
import Navbar from './components/Navbar';
import Dashboard from './components/Dashboard';
import AssetSectorPage from './components/AssetSectorPage';
import AssetCategoryPage from './components/AssetCategoryPage';
import CashflowTable from './components/CashflowTable';
import PlanManager from './components/PlanManager';
import WatchlistPage from './components/WatchlistPage';
import AlertsPage from './components/AlertsPage';
import NewsPage from './components/NewsPage';
import AIChatPage from './components/AIChatPage';
import AIStrategyPage from './components/AIStrategyPage';

function AppInner() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <svg className="w-10 h-10 animate-spin text-violet-500" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z" />
        </svg>
      </div>
    );
  }

  if (!user) return <AuthPage />;

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 font-sans">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 py-6">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/assets" element={<AssetSectorPage />} />
          <Route path="/assets/:type" element={<AssetCategoryPage />} />
          <Route path="/cashflows" element={<CashflowTable />} />
          <Route path="/plans" element={<PlanManager />} />
          <Route path="/watchlist" element={<WatchlistPage />} />
          <Route path="/alerts" element={<AlertsPage />} />
          <Route path="/news" element={<NewsPage />} />
          <Route path="/ai-chat" element={<AIChatPage />} />
          <Route path="/ai-strategy" element={<AIStrategyPage />} />
        </Routes>
      </div>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/*" element={<AppInner />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
