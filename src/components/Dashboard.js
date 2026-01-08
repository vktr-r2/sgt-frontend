import React from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/auth';
import CurrentTournament from './CurrentTournament';
import CurrentSeason from './CurrentSeason';

function Dashboard() {
  const navigate = useNavigate();
  const user = authService.getCurrentUser();

  const handleLogout = async () => {
    await authService.logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-clubhouse-cream">
      {/* Header bar (match Draft.js) */}
      <div className="bg-white shadow-country-club sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <h2 className="font-display text-3xl text-clubhouse-mahogany">
            Welcome, {user?.name}!
          </h2>
          <div className="flex items-center gap-3">
            {user?.admin && (
              <button
                onClick={() => navigate('/admin')}
                className="bg-clubhouse-brown hover:bg-clubhouse-mahogany text-white
                           font-sans font-medium px-6 py-2 rounded-lg transition-all"
              >
                Admin
              </button>
            )}
            <button
              onClick={handleLogout}
              className="bg-clubhouse-brown hover:bg-clubhouse-mahogany text-white
                         font-sans font-medium px-6 py-2 rounded-lg transition-all"
            >
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        <CurrentTournament />
        <CurrentSeason />
      </div>
    </div>
  );
}

export default Dashboard;