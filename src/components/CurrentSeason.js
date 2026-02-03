import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { tournamentService } from '../services/tournament';

const CurrentSeason = () => {
  const currentYear = new Date().getFullYear();

  const {
    data: standings,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['seasonStandings', currentYear],
    queryFn: () => tournamentService.getSeasonStandings(currentYear),
    staleTime: 30 * 60 * 1000 // 30 minutes
  });

  // Helper to get current user ID
  const getCurrentUserId = () => {
    try {
      const userData = localStorage.getItem('user');
      if (userData) {
        const user = JSON.parse(userData);
        return user.user_id;
      }
    } catch (error) {
      console.error('Error parsing user data:', error);
    }
    return null;
  };

  const currentUserId = getCurrentUserId();
  const isCurrentUser = (userId) => userId === currentUserId;

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div
            className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-augusta-green-600 mb-4"
            role="status"
            aria-label="Loading"
          ></div>
          <p className="font-sans text-clubhouse-brown text-lg">Loading season standings...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="bg-red-50 border-l-4 border-error-red rounded-lg p-6 max-w-md mx-auto animate-fade-in">
        <div className="flex items-start gap-3">
          <svg className="w-6 h-6 text-error-red flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="flex-grow">
            <p className="font-sans text-error-red font-medium mb-2">Error loading season standings</p>
            <button
              onClick={() => refetch()}
              className="font-sans text-sm text-error-red underline hover:no-underline"
            >
              Try again
            </button>
          </div>
        </div>
      </div>
    );
  }

  // No data
  if (!standings?.data) {
    return null;
  }

  const { season_year, standings: standingsData } = standings.data;

  // Standings table
  return (
    <div className="bg-white rounded-xl shadow-country-club overflow-hidden animate-fade-in">
      {/* Header */}
      <div className="bg-augusta-green-600 px-6 py-4">
        <h2 className="font-display text-2xl text-white">
          {season_year} Season Standings
        </h2>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px]">
          <thead className="bg-clubhouse-beige border-b-2 border-clubhouse-brown">
            <tr>
              <th className="px-4 py-3 text-left font-sans text-sm font-semibold text-clubhouse-mahogany">
                Rank
              </th>
              <th className="px-4 py-3 text-left font-sans text-sm font-semibold text-clubhouse-mahogany">
                Player
              </th>
              <th className="px-4 py-3 text-center font-sans text-sm font-semibold text-clubhouse-mahogany">
                Points
              </th>
              <th className="px-3 py-3 text-center font-sans text-sm font-semibold text-clubhouse-mahogany">
                1st
              </th>
              <th className="px-3 py-3 text-center font-sans text-sm font-semibold text-clubhouse-mahogany">
                2nd
              </th>
              <th className="px-3 py-3 text-center font-sans text-sm font-semibold text-clubhouse-mahogany">
                3rd
              </th>
              <th className="px-3 py-3 text-center font-sans text-sm font-semibold text-clubhouse-mahogany">
                4th
              </th>
              <th className="px-3 py-3 text-center font-sans text-sm font-semibold text-clubhouse-mahogany">
                Winners
              </th>
              <th className="px-3 py-3 text-center font-sans text-sm font-semibold text-clubhouse-mahogany">
                Cuts
              </th>
            </tr>
          </thead>
          <tbody>
            {standingsData.map((user, index) => (
              <tr
                key={user.user_id}
                className={`border-b border-clubhouse-beige
                           ${isCurrentUser(user.user_id)
                             ? 'bg-augusta-green-50 border-l-4 border-augusta-green-600'
                             : 'hover:bg-clubhouse-cream'}
                           transition-colors duration-150
                           animate-stagger-${Math.min(index + 1, 8)}`}
              >
                <td className="px-4 py-4 font-sans text-clubhouse-mahogany">
                  {user.rank}
                </td>
                <td className="px-4 py-4 font-sans font-semibold text-clubhouse-mahogany">
                  {user.username}
                </td>
                <td className="px-4 py-4 text-center font-sans font-bold text-augusta-green-600">
                  {user.total_points}
                </td>
                <td className="px-3 py-4 text-center font-sans text-clubhouse-brown">
                  {user.first_place}
                </td>
                <td className="px-3 py-4 text-center font-sans text-clubhouse-brown">
                  {user.second_place}
                </td>
                <td className="px-3 py-4 text-center font-sans text-clubhouse-brown">
                  {user.third_place}
                </td>
                <td className="px-3 py-4 text-center font-sans text-clubhouse-brown">
                  {user.fourth_place}
                </td>
                <td className="px-3 py-4 text-center font-sans text-clubhouse-brown">
                  {user.winners_picked}
                </td>
                <td className="px-3 py-4 text-center font-sans text-clubhouse-brown">
                  {user.total_cuts_missed}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default CurrentSeason;
