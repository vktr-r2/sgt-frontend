import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { tournamentService } from '../services/tournament';
import TournamentLeaderboard from './TournamentLeaderboard';

const Tournament = () => {
  const navigate = useNavigate();
  const currentYear = new Date().getFullYear();

  // Get app info to determine tournament status
  const { data: appInfo, isLoading: isLoadingAppInfo, error: appInfoError } = useQuery({
    queryKey: ['appInfo'],
    queryFn: tournamentService.getAppInfo
  });

  // Helper function to get draft window status
  const getDraftStatus = (tournament) => {
    if (!tournament?.draft_window) return 'no_window';
    return tournament.draft_window.status; // 'before_window', 'open', 'after_window'
  };

  const recentlyCompleted = appInfo?.recently_completed_tournament ?? null;
  const shouldFetchFinalResults = Boolean(recentlyCompleted?.id && !appInfo?.current_tournament);

  // Determine if we should fetch scores or standings based on appInfo
  const shouldFetchScores = Boolean(appInfo && appInfo.current_tournament && getDraftStatus(appInfo.current_tournament) === 'after_window');
  const shouldFetchStandings = Boolean(
    appInfo &&
    !appInfo.current_tournament &&
    !appInfo.recently_completed_tournament
  );

  // Get final results for transition period (recently completed tournament)
  const {
    data: finalResults,
    isLoading: isLoadingFinalResults,
    error: finalResultsError,
    refetch: refetchFinalResults
  } = useQuery({
    queryKey: ['tournamentResults', recentlyCompleted?.id],
    queryFn: () => tournamentService.getTournamentResults(recentlyCompleted.id),
    enabled: shouldFetchFinalResults,
    staleTime: Infinity // Final results never change
  });

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
      // Transition: no current tournament but recently completed one exists
      if (appInfo?.recently_completed_tournament) {
        if (isLoadingFinalResults) return 'loading';
        if (finalResultsError) return 'error';
        return 'post-tournament';
      }

      // Off-season: check if standings are loading or errored
      if (isLoadingStandings) return 'loading';
      if (standingsError) return 'error';
      return 'off-season';
    }

    // There's a tournament - check draft window status
    const draftStatus = getDraftStatus(appInfo.current_tournament);

    if (draftStatus === 'before_window') {
      return 'before-draft';
    }

    if (draftStatus === 'open') {
      return 'draft-in-progress';
    }

    // Draft window is closed (after_window), should show scores
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
    // eslint-disable-next-line no-unused-vars
    const error = appInfoError || scoresError || standingsError || finalResultsError;
    const refetch = finalResultsError ? refetchFinalResults : refetchScores;
    return (
      <div className="bg-red-50 border-l-4 border-error-red rounded-lg p-6 max-w-md mx-auto animate-fade-in">
        <div className="flex items-start gap-3">
          <svg className="w-6 h-6 text-error-red flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="flex-grow">
            <p className="font-sans text-error-red font-medium mb-2">Error loading tournament data</p>
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

  // Before draft window opens
  if (displayMode === 'before-draft') {
    return <BeforeDraft appInfo={appInfo} />;
  }

  // Draft in progress state
  if (displayMode === 'draft-in-progress') {
    return <DraftInProgress appInfo={appInfo} navigate={navigate} />;
  }

  // Off-season state
  if (displayMode === 'off-season') {
    return <OffSeasonStandings standings={standings} currentYear={currentYear} />;
  }

  // Post-tournament transition state
  if (displayMode === 'post-tournament') {
    return (
      <PostTournamentView
        finalResults={finalResults}
        tournament={recentlyCompleted}
        refetch={refetchFinalResults}
      />
    );
  }

  // Active tournament state
  if (displayMode === 'active-tournament') {
    return <ActiveTournament scores={scores} />;
  }

  return null;
};

// Post-Tournament transition component
const PostTournamentView = ({ finalResults, tournament, refetch }) => {
  if (!finalResults?.data) return null;

  const { tournament: tournamentData, results } = finalResults.data;

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

  return (
    <div className="space-y-4">
      {/* Transition banner */}
      <div className="bg-trophy-gold/10 border border-trophy-gold rounded-lg px-4 py-3
                      flex items-center gap-3 animate-slide-up">
        <svg className="w-5 h-5 text-trophy-gold flex-shrink-0" fill="none"
             stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="font-sans text-sm text-clubhouse-mahogany">
          <span className="font-semibold">Tournament complete.</span>{' '}
          Final results for <span className="font-semibold">{tournament.name}</span>.
          {' '}The next draft opens Tuesday.
        </p>
      </div>

      {/* Final results leaderboard */}
      <div className="flex justify-center">
        <div className="w-full max-w-5xl" style={{ width: '75%', minWidth: '320px' }}>
          <TournamentLeaderboard
            leaderboard={results}
            currentUserId={currentUserId}
            tournament={tournamentData}
            mode="final"
          />
        </div>
      </div>
    </div>
  );
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

  return (
    <div className="space-y-6">
      {/* Tournament leaderboard - centered at 75% width */}
      <div className="flex justify-center">
        <div className="w-full max-w-5xl" style={{ width: '75%', minWidth: '320px' }}>
          <TournamentLeaderboard leaderboard={leaderboard} currentUserId={currentUserId} tournament={tournament} />
        </div>
      </div>
    </div>
  );
};

// Before draft window opens component
const BeforeDraft = ({ appInfo }) => {
  const draftWindow = appInfo.current_tournament.draft_window;
  const tournament = appInfo.current_tournament;
  const [timeRemaining, setTimeRemaining] = useState('');

  useEffect(() => {
    const startTime = new Date(draftWindow.start).getTime();

    const updateCountdown = () => {
      const now = Date.now();
      const diff = startTime - now;

      if (diff <= 0) {
        setTimeRemaining('Draft window opening...');
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
  }, [draftWindow.start]);

  const formatDraftOpening = (startDate) => {
    return new Date(startDate).toLocaleString('en-US', {
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
      <div className="w-20 h-20 bg-clubhouse-beige rounded-full flex items-center justify-center mx-auto mb-4">
        <svg className="w-10 h-10 text-clubhouse-brown" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </div>
      <h3 className="font-display text-3xl text-clubhouse-mahogany mb-3">
        {tournament.name}
      </h3>
      <p className="font-sans text-clubhouse-brown mb-2">
        The draft window will open soon. Check back to make your picks!
      </p>
      <p className="font-sans text-sm text-clubhouse-brown mb-2">
        Draft opens: {formatDraftOpening(draftWindow.start)}
      </p>
      <p className="font-display text-2xl text-clubhouse-brown mb-2">
        {timeRemaining}
      </p>
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

export default Tournament;
