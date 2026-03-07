import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { tournamentService } from '../services/tournament';
import TournamentLeaderboard from './TournamentLeaderboard';

// Fetches and displays results for a single expanded tournament
const TournamentResultsPanel = ({ tournamentId }) => {
  const { data: resultsData, isLoading, error } = useQuery({
    queryKey: ['tournamentResults', tournamentId],
    queryFn: () => tournamentService.getTournamentResults(tournamentId),
    staleTime: Infinity // results never change
  });

  const getCurrentUserId = () => {
    try {
      const userData = localStorage.getItem('user');
      if (userData) {
        const user = JSON.parse(userData);
        return user.user_id;
      }
    } catch (err) {
      console.error('Error parsing user data:', err);
    }
    return null;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-6">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-augusta-green-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border-l-4 border-error-red rounded-lg p-4 mx-4 mb-4">
        <p className="font-sans text-error-red font-medium">Error loading results</p>
      </div>
    );
  }

  if (!resultsData?.data) {
    return (
      <p className="font-sans text-clubhouse-brown text-sm px-4 py-4">
        Results not yet available
      </p>
    );
  }

  const { tournament, results } = resultsData.data;

  return (
    <div className="p-4">
      <TournamentLeaderboard
        leaderboard={results}
        currentUserId={getCurrentUserId()}
        tournament={tournament}
        mode="final"
      />
    </div>
  );
};

// A single tournament row in the accordion list
const TournamentListItem = ({ tournament, isExpanded, onToggle }) => {
  const formatDateRange = (startDate, endDate) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const month = start.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' });
    const startDay = start.getUTCDate();
    const endDay = end.getUTCDate();
    return `${month} ${startDay}–${endDay}`;
  };

  return (
    <div className="bg-white rounded-xl shadow-country-club overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full px-4 py-4 flex items-center gap-3 text-left hover:bg-clubhouse-cream transition-colors duration-150"
      >
        <span className="text-clubhouse-brown text-sm">{isExpanded ? '▼' : '►'}</span>
        <span className="font-sans font-semibold text-clubhouse-mahogany flex-1">{tournament.name}</span>
        <span className="font-sans text-sm text-clubhouse-brown">
          {formatDateRange(tournament.start_date, tournament.end_date)}
        </span>
        {tournament.is_major && (
          <span className="font-sans text-xs text-trophy-gold font-semibold">⭐ MAJOR</span>
        )}
        {tournament.winner_username && (
          <span className="font-sans text-sm text-clubhouse-brown">
            Winner: {tournament.winner_username} ({tournament.winner_points})
          </span>
        )}
      </button>
      {isExpanded && <TournamentResultsPanel tournamentId={tournament.id} />}
    </div>
  );
};

// Main PastTournaments page
const PastTournaments = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const currentYear = new Date().getFullYear();
  const [expandedTournamentId, setExpandedTournamentId] = useState(null);

  const { data: historyData, isLoading, error, refetch } = useQuery({
    queryKey: ['tournamentHistory', currentYear],
    queryFn: () => tournamentService.getTournamentHistory(currentYear),
    staleTime: 10 * 60 * 1000 // 10 minutes
  });

  const handleToggle = (tournamentId) => {
    setExpandedTournamentId(prev => prev === tournamentId ? null : tournamentId);
  };

  return (
    <div className="min-h-screen bg-clubhouse-cream">
      {/* Sticky header with nav tabs */}
      <div className="bg-white shadow-country-club sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <h2 className="font-display text-3xl text-clubhouse-mahogany">
            Past Tournaments
          </h2>
        </div>

        {/* Navigation tabs */}
        <div className="border-t border-clubhouse-beige">
          <div className="max-w-7xl mx-auto px-6 flex">
            <button
              onClick={() => navigate('/')}
              className={`font-sans font-medium px-4 py-3 text-sm border-b-2 transition-colors
                ${location.pathname === '/'
                  ? 'border-augusta-green-600 text-augusta-green-600'
                  : 'border-transparent text-clubhouse-brown hover:text-clubhouse-mahogany'}`}
            >
              Dashboard
            </button>
            <button
              onClick={() => navigate('/past-tournaments')}
              className={`font-sans font-medium px-4 py-3 text-sm border-b-2 transition-colors
                ${location.pathname === '/past-tournaments'
                  ? 'border-augusta-green-600 text-augusta-green-600'
                  : 'border-transparent text-clubhouse-brown hover:text-clubhouse-mahogany'}`}
            >
              Past Tournaments
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <h1 className="font-display text-2xl text-clubhouse-mahogany mb-6">
          {currentYear} Past Tournaments
        </h1>

        {/* Loading state */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-augusta-green-600 mb-4"></div>
              <p className="font-sans text-clubhouse-brown text-lg">Loading tournament history...</p>
            </div>
          </div>
        )}

        {/* Error state */}
        {!isLoading && error && (
          <div className="bg-red-50 border-l-4 border-error-red rounded-lg p-6 max-w-md mx-auto">
            <p className="font-sans text-error-red font-medium mb-2">Error loading tournament history</p>
            <button
              onClick={() => refetch()}
              className="font-sans text-sm text-error-red underline hover:no-underline"
            >
              Try again
            </button>
          </div>
        )}

        {/* Tournament list */}
        {!isLoading && !error && historyData && (
          <>
            {(!historyData?.data?.tournaments || historyData.data.tournaments.length === 0) ? (
              <div className="bg-white rounded-xl shadow-country-club p-8 text-center">
                <p className="font-sans text-clubhouse-brown">
                  No past tournaments yet this season. Check back after the first tournament concludes.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {historyData.data.tournaments.map(tournament => (
                  <TournamentListItem
                    key={tournament.id}
                    tournament={tournament}
                    isExpanded={expandedTournamentId === tournament.id}
                    onToggle={() => handleToggle(tournament.id)}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default PastTournaments;
