import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Dashboard from './components/Dashboard';
import AssetList from './components/AssetList';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50 text-gray-800 font-sans">
        <Navbar />
        <div className="container mx-auto p-6">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/assets" element={<AssetList />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}
export default App;
