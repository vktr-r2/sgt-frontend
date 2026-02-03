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

// Active Tournament component
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
      {/* Tournament leaderboard - centered at 75% width */}
      <div className="flex justify-center">
        <div className="w-full max-w-5xl" style={{ width: '75%', minWidth: '320px' }}>
          <TournamentLeaderboard leaderboard={leaderboard} currentUserId={currentUserId} tournament={tournament} />
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

// Tournament Leaderboard component - shows all users' standings
const TournamentLeaderboard = ({ leaderboard, currentUserId, tournament }) => {
  const PAR_PER_ROUND = 72;
  const currentRound = tournament?.current_round || 1;

  // Format thru display (e.g., "F" for finished, "12" for in-progress)
  const formatThru = (thru) => {
    if (!thru) return null;
    if (thru === '18') return 'F';
    return thru;
  };

  // Convert raw score to par-relative string (E, -2, +3, etc.)
  const formatScoreToPar = (rawScore) => {
    if (rawScore === null || rawScore === undefined) return '--';
    const relativeScore = rawScore - PAR_PER_ROUND;
    if (relativeScore === 0) return 'E';
    return relativeScore > 0 ? `+${relativeScore}` : `${relativeScore}`;
  };

  // Format position with ordinal suffix (1st, 2nd, 3rd, T5th, etc.)
  const formatPositionOrdinal = (position) => {
    if (!position) return '';
    const posStr = position.toString().toUpperCase();

    // Handle special cases
    if (posStr === 'CUT' || posStr === 'WD' || posStr === 'DQ') return '';

    // Extract numeric part and check for tie prefix
    const isTied = posStr.startsWith('T');
    const numPart = parseInt(posStr.replace(/[^0-9]/g, ''), 10);

    if (isNaN(numPart)) return '';

    // Get ordinal suffix
    const getOrdinalSuffix = (n) => {
      const s = ['th', 'st', 'nd', 'rd'];
      const v = n % 100;
      return s[(v - 20) % 10] || s[v] || s[0];
    };

    const suffix = getOrdinalSuffix(numPart);
    return isTied ? `T${numPart}${suffix}` : `${numPart}${suffix}`;
  };

  // Calculate golfer's total score relative to par
  const calculateGolferTotalToPar = (golfer) => {
    if (!golfer.rounds || golfer.rounds.length === 0) return '--';
    const totalStrokes = golfer.rounds.reduce((sum, r) => sum + (r.score || 0), 0);
    if (totalStrokes === 0) return '--';
    const roundsPlayed = golfer.rounds.filter(r => r.score).length;
    const parForRounds = roundsPlayed * PAR_PER_ROUND;
    const relativeToPar = totalStrokes - parForRounds;
    if (relativeToPar === 0) return 'E';
    return relativeToPar > 0 ? `+${relativeToPar}` : `${relativeToPar}`;
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
    if (status === 'cut') return { icon: '✂️', color: 'bg-red-100' };
    if (status === 'wd') return { icon: '🚫', color: 'bg-red-200' };
    return null;
  };

  return (
    <div className="bg-white rounded-xl shadow-country-club overflow-hidden animate-fade-in">
      <div className="bg-augusta-green-600 px-4 py-3 text-left">
        <h3 className="font-display text-lg text-white">
          <span className="font-bold">Current Tournament:</span> {tournament?.name}
        </h3>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-clubhouse-beige border-b border-clubhouse-brown">
            <tr>
              <th className="px-2 py-2 text-left font-sans font-semibold text-clubhouse-mahogany w-10"></th>
              <th className="px-2 py-2 text-left font-sans font-semibold text-clubhouse-mahogany w-24">Player</th>
              <th className="px-2 py-2 text-left font-sans font-semibold text-clubhouse-mahogany">Golfer</th>
              <th className="px-2 py-2 text-center font-sans font-semibold text-clubhouse-mahogany">R1</th>
              <th className="px-2 py-2 text-center font-sans font-semibold text-clubhouse-mahogany">R2</th>
              <th className="px-2 py-2 text-center font-sans font-semibold text-clubhouse-mahogany">R3</th>
              <th className="px-2 py-2 text-center font-sans font-semibold text-clubhouse-mahogany">R4</th>
              <th className="px-2 py-2 text-center font-sans font-semibold text-clubhouse-mahogany w-14">Tot</th>
              <th className="px-3 py-2 text-center font-sans font-semibold text-clubhouse-mahogany w-16 border-l-2 border-clubhouse-brown">Team</th>
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
                    className={`${isLastGolfer ? 'border-b-2 border-clubhouse-brown' : 'border-b border-clubhouse-beige'}
                               ${isCurrentUser && !statusIndicator ? 'bg-augusta-green-50' : ''}
                               ${!isCurrentUser && !statusIndicator ? 'hover:bg-clubhouse-cream' : ''}
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

                    {/* Golfer name with position */}
                    <td className={`px-2 py-1.5 font-sans text-clubhouse-brown ${statusIndicator ? statusIndicator.color : ''}`}>
                      <div className="flex items-center gap-1">
                        <span>
                          {golfer.name}
                          {formatPositionOrdinal(golfer.position) && (
                            <span className="text-clubhouse-brown/70 ml-1">
                              ({formatPositionOrdinal(golfer.position)})
                            </span>
                          )}
                        </span>
                        {statusIndicator && <span className="text-xs">{statusIndicator.icon}</span>}
                      </div>
                    </td>

                    {/* Round scores */}
                    {[1, 2, 3, 4].map(roundNum => {
                      const round = golfer.rounds.find(r => r.round === roundNum);
                      const scoreStr = round ? formatScoreToPar(round.score) : '--';
                      const isUnderPar = round && (round.score - PAR_PER_ROUND) < 0;
                      const isOverPar = round && (round.score - PAR_PER_ROUND) > 0;
                      const isCurrentRound = roundNum === currentRound;
                      const thru = round?.thru ? formatThru(round.thru) : null;
                      // Only show thru for current round, active golfers (not cut/wd)
                      const isActiveGolfer = golfer.status === 'active' || golfer.status === 'complete';
                      const showThru = isCurrentRound && round && thru && isActiveGolfer;

                      return (
                        <td
                          key={roundNum}
                          className={`px-2 py-1.5 text-center font-sans text-sm
                                     ${statusIndicator ? statusIndicator.color : ''}
                                     ${isUnderPar ? 'text-augusta-green-600 font-semibold' : ''}
                                     ${isOverPar ? 'text-error-red' : ''}
                                     ${!isUnderPar && !isOverPar && round ? 'text-clubhouse-brown' : 'text-clubhouse-brown'}`}
                        >
                          <span className="relative inline-block">
                            {scoreStr}
                            {showThru && (
                              <span className="absolute left-full ml-0.5 text-xs text-clubhouse-brown/70 whitespace-nowrap">
                                ({thru})
                              </span>
                            )}
                          </span>
                        </td>
                      );
                    })}

                    {/* Golfer total to par */}
                    <td className={`px-2 py-1.5 text-center font-sans text-sm
                                   ${statusIndicator ? statusIndicator.color : ''}
                                   ${calculateGolferTotalToPar(golfer).startsWith('-') ? 'text-augusta-green-600 font-semibold' : ''}
                                   ${calculateGolferTotalToPar(golfer).startsWith('+') ? 'text-error-red' : ''}
                                   ${!calculateGolferTotalToPar(golfer).startsWith('-') && !calculateGolferTotalToPar(golfer).startsWith('+') ? 'text-clubhouse-brown' : ''}`}>
                      {calculateGolferTotalToPar(golfer)}
                    </td>

                    {/* User total - only on first golfer row */}
                    {isFirstGolfer && (
                      <td
                        rowSpan={rowCount}
                        className="px-3 py-2 text-center font-sans text-lg font-bold text-augusta-green-600 align-middle border-l-2 border-clubhouse-brown"
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
