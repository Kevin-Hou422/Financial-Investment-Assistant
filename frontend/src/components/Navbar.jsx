import { Link, useLocation } from 'react-router-dom';

export default function Navbar() {
    const location = useLocation();
    const getNavClass = (path) => `px-4 py-2 font-medium rounded-lg transition-all duration-300 ${
      location.pathname === path 
        ? 'bg-blue-600 text-white shadow-md transform scale-105' 
        : 'text-gray-600 hover:bg-blue-50 hover:text-blue-600'
    }`;
  
    return (
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md shadow-sm border-b border-gray-100 px-6 py-4 flex items-center gap-6">
        <div className="text-xl font-black bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 mr-4 tracking-tight">
          AI Invest
        </div>
        <Link to="/" className={getNavClass('/')}>Dashboard</Link>
        <Link to="/assets" className={getNavClass('/assets')}>Asset Management</Link>
      </nav>
    );
  }