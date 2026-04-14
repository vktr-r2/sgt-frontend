import React from 'react';

const TournamentLeaderboard = ({ leaderboard, currentUserId, tournament, mode = 'live', title = null }) => {
  const parPerRound = tournament?.par || 72;
  const currentRound = tournament?.current_round || 1;
  const isLiveMode = mode === 'live';

  // Format thru display (e.g., "F" for finished, "9" for in-progress)
  const formatThru = (thru) => {
    if (!thru) return null;
    if (thru === '18') return 'F';
    return thru;
  };

  // Convert raw score to par-relative string (E, -2, +3, etc.)
  const formatScoreToPar = (rawScore) => {
    if (rawScore === null || rawScore === undefined) return '--';
    const relativeScore = rawScore - parPerRound;
    if (relativeScore === 0) return 'E';
    return relativeScore > 0 ? `+${relativeScore}` : `${relativeScore}`;
  };

  // Format position with ordinal suffix (1st, 2nd, 3rd, T5th, etc.)
  const formatPositionOrdinal = (position) => {
    if (!position) return '';
    const posStr = position.toString().toUpperCase();

    if (posStr === 'CUT' || posStr === 'WD' || posStr === 'DQ') return '';

    const isTied = posStr.startsWith('T');
    const numPart = parseInt(posStr.replace(/[^0-9]/g, ''), 10);

    if (isNaN(numPart)) return '';

    const getOrdinalSuffix = (n) => {
      const s = ['th', 'st', 'nd', 'rd'];
      const v = n % 100;
      return s[(v - 20) % 10] || s[v] || s[0];
    };

    const suffix = getOrdinalSuffix(numPart);
    return isTied ? `T${numPart}${suffix}` : `${numPart}${suffix}`;
  };

  // Calculate golfer's total score relative to par (live mode)
  const calculateGolferTotalToPar = (golfer) => {
    if (!golfer.rounds || golfer.rounds.length === 0) return '--';
    const totalStrokes = golfer.rounds.reduce((sum, r) => sum + (r.score || 0), 0);
    if (totalStrokes === 0) return '--';
    const roundsPlayed = golfer.rounds.filter(r => r.score).length;
    const parForRounds = roundsPlayed * parPerRound;
    const relativeToPar = totalStrokes - parForRounds;
    if (relativeToPar === 0) return 'E';
    return relativeToPar > 0 ? `+${relativeToPar}` : `${relativeToPar}`;
  };

  // Calculate total score relative to par for a user (live and final mode)
  const calculateTotalToPar = (golfers) => {
    const totalStrokes = golfers.reduce((sum, g) => {
      const golferTotal = (g.rounds || []).reduce((rSum, r) => rSum + (r.score || 0), 0);
      return sum + golferTotal;
    }, 0);
    const roundsPlayed = golfers.reduce((sum, g) => sum + (g.rounds || []).length, 0);
    const actualPar = roundsPlayed * parPerRound;
    const relativeToPar = totalStrokes - actualPar;
    if (roundsPlayed === 0) return '--';
    if (relativeToPar === 0) return 'E';
    return relativeToPar > 0 ? `+${relativeToPar}` : `${relativeToPar}`;
  };

  // Parse cut line score string to numeric value
  const parseCutLineScore = (scoreStr) => {
    if (!scoreStr) return null;
    if (scoreStr === 'E') return 0;
    return parseInt(scoreStr, 10);
  };

  // Check if golfer is below the cut line based on their score
  const isBelowCutLine = (golfer) => {
    if (currentRound < 2) return false;
    if (!tournament?.cut_line?.score) return false;
    if (golfer.status === 'cut' || golfer.status === 'wd') return false;

    const completedRounds = golfer.rounds ? golfer.rounds.filter(r => r.score) : [];
    if (completedRounds.length < 2) return false;

    // Cut eligibility is determined only by rounds 1 and 2 — never use R3/R4 scores
    const round1 = golfer.rounds.find(r => r.round === 1);
    const round2 = golfer.rounds.find(r => r.round === 2);
    if (!round1?.score || !round2?.score) return false;

    const twoRoundStrokes = round1.score + round2.score;
    const parFor2Rounds = 2 * parPerRound;
    const golferToPar = twoRoundStrokes - parFor2Rounds;

    const cutLine = parseCutLineScore(tournament.cut_line.score);
    if (cutLine === null) return false;

    return golferToPar > cutLine;
  };

  // Get status indicator for golfer (cut, wd, etc.)
  const getStatusIndicator = (golfer) => {
    if (golfer.status === 'cut') return { icon: '✂️', color: 'bg-red-100' };
    if (golfer.status === 'wd') return { icon: '🚫', color: 'bg-red-200' };
    if (isLiveMode && isBelowCutLine(golfer)) return { icon: '✂️', color: 'bg-red-100' };
    return null;
  };

  // Render the header content
  const renderHeader = () => {
    if (title) return title;
    if (isLiveMode) {
      return (
        <>
          <span className="font-bold">Current Tournament:</span> {tournament?.name}
        </>
      );
    }
    return tournament?.name;
  };

  return (
    <div className="bg-white rounded-xl shadow-country-club overflow-hidden animate-fade-in">
      <div className="bg-augusta-green-600 px-4 py-3 text-left">
        <h3 className="font-display text-lg text-white">
          {renderHeader()}
        </h3>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-clubhouse-beige border-b border-clubhouse-brown">
            <tr>
              <th className="px-2 py-2 text-left font-sans font-semibold text-clubhouse-mahogany w-10"></th>
              <th className="px-2 py-2 text-left font-sans font-semibold text-clubhouse-mahogany w-24">Player</th>
              <th className="px-2 py-2 text-left font-sans font-semibold text-clubhouse-mahogany">Golfer</th>
              {isLiveMode ? (
                <>
                  <th className="px-2 py-2 text-center font-sans font-semibold text-clubhouse-mahogany">R1</th>
                  <th className="px-2 py-2 text-center font-sans font-semibold text-clubhouse-mahogany">R2</th>
                  <th className="px-2 py-2 text-center font-sans font-semibold text-clubhouse-mahogany">R3</th>
                  <th className="px-2 py-2 text-center font-sans font-semibold text-clubhouse-mahogany">R4</th>
                  <th className="px-2 py-2 text-center font-sans font-semibold text-clubhouse-mahogany w-14">Tot</th>
                  <th className="px-3 py-2 text-center font-sans font-semibold text-clubhouse-mahogany w-16 border-l-2 border-clubhouse-brown">Team</th>
                </>
              ) : (
                <>
                  <th className="px-2 py-2 text-center font-sans font-semibold text-clubhouse-mahogany">R1</th>
                  <th className="px-2 py-2 text-center font-sans font-semibold text-clubhouse-mahogany">R2</th>
                  <th className="px-2 py-2 text-center font-sans font-semibold text-clubhouse-mahogany">R3</th>
                  <th className="px-2 py-2 text-center font-sans font-semibold text-clubhouse-mahogany">R4</th>
                  <th className="px-2 py-2 text-center font-sans font-semibold text-clubhouse-mahogany w-14">Score</th>
                  <th className="px-2 py-2 text-center font-sans font-semibold text-clubhouse-mahogany w-16">Strokes</th>
                  <th className="px-3 py-2 text-center font-sans font-semibold text-clubhouse-mahogany w-16 border-l-2 border-clubhouse-brown">Tourn</th>
                  <th className="px-3 py-2 text-center font-sans font-semibold text-clubhouse-mahogany w-16 border-l-2 border-clubhouse-brown">Season</th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {leaderboard.map((user) => {
              const golfers = user.golfers || [];
              const isCurrentUser = user.user_id === currentUserId;
              const userRank = isLiveMode ? user.current_position : user.place;
              const rowCount = Math.max(golfers.length, 1);

              return golfers.map((golfer, golferIndex) => {
                const statusIndicator = getStatusIndicator(golfer);
                const isFirstGolfer = golferIndex === 0;
                const isLastGolfer = golferIndex === golfers.length - 1;

                return (
                  <tr
                    key={`${user.user_id}-${golfer.golfer_id || golfer.name}-${golferIndex}`}
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
                        {userRank}
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
                    <td className={`px-2 py-1.5 font-sans text-clubhouse-brown ${statusIndicator ? statusIndicator.color : ''}`}>
                      <div className="flex items-center gap-1">
                        <span>
                          {golfer.name}
                          {isLiveMode && formatPositionOrdinal(golfer.position) && (
                            <span className="text-clubhouse-brown/70 ml-1">
                              ({formatPositionOrdinal(golfer.position)})
                            </span>
                          )}
                        </span>
                        {!isLiveMode && golfer.was_replaced && (
                          <span className="text-xs text-amber-600 font-semibold" title="Original golfer was replaced">↔</span>
                        )}
                        {statusIndicator && <span className="text-xs">{statusIndicator.icon}</span>}
                      </div>
                    </td>

                    {/* Score columns */}
                    {isLiveMode ? (
                      <>
                        {[1, 2, 3, 4].map(roundNum => {
                          const round = golfer.rounds ? golfer.rounds.find(r => r.round === roundNum) : null;
                          const scoreStr = round ? formatScoreToPar(round.score) : '--';
                          const isUnderPar = round && (round.score - parPerRound) < 0;
                          const isOverPar = round && (round.score - parPerRound) > 0;
                          const isCurrentRound = roundNum === currentRound;
                          const thru = round?.thru ? formatThru(round.thru) : null;
                          const isActiveGolfer = (golfer.status === 'active' || golfer.status === 'complete') && !isBelowCutLine(golfer);
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
                      </>
                    ) : (
                      <>
                        {/* R1–R4 raw strokes per round */}
                        {[1, 2, 3, 4].map(roundNum => {
                          const round = (golfer.rounds || []).find(r => r.round === roundNum);
                          return (
                            <td
                              key={roundNum}
                              className={`px-2 py-1.5 text-center font-sans text-sm text-clubhouse-brown ${statusIndicator ? statusIndicator.color : ''}`}
                            >
                              {round ? round.score : '--'}
                            </td>
                          );
                        })}

                        {/* Score: golfer total to par */}
                        {(() => {
                          const scoreToPar = calculateGolferTotalToPar(golfer);
                          const isUnder = scoreToPar.toString().startsWith('-');
                          const isOver = scoreToPar.toString().startsWith('+');
                          return (
                            <td className={`px-2 py-1.5 text-center font-sans text-sm
                                           ${statusIndicator ? statusIndicator.color : ''}
                                           ${isUnder ? 'text-augusta-green-600 font-semibold' : ''}
                                           ${isOver ? 'text-error-red' : ''}
                                           ${!isUnder && !isOver ? 'text-clubhouse-brown' : ''}`}>
                              {scoreToPar}
                            </td>
                          );
                        })()}

                        {/* Strokes: raw total */}
                        <td className={`px-2 py-1.5 text-center font-sans text-sm text-clubhouse-brown ${statusIndicator ? statusIndicator.color : ''}`}>
                          {golfer.total_score || '--'}
                        </td>

                        {/* Tourn: combined team to-par — only on first golfer row */}
                        {isFirstGolfer && (
                          <td
                            rowSpan={rowCount}
                            className="px-3 py-2 text-center font-sans text-lg font-bold text-augusta-green-600 align-middle border-l-2 border-clubhouse-brown"
                          >
                            {calculateTotalToPar(golfers)}
                          </td>
                        )}

                        {/* Season: SGT points — only on first golfer row */}
                        {isFirstGolfer && (
                          <td
                            rowSpan={rowCount}
                            className="px-3 py-2 text-center font-sans text-lg font-bold text-augusta-green-600 align-middle border-l-2 border-clubhouse-brown"
                          >
                            {user.total_points}
                          </td>
                        )}
                      </>
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

export default TournamentLeaderboard;
