import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { tournamentService } from '../services/tournament';

const CurrentTournament = () => {
  const navigate = useNavigate();
  const currentYear = new Date().getFullYear();

  // Get app info to determine tournament status
  const { data: appInfo, isLoading: isLoadingAppInfo, error: appInfoError } = useQuery({
    queryKey: ['appInfo'],
    queryFn: tournamentService.getAppInfo
  });

  // Helper function to check if draft is closed
  const isDraftClosed = (tournament) => {
    if (!tournament?.draft_window?.end) return true;
    return Date.now() > new Date(tournament.draft_window.end).getTime();
  };

  // Determine if we should fetch scores or standings based on appInfo
  const shouldFetchScores = Boolean(appInfo && appInfo.current_tournament && isDraftClosed(appInfo.current_tournament));
  const shouldFetchStandings = Boolean(appInfo && !appInfo.current_tournament);

  // Get current scores (only after draft closes)
  const {
    data: scores,
    isLoading: isLoadingScores,
    error: scoresError,
    refetch: refetchScores
  } = useQuery({
    queryKey: ['currentScores'],
    queryFn: tournamentService.getCurrentScores,
    enabled: shouldFetchScores,
    staleTime: 5 * 60 * 1000 // 5 minutes
  });

  // Get season standings (off-season only)
  const {
    data: standings,
    isLoading: isLoadingStandings,
    error: standingsError
  } = useQuery({
    queryKey: ['seasonStandings', currentYear],
    queryFn: () => tournamentService.getSeasonStandings(currentYear),
    enabled: shouldFetchStandings,
    staleTime: 30 * 60 * 1000 // 30 minutes
  });

  // Determine display mode
  const getDisplayMode = () => {
    // Always show loading if appInfo is loading
    if (isLoadingAppInfo) return 'loading';

    // Show error if appInfo failed
    if (appInfoError) return 'error';

    // Now we have appInfo, determine what to show
    if (!appInfo?.current_tournament) {
      // Off-season: check if standings are loading or errored
      if (isLoadingStandings) return 'loading';
      if (standingsError) return 'error';
      return 'off-season';
    }

    // There's a tournament
    if (!isDraftClosed(appInfo.current_tournament)) {
      return 'draft-in-progress';
    }

    // Draft is closed, should show scores
    if (isLoadingScores) return 'loading';
    if (scoresError) return 'error';
    return 'active-tournament';
  };

  const displayMode = getDisplayMode();

  // Loading state
  if (displayMode === 'loading') {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-augusta-green-600 mb-4"></div>
          <p className="font-sans text-clubhouse-brown text-lg">Loading tournament data...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (displayMode === 'error') {
    const error = appInfoError || scoresError || standingsError;
    return (
      <div className="bg-red-50 border-l-4 border-error-red rounded-lg p-6 max-w-md mx-auto animate-fade-in">
        <div className="flex items-start gap-3">
          <svg className="w-6 h-6 text-error-red flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="flex-grow">
            <p className="font-sans text-error-red font-medium mb-2">Error loading tournament data</p>
            <button
              onClick={() => refetchScores()}
              className="font-sans text-sm text-error-red underline hover:no-underline"
            >
              Try again
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Draft in progress state
  if (displayMode === 'draft-in-progress') {
    return <DraftInProgress appInfo={appInfo} navigate={navigate} />;
  }

  // Off-season state
  if (displayMode === 'off-season') {
    return <OffSeasonStandings standings={standings} currentYear={currentYear} />;
  }

  // Active tournament state
  if (displayMode === 'active-tournament') {
    return <ActiveTournament scores={scores} />;
  }

  return null;
};

// Active Tournament component (placeholder)
const ActiveTournament = ({ scores }) => {
  if (!scores?.data) return null;

  const { tournament, leaderboard } = scores.data;

  // Get current user from localStorage to find their entry
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
  const userLeaderboard = leaderboard.find(entry => entry.user_id === currentUserId) || leaderboard[0];

  return (
    <div className="space-y-6">
      <TournamentHeader tournament={tournament} userPosition={userLeaderboard?.current_position} />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* User's golfer cards - takes 2 columns on large screens */}
        <div className="lg:col-span-2">
          <GolferCards golfers={userLeaderboard?.golfers || []} />
        </div>
        {/* Tournament leaderboard - takes 1 column on large screens */}
        <div className="lg:col-span-1">
          <TournamentLeaderboard leaderboard={leaderboard} currentUserId={currentUserId} />
        </div>
      </div>
    </div>
  );
};

// Tournament Header component (placeholder)
const TournamentHeader = ({ tournament, userPosition }) => {
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="bg-white rounded-xl shadow-country-club p-6 mb-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="font-display text-3xl text-clubhouse-mahogany">
              {tournament.name}
            </h2>
            {tournament.is_major && (
              <div className="px-3 py-1 bg-trophy-gold rounded-full">
                <span className="font-sans font-bold text-white text-sm">MAJOR</span>
              </div>
            )}
          </div>
          {tournament.start_date && tournament.end_date && (
            <p className="font-sans text-clubhouse-brown mt-1">
              {formatDate(tournament.start_date)} - {formatDate(tournament.end_date)}
            </p>
          )}
        </div>
        {userPosition && (
          <div className="text-right">
            <p className="font-sans text-sm text-clubhouse-brown mb-1">Your Position</p>
            <div className="w-16 h-16 rounded-full bg-augusta-green-600 flex items-center justify-center">
              <span className="font-display text-2xl text-white">{userPosition}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Golfer Cards component (placeholder)
const GolferCards = ({ golfers }) => {
  const getStatusBorderColor = (status) => {
    switch (status) {
      case 'active': return 'border-augusta-green-600';
      case 'complete': return 'border-trophy-gold';
      case 'cut': return 'border-sand-dark';
      case 'wd': return 'border-error-red';
      default: return 'border-clubhouse-beige';
    }
  };

  const getStatusBadgeStyle = (status) => {
    switch (status) {
      case 'active': return 'bg-augusta-green-100 text-augusta-green-700';
      case 'complete': return 'bg-trophy-gold text-white';
      case 'cut': return 'bg-sand-light text-sand-dark';
      case 'wd': return 'bg-red-100 text-error-red';
      default: return 'bg-clubhouse-beige text-clubhouse-brown';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'active': return 'In Progress';
      case 'complete': return 'Complete';
      case 'cut': return 'CUT';
      case 'wd': return 'WD';
      default: return 'Unknown';
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {golfers.map((golfer, index) => (
        <div
          key={golfer.golfer_id}
          className={`bg-white rounded-xl shadow-country-club p-5
                      hover:shadow-elevated transition-all duration-200
                      border-l-4 ${getStatusBorderColor(golfer.status)}
                      animate-stagger-${Math.min(index + 1, 8)}`}
        >
          {/* Golfer name and total score */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex-grow">
              <h3 className="font-sans font-bold text-lg text-clubhouse-mahogany">
                {golfer.name}
              </h3>
              {golfer.was_replaced && (
                <div className="flex items-center gap-1 mt-1">
                  <span className="font-sans text-xs text-sand-dark">Replacement</span>
                </div>
              )}
            </div>
            <div className="text-right">
              <div className="font-sans font-bold text-2xl text-augusta-green-600">
                {golfer.total_score > 0 ? '+' : ''}{golfer.total_score}
              </div>
              <div className="font-sans text-sm text-clubhouse-brown">
                {golfer.position}
              </div>
            </div>
          </div>

          {/* Status badge */}
          <div className={`inline-flex px-3 py-1 rounded-full text-xs font-sans font-medium mb-3
                            ${getStatusBadgeStyle(golfer.status)}`}>
            {getStatusLabel(golfer.status)}
          </div>

          {/* Round scores grid */}
          <div className="grid grid-cols-4 gap-2">
            {[1, 2, 3, 4].map(roundNum => {
              const round = golfer.rounds.find(r => r.round === roundNum);
              return (
                <div key={roundNum} className="text-center">
                  <div className="font-sans text-xs text-clubhouse-brown mb-1">R{roundNum}</div>
                  <div className={`font-sans font-semibold text-sm
                                  ${round ? 'text-clubhouse-mahogany' : 'text-gray-300'}`}>
                    {round ? round.score : '--'}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};

// Tournament Leaderboard component - shows all users' standings
const TournamentLeaderboard = ({ leaderboard, currentUserId }) => {
  const PAR_PER_ROUND = 72;

  // Convert raw score to par-relative string (E, -2, +3, etc.)
  const formatScoreToPar = (rawScore) => {
    if (rawScore === null || rawScore === undefined) return '--';
    const relativeScore = rawScore - PAR_PER_ROUND;
    if (relativeScore === 0) return 'E';
    return relativeScore > 0 ? `+${relativeScore}` : `${relativeScore}`;
  };

  // Calculate total score relative to par for a user
  const calculateTotalToPar = (golfers) => {
    const totalStrokes = golfers.reduce((sum, g) => {
      const golferTotal = g.rounds.reduce((rSum, r) => rSum + (r.score || 0), 0);
      return sum + golferTotal;
    }, 0);
    const totalPar = golfers.length * 4 * PAR_PER_ROUND; // 4 rounds per golfer
    const roundsPlayed = golfers.reduce((sum, g) => sum + g.rounds.length, 0);
    const actualPar = roundsPlayed * PAR_PER_ROUND;
    const relativeToPar = totalStrokes - actualPar;
    if (roundsPlayed === 0) return '--';
    if (relativeToPar === 0) return 'E';
    return relativeToPar > 0 ? `+${relativeToPar}` : `${relativeToPar}`;
  };

  // Get status indicator for golfer (cut, wd, etc.)
  const getStatusIndicator = (status) => {
    if (status === 'cut') return { icon: '✂️', color: 'bg-sand-light' };
    if (status === 'wd') return { icon: '🚫', color: 'bg-red-100' };
    return null;
  };

  return (
    <div className="bg-white rounded-xl shadow-country-club overflow-hidden animate-fade-in">
      <div className="bg-augusta-green-600 px-4 py-3">
        <h3 className="font-display text-lg text-white">Tournament Standings</h3>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-clubhouse-beige border-b border-clubhouse-brown">
            <tr>
              <th className="px-2 py-2 text-left font-sans font-semibold text-clubhouse-mahogany w-8"></th>
              <th className="px-2 py-2 text-left font-sans font-semibold text-clubhouse-mahogany">Player</th>
              <th className="px-2 py-2 text-left font-sans font-semibold text-clubhouse-mahogany">Golfer</th>
              <th className="px-1 py-2 text-center font-sans font-semibold text-clubhouse-mahogany w-8">R1</th>
              <th className="px-1 py-2 text-center font-sans font-semibold text-clubhouse-mahogany w-8">R2</th>
              <th className="px-1 py-2 text-center font-sans font-semibold text-clubhouse-mahogany w-8">R3</th>
              <th className="px-1 py-2 text-center font-sans font-semibold text-clubhouse-mahogany w-8">R4</th>
              <th className="px-2 py-2 text-right font-sans font-semibold text-clubhouse-mahogany w-12">Tot</th>
            </tr>
          </thead>
          <tbody>
            {leaderboard.map((user, userIndex) => {
              const golfers = user.golfers || [];
              const isCurrentUser = user.user_id === currentUserId;
              const rowCount = Math.max(golfers.length, 1);

              return golfers.map((golfer, golferIndex) => {
                const statusIndicator = getStatusIndicator(golfer.status);
                const isFirstGolfer = golferIndex === 0;
                const isLastGolfer = golferIndex === golfers.length - 1;

                return (
                  <tr
                    key={`${user.user_id}-${golfer.golfer_id}`}
                    className={`border-b border-clubhouse-beige
                               ${isCurrentUser ? 'bg-augusta-green-50' : 'hover:bg-clubhouse-cream'}
                               ${statusIndicator ? statusIndicator.color : ''}
                               transition-colors duration-150`}
                  >
                    {/* Rank - only on first golfer row */}
                    {isFirstGolfer && (
                      <td
                        rowSpan={rowCount}
                        className={`px-2 py-2 font-sans font-bold text-clubhouse-mahogany text-center align-middle
                                   ${isCurrentUser ? 'border-l-4 border-augusta-green-600' : ''}`}
                      >
                        {user.current_position}
                      </td>
                    )}

                    {/* User name - only on first golfer row */}
                    {isFirstGolfer && (
                      <td
                        rowSpan={rowCount}
                        className="px-2 py-2 font-sans font-semibold text-clubhouse-mahogany align-middle"
                      >
                        {user.username}
                      </td>
                    )}

                    {/* Golfer name */}
                    <td className="px-2 py-1.5 font-sans text-clubhouse-brown">
                      <div className="flex items-center gap-1">
                        <span className="truncate max-w-[100px]">{golfer.name}</span>
                        {statusIndicator && <span className="text-xs">{statusIndicator.icon}</span>}
                      </div>
                    </td>

                    {/* Round scores */}
                    {[1, 2, 3, 4].map(roundNum => {
                      const round = golfer.rounds.find(r => r.round === roundNum);
                      const scoreStr = round ? formatScoreToPar(round.score) : '--';
                      const isUnderPar = round && (round.score - PAR_PER_ROUND) < 0;
                      const isOverPar = round && (round.score - PAR_PER_ROUND) > 0;

                      return (
                        <td
                          key={roundNum}
                          className={`px-1 py-1.5 text-center font-sans text-xs
                                     ${isUnderPar ? 'text-augusta-green-600 font-semibold' : ''}
                                     ${isOverPar ? 'text-error-red' : ''}
                                     ${!isUnderPar && !isOverPar && round ? 'text-clubhouse-brown' : 'text-gray-300'}`}
                        >
                          {scoreStr}
                        </td>
                      );
                    })}

                    {/* Total - only on first golfer row */}
                    {isFirstGolfer && (
                      <td
                        rowSpan={rowCount}
                        className="px-2 py-2 text-right font-sans font-bold text-augusta-green-600 align-middle"
                      >
                        {calculateTotalToPar(golfers)}
                      </td>
                    )}
                  </tr>
                );
              });
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// Draft in progress component with countdown timer
const DraftInProgress = ({ appInfo, navigate }) => {
  const draftWindow = appInfo.current_tournament.draft_window;
  const [timeRemaining, setTimeRemaining] = useState('');

  useEffect(() => {
    const endTime = new Date(draftWindow.end).getTime();

    const updateCountdown = () => {
      const now = Date.now();
      const diff = endTime - now;

      if (diff <= 0) {
        setTimeRemaining('Draft window closed');
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      const parts = [];
      if (days > 0) parts.push(`${days}d`);
      parts.push(`${hours}h`);
      parts.push(`${minutes}m`);
      parts.push(`${seconds}s`);

      setTimeRemaining(parts.join(' '));
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [draftWindow.end]);

  const formatDraftDeadline = (endDate) => {
    return new Date(endDate).toLocaleString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      timeZone: 'America/New_York'
    });
  };

  return (
    <div className="bg-white rounded-xl shadow-country-club p-8 text-center max-w-2xl mx-auto animate-fade-in">
      <div className="w-20 h-20 bg-augusta-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <svg className="w-10 h-10 text-augusta-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <h3 className="font-display text-3xl text-clubhouse-mahogany mb-3">
        Draft In Progress
      </h3>
      <p className="font-sans text-clubhouse-brown mb-2">
        The draft window is currently open. Make your picks before it closes!
      </p>
      <p className="font-sans text-sm text-clubhouse-brown mb-2">
        Draft closes: {formatDraftDeadline(draftWindow.end)}
      </p>
      <p className="font-display text-2xl text-augusta-green-600 mb-6">
        {timeRemaining}
      </p>
      <button
        onClick={() => navigate('/draft')}
        className="bg-augusta-green-600 hover:bg-augusta-green-700
                   text-white font-sans font-bold py-3 px-8 rounded-lg
                   transition-all duration-200 shadow-md hover:shadow-lg"
      >
        Go to Draft
      </button>
    </div>
  );
};

// Off-season Standings component (placeholder)
const OffSeasonStandings = ({ standings, currentYear }) => {
  if (!standings?.data) return null;

  const { season_year, standings: standingsData } = standings.data;

  // Get current user ID from localStorage
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

  return (
    <div className="bg-white rounded-xl shadow-country-club overflow-hidden animate-fade-in">
      <div className="bg-augusta-green-600 px-6 py-4">
        <h2 className="font-display text-2xl text-white">
          {season_year} Season Standings
        </h2>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px]">
          <thead className="bg-clubhouse-beige border-b-2 border-clubhouse-brown">
            <tr>
              <th className="px-6 py-3 text-left font-sans text-sm font-semibold text-clubhouse-mahogany">
                Rank
              </th>
              <th className="px-6 py-3 text-left font-sans text-sm font-semibold text-clubhouse-mahogany">
                Player
              </th>
              <th className="px-6 py-3 text-center font-sans text-sm font-semibold text-clubhouse-mahogany">
                Points
              </th>
              <th className="px-6 py-3 text-center font-sans text-sm font-semibold text-clubhouse-mahogany">
                Played
              </th>
              <th className="px-6 py-3 text-center font-sans text-sm font-semibold text-clubhouse-mahogany">
                Wins
              </th>
              <th className="px-6 py-3 text-center font-sans text-sm font-semibold text-clubhouse-mahogany">
                Top 3
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
                <td className="px-6 py-4 font-sans text-clubhouse-mahogany">
                  {user.rank}
                </td>
                <td className="px-6 py-4 font-sans font-semibold text-clubhouse-mahogany">
                  {user.username}
                </td>
                <td className="px-6 py-4 text-center font-sans font-bold text-augusta-green-600">
                  {user.total_points}
                </td>
                <td className="px-6 py-4 text-center font-sans text-clubhouse-brown">
                  {user.tournaments_played}
                </td>
                <td className="px-6 py-4 text-center font-sans text-clubhouse-brown">
                  {user.wins}
                </td>
                <td className="px-6 py-4 text-center font-sans text-clubhouse-brown">
                  {user.top_3_finishes}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default CurrentTournament;
