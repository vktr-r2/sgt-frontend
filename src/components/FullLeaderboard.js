import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { tournamentService } from '../services/tournament';

const FullLeaderboard = () => {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['fullLeaderboard'],
    queryFn: () => tournamentService.getFullLeaderboard(),
    staleTime: 2 * 60 * 1000, // 2 minutes - more frequent updates for live leaderboard
    refetchInterval: 5 * 60 * 1000, // Auto-refresh every 5 minutes
  });

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-country-club overflow-hidden animate-fade-in">
        <div className="bg-augusta-green-600 px-4 py-3">
          <h3 className="font-display text-lg text-white">Tournament Leaderboard</h3>
        </div>
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-augusta-green-600 mb-2"></div>
            <p className="font-sans text-clubhouse-brown text-sm">Loading leaderboard...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl shadow-country-club overflow-hidden animate-fade-in">
        <div className="bg-augusta-green-600 px-4 py-3">
          <h3 className="font-display text-lg text-white">Tournament Leaderboard</h3>
        </div>
        <div className="p-6 text-center">
          <p className="text-error-red mb-4">Failed to load leaderboard</p>
          <button
            onClick={() => refetch()}
            className="px-4 py-2 bg-augusta-green-600 text-white rounded-lg hover:bg-augusta-green-700 transition-colors"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  const leaderboardData = data?.data;

  // No tournament or no players
  if (!leaderboardData?.tournament || !leaderboardData?.players?.length) {
    return null;
  }

  const { tournament, current_round, cut_line, fetched_at, players } = leaderboardData;

  // Find the index where cut players start (for separator)
  const cutLineIndex = cut_line ? players.findIndex(p =>
    p.status === 'cut' || p.position?.toString().toUpperCase() === 'CUT'
  ) : -1;

  // Format timestamp to EST
  const formatTimestamp = (isoString) => {
    if (!isoString) return null;
    const date = new Date(isoString);
    return date.toLocaleString('en-US', {
      timeZone: 'America/New_York',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    }) + ' EST';
  };

  return (
    <div className="bg-white rounded-xl shadow-country-club overflow-hidden animate-fade-in">
      {/* Header */}
      <div className="bg-augusta-green-600 px-4 py-3">
        <div className="flex justify-between items-center">
          <h3 className="font-display text-lg text-white">
            Tournament Leaderboard
          </h3>
          <div className="flex items-center gap-4 text-white text-sm font-sans">
            {current_round && (
              <span>Round {current_round}</span>
            )}
            {cut_line && (
              <span className="bg-white/20 px-2 py-1 rounded">
                Cut: {cut_line.score} ({cut_line.count} players)
              </span>
            )}
          </div>
        </div>
        {fetched_at && (
          <p className="text-white/70 text-xs font-sans mt-1">
            Accurate as of {formatTimestamp(fetched_at)}
          </p>
        )}
      </div>

      {/* Scrollable Table Container */}
      <div className="h-[30vh] overflow-y-auto overflow-x-auto">
        <table className="w-full text-sm min-w-[600px]">
          <thead className="bg-clubhouse-beige border-b border-clubhouse-brown sticky top-0 z-10">
            <tr>
              <th className="px-3 py-2 text-left font-sans font-semibold text-clubhouse-mahogany w-16">Pos</th>
              <th className="px-3 py-2 text-left font-sans font-semibold text-clubhouse-mahogany">Player</th>
              <th className="px-3 py-2 text-center font-sans font-semibold text-clubhouse-mahogany w-12">R1</th>
              <th className="px-3 py-2 text-center font-sans font-semibold text-clubhouse-mahogany w-12">R2</th>
              <th className="px-3 py-2 text-center font-sans font-semibold text-clubhouse-mahogany w-12">R3</th>
              <th className="px-3 py-2 text-center font-sans font-semibold text-clubhouse-mahogany w-12">R4</th>
              <th className="px-3 py-2 text-center font-sans font-semibold text-clubhouse-mahogany w-16">Total</th>
              <th className="px-3 py-2 text-center font-sans font-semibold text-clubhouse-mahogany w-16">To Par</th>
            </tr>
          </thead>
          <tbody>
            {players.map((player, index) => (
              <React.Fragment key={player.player_id}>
                {/* Cut Line Separator */}
                {cutLineIndex === index && cutLineIndex > 0 && (
                  <tr className="bg-sand border-y-2 border-dashed border-clubhouse-brown">
                    <td colSpan="8" className="px-3 py-2 text-center font-sans text-sm text-clubhouse-brown">
                      ✂️ Projected Cut Line: {cut_line.score} ({cut_line.count} players make the cut)
                    </td>
                  </tr>
                )}
                <PlayerRow
                  player={player}
                  index={index}
                  par={tournament.par}
                  isBelowCut={cutLineIndex > 0 && index >= cutLineIndex}
                />
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const PlayerRow = ({ player, index, par, isBelowCut }) => {
  const { name, position, status, total_strokes, total_to_par, rounds, drafted_by } = player;

  // Get round score by round number
  const getRoundScore = (roundNum) => {
    const round = rounds?.find(r => r.round === roundNum);
    return round?.score || '-';
  };

  // Format to-par display
  const formatToPar = (toPar) => {
    if (toPar === null || toPar === undefined) return '-';
    if (toPar === 0) return 'E';
    if (toPar > 0) return `+${toPar}`;
    return toPar.toString();
  };

  // Determine row styling
  const getRowClasses = () => {
    let classes = 'border-b border-clubhouse-beige transition-colors duration-150 ';

    if (drafted_by) {
      classes += 'bg-augusta-green-50 border-l-4 border-l-augusta-green-600 ';
    } else if (isBelowCut) {
      classes += 'bg-gray-50 text-gray-500 ';
    } else {
      classes += 'hover:bg-clubhouse-cream ';
    }

    // Stagger animation for first 8 rows
    if (index < 8) {
      classes += `animate-stagger-${index + 1}`;
    }

    return classes;
  };

  // Get to-par color
  const getToParColor = () => {
    if (total_to_par === null || total_to_par === undefined) return 'text-clubhouse-brown';
    if (total_to_par < 0) return 'text-augusta-green-600 font-semibold';
    if (total_to_par > 0) return 'text-error-red';
    return 'text-clubhouse-brown';
  };

  // Status indicator
  const getStatusBadge = () => {
    if (status === 'cut') return <span className="ml-1 text-xs text-gray-400">(CUT)</span>;
    if (status === 'wd') return <span className="ml-1 text-xs text-gray-400">(WD)</span>;
    return null;
  };

  return (
    <tr className={getRowClasses()}>
      <td className="px-3 py-2 font-sans text-clubhouse-mahogany font-medium">
        {position || '-'}
      </td>
      <td className="px-3 py-2 font-sans text-clubhouse-mahogany">
        <span className={drafted_by ? 'font-semibold' : ''}>
          {name}
        </span>
        {drafted_by && (
          <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-augusta-green-600 text-white">
            {drafted_by}
          </span>
        )}
        {getStatusBadge()}
      </td>
      <td className="px-3 py-2 text-center font-sans text-clubhouse-brown">{getRoundScore(1)}</td>
      <td className="px-3 py-2 text-center font-sans text-clubhouse-brown">{getRoundScore(2)}</td>
      <td className="px-3 py-2 text-center font-sans text-clubhouse-brown">{getRoundScore(3)}</td>
      <td className="px-3 py-2 text-center font-sans text-clubhouse-brown">{getRoundScore(4)}</td>
      <td className="px-3 py-2 text-center font-sans text-clubhouse-brown font-medium">
        {total_strokes || '-'}
      </td>
      <td className={`px-3 py-2 text-center font-sans ${getToParColor()}`}>
        {formatToPar(total_to_par)}
      </td>
    </tr>
  );
};

export default FullLeaderboard;
