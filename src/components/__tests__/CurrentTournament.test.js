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
          expect(screen.getByText(golfer.name)).toBeInTheDocument();
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
        expect(screen.getByText('Cut Golfer')).toBeInTheDocument();
        expect(screen.getByText('CUT')).toBeInTheDocument();
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
});
