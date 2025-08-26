import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { tournamentService } from '../services/tournament';
import { authService } from '../services/auth';

function Dashboard() {
  const navigate = useNavigate();
  const user = authService.getCurrentUser();
  
  const { data, isLoading, error } = useQuery({
    queryKey: ['appInfo'],
    queryFn: tournamentService.getAppInfo
  });

  const handleLogout = async () => {
    await authService.logout();
    navigate('/login');
  };

  if (isLoading) return <div className="loading">Loading...</div>;
  if (error) return <div className="error">Error loading dashboard</div>;

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <div>
          <h2>Welcome, {user?.name}!</h2>
          {data?.current_tournament && (
            <p>Current Tournament: <strong>{data.current_tournament.name}</strong></p>
          )}
        </div>
        <button onClick={handleLogout} className="logout-btn">
          Logout
        </button>
      </div>
      
      <div className="dashboard-content">
        {data?.current_tournament ? (
          <div className="tournament-info">
            <h3>Tournament Details</h3>
            <div className="tournament-card">
              <p><strong>Name:</strong> {data.current_tournament.name}</p>
              <p><strong>Week:</strong> {data.current_tournament.week_number}</p>
              <p><strong>Year:</strong> {data.current_tournament.year}</p>
              <p><strong>Format:</strong> {data.current_tournament.format}</p>
              <p><strong>Start Date:</strong> {new Date(data.current_tournament.start_date).toLocaleDateString()}</p>
              <p><strong>End Date:</strong> {new Date(data.current_tournament.end_date).toLocaleDateString()}</p>
            </div>
            
            <div className="actions">
              <button 
                onClick={() => navigate('/draft')} 
                className="primary-btn"
              >
                View Draft Picks
              </button>
            </div>
          </div>
        ) : (
          <div className="no-tournament">
            <h3>No Active Tournament</h3>
            <p>There is no active tournament at this time. Check back soon!</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default Dashboard;