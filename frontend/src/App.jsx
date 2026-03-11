import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Dashboard from './components/Dashboard';
import AssetSectorPage from './components/AssetSectorPage';
import AssetCategoryPage from './components/AssetCategoryPage';
import CashflowTable from './components/CashflowTable';
import PlanManager from './components/PlanManager';
import WatchlistPage from './components/WatchlistPage';
import AlertsPage from './components/AlertsPage';
import NewsPage from './components/NewsPage';

function App() {
  return (
    <Router>
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
          </Routes>
        </div>
      </div>
    </Router>
  );
}
export default App;
