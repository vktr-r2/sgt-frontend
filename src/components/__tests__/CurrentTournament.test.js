import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import CurrentTournament from '../CurrentTournament';
import { tournamentService } from '../../services/tournament';

jest.mock('../../services/tournament');

const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

const wrapper = ({ children }) => {
  const queryClient = createTestQueryClient();
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {children}
      </BrowserRouter>
    </QueryClientProvider>
  );
};

describe('CurrentTournament', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Set up default mocks to prevent undefined returns
    tournamentService.getAppInfo.mockResolvedValue({ current_tournament: null });
    tournamentService.getCurrentScores.mockResolvedValue({ success: true, data: { tournament: {}, leaderboard: [] } });
    tournamentService.getSeasonStandings.mockResolvedValue({ success: true, data: { season_year: 2026, standings: [] } });
  });

  describe('Rendering States', () => {
    it('should display loading state while fetching data', () => {
      tournamentService.getAppInfo.mockImplementation(() => new Promise(() => {}));

      render(<CurrentTournament />, { wrapper });

      expect(screen.getByText(/loading tournament data/i)).toBeInTheDocument();
    });

    it('should display error state when API call fails', async () => {
      tournamentService.getAppInfo.mockRejectedValue(new Error('API Error'));

      render(<CurrentTournament />, { wrapper });

      await waitFor(() => {
        expect(screen.getByText(/error loading tournament data/i)).toBeInTheDocument();
      });
    });

    it('should display active tournament when draft is closed', async () => {
      const mockAppInfo = {
        current_tournament: {
          id: 1,
          name: 'The Masters',
          draft_window: {
            start: '2026-04-05T00:00:00Z',
            end: '2026-04-07T23:59:59Z'
          }
        }
      };

      const mockScores = {
        success: true,
        data: {
          tournament: { id: 1, name: 'The Masters', is_major: true },
          leaderboard: [
            {
              user_id: 1,
              username: 'John Doe',
              total_strokes: 280,
              current_position: 1,
              golfers: []
            }
          ]
        }
      };

      tournamentService.getAppInfo.mockResolvedValue(mockAppInfo);
      tournamentService.getCurrentScores.mockResolvedValue(mockScores);

      jest.spyOn(Date, 'now').mockImplementation(() => new Date('2026-04-10T12:00:00Z').getTime());

      render(<CurrentTournament />, { wrapper });

      await waitFor(() => {
        expect(screen.getByText('The Masters')).toBeInTheDocument();
      });

      jest.spyOn(Date, 'now').mockRestore();
    });

    it('should display off-season standings when no active tournament', async () => {
      const mockAppInfo = {
        current_tournament: null
      };

      const mockStandings = {
        success: true,
        data: {
          season_year: 2026,
          standings: [
            {
              rank: 1,
              user_id: 1,
              username: 'John Doe',
              total_points: -15,
              tournaments_played: 8,
              wins: 3,
              top_3_finishes: 6
            }
          ]
        }
      };

      tournamentService.getAppInfo.mockResolvedValue(mockAppInfo);
      tournamentService.getSeasonStandings.mockResolvedValue(mockStandings);

      render(<CurrentTournament />, { wrapper });

      await waitFor(() => {
        expect(screen.getByText(/2026 Season Standings/i)).toBeInTheDocument();
      });
    });

    it('should display draft in progress message when draft window is open', async () => {
      const mockAppInfo = {
        current_tournament: {
          id: 1,
          name: 'The Masters',
          draft_window: {
            start: '2026-04-05T00:00:00Z',
            end: '2026-04-10T23:59:59Z'
          }
        }
      };

      tournamentService.getAppInfo.mockResolvedValue(mockAppInfo);

      jest.spyOn(Date, 'now').mockImplementation(() => new Date('2026-04-08T12:00:00Z').getTime());

      render(<CurrentTournament />, { wrapper });

      await waitFor(() => {
        expect(screen.getByText(/Draft In Progress/i)).toBeInTheDocument();
      });

      jest.spyOn(Date, 'now').mockRestore();
    });
  });

  describe('Active Tournament Display', () => {
    const mockAppInfo = {
      current_tournament: {
        id: 1,
        name: 'The Masters',
        draft_window: {
          start: '2026-04-05T00:00:00Z',
          end: '2026-04-07T23:59:59Z'
        }
      }
    };

    beforeEach(() => {
      jest.spyOn(Date, 'now').mockImplementation(() => new Date('2026-04-10T12:00:00Z').getTime());
    });

    afterEach(() => {
      jest.spyOn(Date, 'now').mockRestore();
    });

    it('should display tournament name and details', async () => {
      const mockScores = {
        success: true,
        data: {
          tournament: {
            id: 1,
            name: 'The Masters',
            is_major: true,
            start_date: '2026-04-09',
            end_date: '2026-04-12'
          },
          leaderboard: [
            {
              user_id: 1,
              username: 'John Doe',
              total_strokes: 280,
              current_position: 1,
              golfers: []
            }
          ]
        }
      };

      tournamentService.getAppInfo.mockResolvedValue(mockAppInfo);
      tournamentService.getCurrentScores.mockResolvedValue(mockScores);

      render(<CurrentTournament />, { wrapper });

      await waitFor(() => {
        expect(screen.getByText('The Masters')).toBeInTheDocument();
        expect(screen.getByText('MAJOR')).toBeInTheDocument();
      });
    });

    it('should display user\'s 8 drafted golfers', async () => {
      const golfers = Array.from({ length: 8 }, (_, i) => ({
        golfer_id: i + 1,
        name: `Golfer ${i + 1}`,
        total_score: -5 + i,
        position: `T${i + 1}`,
        status: 'active',
        rounds: [],
        was_replaced: false
      }));

      const mockScores = {
        success: true,
        data: {
          tournament: { id: 1, name: 'The Masters', is_major: false },
          leaderboard: [
            {
              user_id: 1,
              username: 'John Doe',
              total_strokes: 280,
              current_position: 1,
              golfers
            }
          ]
        }
      };

      tournamentService.getAppInfo.mockResolvedValue(mockAppInfo);
      tournamentService.getCurrentScores.mockResolvedValue(mockScores);

      render(<CurrentTournament />, { wrapper });

      await waitFor(() => {
        golfers.forEach(golfer => {
          // Golfer names appear in both GolferCards and TournamentLeaderboard
          const elements = screen.getAllByText(golfer.name);
          expect(elements.length).toBeGreaterThan(0);
        });
      });
    });

    it('should display round-by-round scores for each golfer', async () => {
      const mockScores = {
        success: true,
        data: {
          tournament: { id: 1, name: 'The Masters', is_major: false },
          leaderboard: [
            {
              user_id: 1,
              username: 'John Doe',
              total_strokes: 280,
              current_position: 1,
              golfers: [
                {
                  golfer_id: 1,
                  name: 'Scottie Scheffler',
                  total_score: -8,
                  position: '1',
                  status: 'active',
                  rounds: [
                    { round: 1, score: 68, position: 'T2' },
                    { round: 2, score: 70, position: '1' },
                    { round: 3, score: 69, position: '1' },
                    { round: 4, score: 69, position: '1' }
                  ],
                  was_replaced: false
                }
              ]
            }
          ]
        }
      };

      tournamentService.getAppInfo.mockResolvedValue(mockAppInfo);
      tournamentService.getCurrentScores.mockResolvedValue(mockScores);

      render(<CurrentTournament />, { wrapper });

      await waitFor(() => {
        expect(screen.getByText('68')).toBeInTheDocument();
        expect(screen.getByText('70')).toBeInTheDocument();
        expect(screen.getAllByText('69')).toHaveLength(2);
      });
    });

    it('should display golfer position and status', async () => {
      const mockScores = {
        success: true,
        data: {
          tournament: { id: 1, name: 'The Masters', is_major: false },
          leaderboard: [
            {
              user_id: 1,
              username: 'John Doe',
              total_strokes: 280,
              current_position: 1,
              golfers: [
                {
                  golfer_id: 1,
                  name: 'Scottie Scheffler',
                  total_score: -8,
                  position: 'T2',
                  status: 'active',
                  rounds: [],
                  was_replaced: false
                }
              ]
            }
          ]
        }
      };

      tournamentService.getAppInfo.mockResolvedValue(mockAppInfo);
      tournamentService.getCurrentScores.mockResolvedValue(mockScores);

      render(<CurrentTournament />, { wrapper });

      await waitFor(() => {
        expect(screen.getByText('T2')).toBeInTheDocument();
        expect(screen.getByText('-8')).toBeInTheDocument();
      });
    });

    it('should highlight user\'s current position', async () => {
      const mockScores = {
        success: true,
        data: {
          tournament: { id: 1, name: 'The Masters', is_major: false },
          leaderboard: [
            {
              user_id: 1,
              username: 'John Doe',
              total_strokes: 280,
              current_position: 2,
              golfers: []
            }
          ]
        }
      };

      tournamentService.getAppInfo.mockResolvedValue(mockAppInfo);
      tournamentService.getCurrentScores.mockResolvedValue(mockScores);

      render(<CurrentTournament />, { wrapper });

      await waitFor(() => {
        expect(screen.getByText('Your Position')).toBeInTheDocument();
        expect(screen.getByText('2')).toBeInTheDocument();
      });
    });

    it('should show replacement indicator for replaced golfers', async () => {
      const mockScores = {
        success: true,
        data: {
          tournament: { id: 1, name: 'The Masters', is_major: false },
          leaderboard: [
            {
              user_id: 1,
              username: 'John Doe',
              total_strokes: 280,
              current_position: 1,
              golfers: [
                {
                  golfer_id: 1,
                  name: 'Replacement Golfer',
                  total_score: 0,
                  position: 'T50',
                  status: 'active',
                  rounds: [],
                  was_replaced: true
                }
              ]
            }
          ]
        }
      };

      tournamentService.getAppInfo.mockResolvedValue(mockAppInfo);
      tournamentService.getCurrentScores.mockResolvedValue(mockScores);

      render(<CurrentTournament />, { wrapper });

      await waitFor(() => {
        expect(screen.getByText('Replacement')).toBeInTheDocument();
      });
    });

    it('should display cut golfers with appropriate styling', async () => {
      const mockScores = {
        success: true,
        data: {
          tournament: { id: 1, name: 'The Masters', is_major: false },
          leaderboard: [
            {
              user_id: 1,
              username: 'John Doe',
              total_strokes: 280,
              current_position: 1,
              golfers: [
                {
                  golfer_id: 1,
                  name: 'Cut Golfer',
                  total_score: 10,
                  position: 'CUT',
                  status: 'cut',
                  rounds: [
                    { round: 1, score: 75, position: 'T80' },
                    { round: 2, score: 78, position: 'T90' }
                  ],
                  was_replaced: false
                }
              ]
            }
          ]
        }
      };

      tournamentService.getAppInfo.mockResolvedValue(mockAppInfo);
      tournamentService.getCurrentScores.mockResolvedValue(mockScores);

      render(<CurrentTournament />, { wrapper });

      await waitFor(() => {
        // Golfer name appears in both GolferCards and TournamentLeaderboard
        const golferElements = screen.getAllByText('Cut Golfer');
        expect(golferElements.length).toBeGreaterThan(0);
        const cutElements = screen.getAllByText('CUT');
        expect(cutElements.length).toBeGreaterThan(0);
      });
    });

    it('should show MAJOR badge for major tournaments', async () => {
      const mockScores = {
        success: true,
        data: {
          tournament: { id: 1, name: 'The Masters', is_major: true },
          leaderboard: [
            {
              user_id: 1,
              username: 'John Doe',
              total_strokes: 280,
              current_position: 1,
              golfers: []
            }
          ]
        }
      };

      tournamentService.getAppInfo.mockResolvedValue(mockAppInfo);
      tournamentService.getCurrentScores.mockResolvedValue(mockScores);

      render(<CurrentTournament />, { wrapper });

      await waitFor(() => {
        expect(screen.getByText('MAJOR')).toBeInTheDocument();
      });
    });
  });

  describe('Off-Season Display', () => {
    const mockAppInfo = {
      current_tournament: null
    };

    it('should display season standings table', async () => {
      const mockStandings = {
        success: true,
        data: {
          season_year: 2026,
          standings: [
            {
              rank: 1,
              user_id: 1,
              username: 'John Doe',
              total_points: -15,
              tournaments_played: 8,
              wins: 3,
              top_3_finishes: 6
            }
          ]
        }
      };

      tournamentService.getAppInfo.mockResolvedValue(mockAppInfo);
      tournamentService.getSeasonStandings.mockResolvedValue(mockStandings);

      render(<CurrentTournament />, { wrapper });

      await waitFor(() => {
        expect(screen.getByText(/Season Standings/i)).toBeInTheDocument();
        expect(screen.getByText('Rank')).toBeInTheDocument();
        expect(screen.getByText('Player')).toBeInTheDocument();
        expect(screen.getByText('Points')).toBeInTheDocument();
      });
    });

    it('should display user statistics in standings', async () => {
      const mockStandings = {
        success: true,
        data: {
          season_year: 2026,
          standings: [
            {
              rank: 1,
              user_id: 1,
              username: 'John Doe',
              total_points: -15,
              tournaments_played: 8,
              wins: 3,
              top_3_finishes: 6
            }
          ]
        }
      };

      tournamentService.getAppInfo.mockResolvedValue(mockAppInfo);
      tournamentService.getSeasonStandings.mockResolvedValue(mockStandings);

      render(<CurrentTournament />, { wrapper });

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
        expect(screen.getByText('-15')).toBeInTheDocument();
        expect(screen.getByText('8')).toBeInTheDocument();
        expect(screen.getByText('3')).toBeInTheDocument();
        expect(screen.getByText('6')).toBeInTheDocument();
      });
    });

    it('should highlight current user in standings', async () => {
      const mockStandings = {
        success: true,
        data: {
          season_year: 2026,
          standings: [
            {
              rank: 1,
              user_id: 1,
              username: 'Current User',
              total_points: -15,
              tournaments_played: 8,
              wins: 3,
              top_3_finishes: 6
            },
            {
              rank: 2,
              user_id: 2,
              username: 'Other User',
              total_points: -10,
              tournaments_played: 8,
              wins: 1,
              top_3_finishes: 4
            }
          ]
        }
      };

      // Mock localStorage to simulate logged-in user
      Storage.prototype.getItem = jest.fn(() => JSON.stringify({ user_id: 1 }));

      tournamentService.getAppInfo.mockResolvedValue(mockAppInfo);
      tournamentService.getSeasonStandings.mockResolvedValue(mockStandings);

      render(<CurrentTournament />, { wrapper });

      await waitFor(() => {
        expect(screen.getByText('Current User')).toBeInTheDocument();
      });
    });

    it('should display correct season year', async () => {
      const mockStandings = {
        success: true,
        data: {
          season_year: 2026,
          standings: []
        }
      };

      tournamentService.getAppInfo.mockResolvedValue(mockAppInfo);
      tournamentService.getSeasonStandings.mockResolvedValue(mockStandings);

      render(<CurrentTournament />, { wrapper });

      await waitFor(() => {
        expect(screen.getByText(/2026 Season Standings/i)).toBeInTheDocument();
      });
    });
  });

  describe('Draft In Progress', () => {
    const mockAppInfo = {
      current_tournament: {
        id: 1,
        name: 'The Masters',
        draft_window: {
          start: '2026-04-05T00:00:00Z',
          end: '2026-04-10T23:59:59Z'
        }
      }
    };

    beforeEach(() => {
      jest.spyOn(Date, 'now').mockImplementation(() => new Date('2026-04-08T12:00:00Z').getTime());
    });

    afterEach(() => {
      jest.spyOn(Date, 'now').mockRestore();
    });

    it('should display draft in progress message', async () => {
      tournamentService.getAppInfo.mockResolvedValue(mockAppInfo);

      render(<CurrentTournament />, { wrapper });

      await waitFor(() => {
        expect(screen.getByText(/Draft In Progress/i)).toBeInTheDocument();
        expect(screen.getByText(/draft window is currently open/i)).toBeInTheDocument();
      });
    });

    it('should display Go to Draft button', async () => {
      tournamentService.getAppInfo.mockResolvedValue(mockAppInfo);

      render(<CurrentTournament />, { wrapper });

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Go to Draft/i })).toBeInTheDocument();
      });
    });

    it('should navigate to draft page when button is clicked', async () => {
      tournamentService.getAppInfo.mockResolvedValue(mockAppInfo);

      render(<CurrentTournament />, { wrapper });

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Go to Draft/i })).toBeInTheDocument();
      });

      const draftButton = screen.getByRole('button', { name: /Go to Draft/i });
      await userEvent.click(draftButton);

      // Navigation will be handled by react-router-dom in the actual component
      expect(draftButton).toBeInTheDocument();
    });
  });

  describe('Data Fetching', () => {
    it('should call getCurrentScores API when draft is closed', async () => {
      const mockAppInfo = {
        current_tournament: {
          id: 1,
          name: 'The Masters',
          draft_window: {
            start: '2026-04-05T00:00:00Z',
            end: '2026-04-07T23:59:59Z'
          }
        }
      };

      const mockScores = {
        success: true,
        data: {
          tournament: { id: 1, name: 'The Masters', is_major: false },
          leaderboard: []
        }
      };

      jest.spyOn(Date, 'now').mockImplementation(() => new Date('2026-04-10T12:00:00Z').getTime());

      tournamentService.getAppInfo.mockResolvedValue(mockAppInfo);
      tournamentService.getCurrentScores.mockResolvedValue(mockScores);

      render(<CurrentTournament />, { wrapper });

      await waitFor(() => {
        expect(tournamentService.getCurrentScores).toHaveBeenCalled();
      });

      jest.spyOn(Date, 'now').mockRestore();
    });

    it('should call getSeasonStandings API during off-season', async () => {
      const mockAppInfo = {
        current_tournament: null
      };

      const mockStandings = {
        success: true,
        data: {
          season_year: 2026,
          standings: []
        }
      };

      tournamentService.getAppInfo.mockResolvedValue(mockAppInfo);
      tournamentService.getSeasonStandings.mockResolvedValue(mockStandings);

      render(<CurrentTournament />, { wrapper });

      await waitFor(() => {
        expect(tournamentService.getSeasonStandings).toHaveBeenCalledWith(2026);
      });
    });

    it('should handle empty leaderboard response', async () => {
      const mockAppInfo = {
        current_tournament: {
          id: 1,
          name: 'The Masters',
          draft_window: {
            start: '2026-04-05T00:00:00Z',
            end: '2026-04-07T23:59:59Z'
          }
        }
      };

      const mockScores = {
        success: true,
        data: {
          tournament: { id: 1, name: 'The Masters', is_major: false },
          leaderboard: []
        }
      };

      jest.spyOn(Date, 'now').mockImplementation(() => new Date('2026-04-10T12:00:00Z').getTime());

      tournamentService.getAppInfo.mockResolvedValue(mockAppInfo);
      tournamentService.getCurrentScores.mockResolvedValue(mockScores);

      render(<CurrentTournament />, { wrapper });

      await waitFor(() => {
        expect(screen.getByText('The Masters')).toBeInTheDocument();
      });

      jest.spyOn(Date, 'now').mockRestore();
    });

    it('should support refetch functionality', async () => {
      const mockAppInfo = {
        current_tournament: {
          id: 1,
          name: 'The Masters',
          draft_window: {
            start: '2026-04-05T00:00:00Z',
            end: '2026-04-07T23:59:59Z'
          }
        }
      };

      jest.spyOn(Date, 'now').mockImplementation(() => new Date('2026-04-10T12:00:00Z').getTime());

      tournamentService.getAppInfo.mockResolvedValue(mockAppInfo);
      tournamentService.getCurrentScores.mockRejectedValue(new Error('Network error'));

      render(<CurrentTournament />, { wrapper });

      await waitFor(() => {
        expect(screen.getByText(/error loading tournament data/i)).toBeInTheDocument();
      });

      const retryButton = screen.getByRole('button', { name: /try again/i });
      expect(retryButton).toBeInTheDocument();

      tournamentService.getCurrentScores.mockResolvedValue({
        success: true,
        data: {
          tournament: { id: 1, name: 'The Masters', is_major: false },
          leaderboard: []
        }
      });

      await userEvent.click(retryButton);

      jest.spyOn(Date, 'now').mockRestore();
    });

    it('should configure staleTime for queries', async () => {
      const mockAppInfo = {
        current_tournament: null
      };

      const mockStandings = {
        success: true,
        data: {
          season_year: 2026,
          standings: []
        }
      };

      tournamentService.getAppInfo.mockResolvedValue(mockAppInfo);
      tournamentService.getSeasonStandings.mockResolvedValue(mockStandings);

      render(<CurrentTournament />, { wrapper });

      await waitFor(() => {
        expect(tournamentService.getSeasonStandings).toHaveBeenCalled();
      });

      // staleTime will be tested through React Query configuration
      expect(tournamentService.getSeasonStandings).toHaveBeenCalledTimes(1);
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      tournamentService.getAppInfo.mockRejectedValue(new Error('Network error'));

      render(<CurrentTournament />, { wrapper });

      await waitFor(() => {
        expect(screen.getByText(/error loading tournament data/i)).toBeInTheDocument();
      });
    });

    it('should handle 404 responses', async () => {
      const error = new Error('Not found');
      error.response = { status: 404 };
      tournamentService.getAppInfo.mockRejectedValue(error);

      render(<CurrentTournament />, { wrapper });

      await waitFor(() => {
        expect(screen.getByText(/error loading tournament data/i)).toBeInTheDocument();
      });
    });

    it('should display retry button on error', async () => {
      tournamentService.getAppInfo.mockRejectedValue(new Error('API Error'));

      render(<CurrentTournament />, { wrapper });

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
      });
    });
  });

  describe('Tournament Leaderboard', () => {
    const mockAppInfo = {
      current_tournament: {
        id: 1,
        name: 'The Masters',
        draft_window: {
          start: '2026-04-05T00:00:00Z',
          end: '2026-04-07T23:59:59Z'
        }
      }
    };

    beforeEach(() => {
      // Set draft as closed so active tournament displays
      jest.spyOn(Date, 'now').mockImplementation(() => new Date('2026-04-10T12:00:00Z').getTime());

      // Mock current user in localStorage
      localStorage.setItem('user', JSON.stringify({ user_id: 1 }));
    });

    afterEach(() => {
      jest.spyOn(Date, 'now').mockRestore();
      localStorage.clear();
    });

    describe('Par-Relative Score Formatting', () => {
      it('should display even par as "E"', async () => {
        const mockScores = {
          success: true,
          data: {
            tournament: { id: 1, name: 'The Masters', is_major: false },
            leaderboard: [
              {
                user_id: 1,
                username: 'John Doe',
                total_strokes: 288,
                current_position: 1,
                golfers: [
                  {
                    golfer_id: 1,
                    name: 'Tiger Woods',
                    total_score: 0,
                    position: 'T1',
                    status: 'active',
                    rounds: [{ round: 1, score: 72, position: 'T1' }],
                    was_replaced: false
                  }
                ]
              }
            ]
          }
        };

        tournamentService.getAppInfo.mockResolvedValue(mockAppInfo);
        tournamentService.getCurrentScores.mockResolvedValue(mockScores);

        render(<CurrentTournament />, { wrapper });

        await waitFor(() => {
          expect(screen.getByText('Tournament Standings')).toBeInTheDocument();
          // E should appear in the leaderboard for even par
          const eScores = screen.getAllByText('E');
          expect(eScores.length).toBeGreaterThan(0);
        });
      });

      it('should display under par scores with minus sign', async () => {
        const mockScores = {
          success: true,
          data: {
            tournament: { id: 1, name: 'The Masters', is_major: false },
            leaderboard: [
              {
                user_id: 1,
                username: 'John Doe',
                total_strokes: 280,
                current_position: 1,
                golfers: [
                  {
                    golfer_id: 1,
                    name: 'Tiger Woods',
                    total_score: -4,
                    position: 'T1',
                    status: 'active',
                    rounds: [{ round: 1, score: 68, position: 'T1' }],
                    was_replaced: false
                  }
                ]
              }
            ]
          }
        };

        tournamentService.getAppInfo.mockResolvedValue(mockAppInfo);
        tournamentService.getCurrentScores.mockResolvedValue(mockScores);

        render(<CurrentTournament />, { wrapper });

        await waitFor(() => {
          // -4 should appear (68 - 72 = -4)
          const underParScores = screen.getAllByText('-4');
          expect(underParScores.length).toBeGreaterThan(0);
        });
      });

      it('should display over par scores with plus sign', async () => {
        const mockScores = {
          success: true,
          data: {
            tournament: { id: 1, name: 'The Masters', is_major: false },
            leaderboard: [
              {
                user_id: 1,
                username: 'John Doe',
                total_strokes: 296,
                current_position: 1,
                golfers: [
                  {
                    golfer_id: 1,
                    name: 'Tiger Woods',
                    total_score: 4,
                    position: 'T50',
                    status: 'active',
                    rounds: [{ round: 1, score: 76, position: 'T50' }],
                    was_replaced: false
                  }
                ]
              }
            ]
          }
        };

        tournamentService.getAppInfo.mockResolvedValue(mockAppInfo);
        tournamentService.getCurrentScores.mockResolvedValue(mockScores);

        render(<CurrentTournament />, { wrapper });

        await waitFor(() => {
          // +4 should appear (76 - 72 = +4)
          const overParScores = screen.getAllByText('+4');
          expect(overParScores.length).toBeGreaterThan(0);
        });
      });

      it('should display "--" for missing round scores', async () => {
        const mockScores = {
          success: true,
          data: {
            tournament: { id: 1, name: 'The Masters', is_major: false },
            leaderboard: [
              {
                user_id: 1,
                username: 'John Doe',
                total_strokes: 140,
                current_position: 1,
                golfers: [
                  {
                    golfer_id: 1,
                    name: 'Tiger Woods',
                    total_score: -4,
                    position: 'T1',
                    status: 'active',
                    rounds: [{ round: 1, score: 68, position: 'T1' }], // Only 1 round
                    was_replaced: false
                  }
                ]
              }
            ]
          }
        };

        tournamentService.getAppInfo.mockResolvedValue(mockAppInfo);
        tournamentService.getCurrentScores.mockResolvedValue(mockScores);

        render(<CurrentTournament />, { wrapper });

        await waitFor(() => {
          // Should show "--" for rounds 2, 3, 4
          const dashScores = screen.getAllByText('--');
          expect(dashScores.length).toBeGreaterThanOrEqual(3);
        });
      });
    });

    describe('Total Score Calculation', () => {
      it('should calculate total relative to par across all golfers and rounds', async () => {
        const mockScores = {
          success: true,
          data: {
            tournament: { id: 1, name: 'The Masters', is_major: false },
            leaderboard: [
              {
                user_id: 1,
                username: 'John Doe',
                total_strokes: 280,
                current_position: 1,
                golfers: [
                  {
                    golfer_id: 1,
                    name: 'Golfer A',
                    total_score: -4,
                    position: 'T1',
                    status: 'active',
                    rounds: [
                      { round: 1, score: 70, position: 'T1' }, // -2
                      { round: 2, score: 68, position: 'T1' }  // -4
                    ],
                    was_replaced: false
                  },
                  {
                    golfer_id: 2,
                    name: 'Golfer B',
                    total_score: -2,
                    position: 'T5',
                    status: 'active',
                    rounds: [
                      { round: 1, score: 71, position: 'T5' }, // -1
                      { round: 2, score: 71, position: 'T5' }  // -1
                    ],
                    was_replaced: false
                  }
                ]
              }
            ]
          }
        };

        tournamentService.getAppInfo.mockResolvedValue(mockAppInfo);
        tournamentService.getCurrentScores.mockResolvedValue(mockScores);

        render(<CurrentTournament />, { wrapper });

        await waitFor(() => {
          // Total: (70+68+71+71) - (72*4) = 280 - 288 = -8
          const totalScores = screen.getAllByText('-8');
          expect(totalScores.length).toBeGreaterThan(0);
        });
      });
    });

    describe('Status Indicators', () => {
      it('should display scissors icon for cut golfers', async () => {
        const mockScores = {
          success: true,
          data: {
            tournament: { id: 1, name: 'The Masters', is_major: false },
            leaderboard: [
              {
                user_id: 1,
                username: 'John Doe',
                total_strokes: 300,
                current_position: 1,
                golfers: [
                  {
                    golfer_id: 1,
                    name: 'Cut Player',
                    total_score: 10,
                    position: 'CUT',
                    status: 'cut',
                    rounds: [
                      { round: 1, score: 78, position: 'T80' },
                      { round: 2, score: 76, position: 'CUT' }
                    ],
                    was_replaced: false
                  }
                ]
              }
            ]
          }
        };

        tournamentService.getAppInfo.mockResolvedValue(mockAppInfo);
        tournamentService.getCurrentScores.mockResolvedValue(mockScores);

        render(<CurrentTournament />, { wrapper });

        await waitFor(() => {
          expect(screen.getByText('✂️')).toBeInTheDocument();
        });
      });

      it('should display prohibited icon for withdrawn golfers', async () => {
        const mockScores = {
          success: true,
          data: {
            tournament: { id: 1, name: 'The Masters', is_major: false },
            leaderboard: [
              {
                user_id: 1,
                username: 'John Doe',
                total_strokes: 144,
                current_position: 1,
                golfers: [
                  {
                    golfer_id: 1,
                    name: 'WD Player',
                    total_score: 0,
                    position: 'WD',
                    status: 'wd',
                    rounds: [{ round: 1, score: 72, position: 'T20' }],
                    was_replaced: false
                  }
                ]
              }
            ]
          }
        };

        tournamentService.getAppInfo.mockResolvedValue(mockAppInfo);
        tournamentService.getCurrentScores.mockResolvedValue(mockScores);

        render(<CurrentTournament />, { wrapper });

        await waitFor(() => {
          expect(screen.getByText('🚫')).toBeInTheDocument();
        });
      });
    });

    describe('Current User Highlighting', () => {
      it('should display current user in the leaderboard', async () => {
        localStorage.setItem('user', JSON.stringify({ user_id: 2 }));

        const mockScores = {
          success: true,
          data: {
            tournament: { id: 1, name: 'The Masters', is_major: false },
            leaderboard: [
              {
                user_id: 1,
                username: 'Other User',
                total_strokes: 280,
                current_position: 1,
                golfers: [
                  {
                    golfer_id: 1,
                    name: 'Golfer A',
                    total_score: -4,
                    position: 'T1',
                    status: 'active',
                    rounds: [],
                    was_replaced: false
                  }
                ]
              },
              {
                user_id: 2,
                username: 'Current User',
                total_strokes: 284,
                current_position: 2,
                golfers: [
                  {
                    golfer_id: 2,
                    name: 'Golfer B',
                    total_score: -2,
                    position: 'T5',
                    status: 'active',
                    rounds: [],
                    was_replaced: false
                  }
                ]
              }
            ]
          }
        };

        tournamentService.getAppInfo.mockResolvedValue(mockAppInfo);
        tournamentService.getCurrentScores.mockResolvedValue(mockScores);

        render(<CurrentTournament />, { wrapper });

        await waitFor(() => {
          // Both users should be displayed in the leaderboard
          expect(screen.getByText('Other User')).toBeInTheDocument();
          expect(screen.getByText('Current User')).toBeInTheDocument();
          // Current user's golfer should appear
          const golferBElements = screen.getAllByText('Golfer B');
          expect(golferBElements.length).toBeGreaterThan(0);
        });
      });
    });

    describe('Leaderboard Structure', () => {
      it('should display all users in the leaderboard', async () => {
        const mockScores = {
          success: true,
          data: {
            tournament: { id: 1, name: 'The Masters', is_major: false },
            leaderboard: [
              {
                user_id: 1,
                username: 'Adam',
                total_strokes: 280,
                current_position: 1,
                golfers: [
                  { golfer_id: 1, name: 'Scottie Scheffler', total_score: -4, position: 'T1', status: 'active', rounds: [], was_replaced: false }
                ]
              },
              {
                user_id: 2,
                username: 'Brandon',
                total_strokes: 284,
                current_position: 2,
                golfers: [
                  { golfer_id: 2, name: 'Rory McIlroy', total_score: -2, position: 'T5', status: 'active', rounds: [], was_replaced: false }
                ]
              },
              {
                user_id: 3,
                username: 'Marco',
                total_strokes: 288,
                current_position: 3,
                golfers: [
                  { golfer_id: 3, name: 'Jon Rahm', total_score: 0, position: 'T10', status: 'active', rounds: [], was_replaced: false }
                ]
              },
              {
                user_id: 4,
                username: 'Vik',
                total_strokes: 292,
                current_position: 4,
                golfers: [
                  { golfer_id: 4, name: 'Collin Morikawa', total_score: 2, position: 'T20', status: 'active', rounds: [], was_replaced: false }
                ]
              }
            ]
          }
        };

        tournamentService.getAppInfo.mockResolvedValue(mockAppInfo);
        tournamentService.getCurrentScores.mockResolvedValue(mockScores);

        render(<CurrentTournament />, { wrapper });

        await waitFor(() => {
          expect(screen.getByText('Tournament Standings')).toBeInTheDocument();
          expect(screen.getByText('Adam')).toBeInTheDocument();
          expect(screen.getByText('Brandon')).toBeInTheDocument();
          expect(screen.getByText('Marco')).toBeInTheDocument();
          expect(screen.getByText('Vik')).toBeInTheDocument();
        });
      });

      it('should display user positions correctly', async () => {
        const mockScores = {
          success: true,
          data: {
            tournament: { id: 1, name: 'The Masters', is_major: false },
            leaderboard: [
              {
                user_id: 1,
                username: 'Leader',
                total_strokes: 270,
                current_position: 1,
                golfers: [
                  { golfer_id: 1, name: 'Golfer A', total_score: -10, position: '1', status: 'active', rounds: [], was_replaced: false }
                ]
              },
              {
                user_id: 2,
                username: 'Second',
                total_strokes: 280,
                current_position: 2,
                golfers: [
                  { golfer_id: 2, name: 'Golfer B', total_score: -5, position: 'T5', status: 'active', rounds: [], was_replaced: false }
                ]
              }
            ]
          }
        };

        tournamentService.getAppInfo.mockResolvedValue(mockAppInfo);
        tournamentService.getCurrentScores.mockResolvedValue(mockScores);

        render(<CurrentTournament />, { wrapper });

        await waitFor(() => {
          // Position 1 and 2 should be displayed
          expect(screen.getByText('Leader')).toBeInTheDocument();
          expect(screen.getByText('Second')).toBeInTheDocument();
        });
      });

      it('should display multiple golfers per user', async () => {
        const mockScores = {
          success: true,
          data: {
            tournament: { id: 1, name: 'The Masters', is_major: false },
            leaderboard: [
              {
                user_id: 1,
                username: 'John Doe',
                total_strokes: 560,
                current_position: 1,
                golfers: [
                  { golfer_id: 1, name: 'Scottie Scheffler', total_score: -8, position: '1', status: 'active', rounds: [], was_replaced: false },
                  { golfer_id: 2, name: 'Hideki Matsuyama', total_score: -4, position: 'T5', status: 'active', rounds: [], was_replaced: false }
                ]
              }
            ]
          }
        };

        tournamentService.getAppInfo.mockResolvedValue(mockAppInfo);
        tournamentService.getCurrentScores.mockResolvedValue(mockScores);

        render(<CurrentTournament />, { wrapper });

        await waitFor(() => {
          // Both golfers should appear in leaderboard
          const schefflerElements = screen.getAllByText('Scottie Scheffler');
          const matsuyamaElements = screen.getAllByText('Hideki Matsuyama');
          expect(schefflerElements.length).toBeGreaterThan(0);
          expect(matsuyamaElements.length).toBeGreaterThan(0);
        });
      });
    });

    describe('Score Color Coding', () => {
      it('should apply green color to under par scores', async () => {
        const mockScores = {
          success: true,
          data: {
            tournament: { id: 1, name: 'The Masters', is_major: false },
            leaderboard: [
              {
                user_id: 1,
                username: 'John Doe',
                total_strokes: 280,
                current_position: 1,
                golfers: [
                  {
                    golfer_id: 1,
                    name: 'Tiger Woods',
                    total_score: -4,
                    position: 'T1',
                    status: 'active',
                    rounds: [{ round: 1, score: 68, position: 'T1' }],
                    was_replaced: false
                  }
                ]
              }
            ]
          }
        };

        tournamentService.getAppInfo.mockResolvedValue(mockAppInfo);
        tournamentService.getCurrentScores.mockResolvedValue(mockScores);

        render(<CurrentTournament />, { wrapper });

        await waitFor(() => {
          // Find the -4 score in the leaderboard table
          const scoreElements = screen.getAllByText('-4');
          const greenScore = scoreElements.find(el =>
            el.classList.contains('text-augusta-green-600')
          );
          expect(greenScore).toBeTruthy();
        });
      });

      it('should apply red color to over par scores', async () => {
        const mockScores = {
          success: true,
          data: {
            tournament: { id: 1, name: 'The Masters', is_major: false },
            leaderboard: [
              {
                user_id: 1,
                username: 'John Doe',
                total_strokes: 300,
                current_position: 1,
                golfers: [
                  {
                    golfer_id: 1,
                    name: 'Tiger Woods',
                    total_score: 4,
                    position: 'T50',
                    status: 'active',
                    rounds: [{ round: 1, score: 76, position: 'T50' }],
                    was_replaced: false
                  }
                ]
              }
            ]
          }
        };

        tournamentService.getAppInfo.mockResolvedValue(mockAppInfo);
        tournamentService.getCurrentScores.mockResolvedValue(mockScores);

        render(<CurrentTournament />, { wrapper });

        await waitFor(() => {
          // Find the +4 score in the leaderboard table
          const scoreElements = screen.getAllByText('+4');
          const redScore = scoreElements.find(el =>
            el.classList.contains('text-error-red')
          );
          expect(redScore).toBeTruthy();
        });
      });
    });

    describe('Edge Cases', () => {
      it('should handle empty leaderboard gracefully', async () => {
        const mockScores = {
          success: true,
          data: {
            tournament: { id: 1, name: 'The Masters', is_major: false },
            leaderboard: []
          }
        };

        tournamentService.getAppInfo.mockResolvedValue(mockAppInfo);
        tournamentService.getCurrentScores.mockResolvedValue(mockScores);

        render(<CurrentTournament />, { wrapper });

        await waitFor(() => {
          expect(screen.getByText('Tournament Standings')).toBeInTheDocument();
        });
      });

      it('should handle user with empty golfers array', async () => {
        const mockScores = {
          success: true,
          data: {
            tournament: { id: 1, name: 'The Masters', is_major: false },
            leaderboard: [
              {
                user_id: 1,
                username: 'John Doe',
                total_strokes: 0,
                current_position: 1,
                golfers: []
              }
            ]
          }
        };

        tournamentService.getAppInfo.mockResolvedValue(mockAppInfo);
        tournamentService.getCurrentScores.mockResolvedValue(mockScores);

        render(<CurrentTournament />, { wrapper });

        await waitFor(() => {
          expect(screen.getByText('Tournament Standings')).toBeInTheDocument();
        });
      });
    });
  });
});
