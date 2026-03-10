import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Dashboard from './components/Dashboard';
import AssetList from './components/AssetList';
import CashflowTable from './components/CashflowTable';
import PlanManager from './components/PlanManager';
import WatchlistPage from './components/WatchlistPage';
import AlertsPage from './components/AlertsPage';
import NewsPage from './components/NewsPage';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50 text-gray-800 font-sans">
        <Navbar />
        <div className="container mx-auto p-6">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/assets" element={<AssetList />} />
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
