import { Link, useLocation } from 'react-router-dom';

export default function Navbar() {
  const location = useLocation();
  const getNavClass = (path) =>
    `flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
      location.pathname === path
        ? 'bg-indigo-600 text-white shadow-md'
        : 'text-slate-500 hover:text-indigo-600 hover:bg-slate-100'
    }`;

  return (
    <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-md shadow-sm border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-6">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-500 flex items-center justify-center text-white font-black text-lg">
            AI
          </div>
          <div>
            <div className="text-lg font-black tracking-tight text-slate-900">
              AI Investment Assistant
            </div>
            <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400">
              Multi-Asset Portfolio Dashboard
            </div>
          </div>
        </div>

        <div className="hidden lg:flex items-center gap-1">
          <Link to="/" className={getNavClass('/')}>
            Dashboard
          </Link>
          <Link to="/assets" className={getNavClass('/assets')}>
            Assets
          </Link>
          <Link to="/cashflows" className={getNavClass('/cashflows')}>
            Cashflows
          </Link>
          <Link to="/plans" className={getNavClass('/plans')}>
            Goals
          </Link>
          <Link to="/watchlist" className={getNavClass('/watchlist')}>
            Watchlist
          </Link>
          <Link to="/alerts" className={getNavClass('/alerts')}>
            Alerts
          </Link>
          <Link to="/news" className={getNavClass('/news')}>
            News
          </Link>
        </div>
      </div>
    </nav>
  );
}