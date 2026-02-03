import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import FullLeaderboard from '../FullLeaderboard';
import { tournamentService } from '../../services/tournament';

// Mock the tournament service
jest.mock('../../services/tournament', () => ({
  tournamentService: {
    getFullLeaderboard: jest.fn()
  }
}));

// Create test query client
const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: {
      retry: false
    }
  }
});

// Test wrapper component
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

// Mock data
const mockLeaderboardData = {
  success: true,
  data: {
    tournament: {
      id: 1,
      name: 'The Masters',
      par: 72
    },
    current_round: 2,
    cut_line: {
      score: '-3',
      count: 73
    },
    fetched_at: '2026-01-31T12:00:00-05:00',
    players: [
      {
        player_id: '123',
        name: 'Tiger Woods',
        position: '1',
        status: 'active',
        total_strokes: 138,
        total_to_par: -6,
        thru: 'F',
        rounds: [
          { round: 1, score: 68 },
          { round: 2, score: 70 }
        ],
        drafted_by: 'John'
      },
      {
        player_id: '456',
        name: 'Rory McIlroy',
        position: 'T2',
        status: 'active',
        total_strokes: 140,
        total_to_par: -4,
        thru: 'F',
        rounds: [
          { round: 1, score: 70 },
          { round: 2, score: 70 }
        ],
        drafted_by: null
      },
      {
        player_id: '789',
        name: 'Phil Mickelson',
        position: 'CUT',
        status: 'cut',
        total_strokes: 150,
        total_to_par: 6,
        thru: 'F',
        rounds: [
          { round: 1, score: 76 },
          { round: 2, score: 74 }
        ],
        drafted_by: null
      }
    ]
  }
};

describe('FullLeaderboard Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ===========================
  // RENDERING STATES (3 tests)
  // ===========================

  describe('Rendering States', () => {
    test('displays loading state while fetching data', () => {
      tournamentService.getFullLeaderboard.mockImplementation(() => new Promise(() => {}));

      render(<FullLeaderboard />, { wrapper });

      expect(screen.getByText(/loading leaderboard/i)).toBeInTheDocument();
    });

    test('displays error state when API call fails', async () => {
      tournamentService.getFullLeaderboard.mockRejectedValue(new Error('Network error'));

      render(<FullLeaderboard />, { wrapper });

      await waitFor(() => {
        expect(screen.getByText(/failed to load leaderboard/i)).toBeInTheDocument();
      });
    });

    test('displays leaderboard table when data loads successfully', async () => {
      tournamentService.getFullLeaderboard.mockResolvedValue(mockLeaderboardData);

      render(<FullLeaderboard />, { wrapper });

      await waitFor(() => {
        expect(screen.getByText('Tournament Leaderboard')).toBeInTheDocument();
        expect(screen.getByRole('table')).toBeInTheDocument();
      });
    });
  });

  // ===========================
  // DATA DISPLAY (6 tests)
  // ===========================

  describe('Data Display', () => {
    test('displays all table headers', async () => {
      tournamentService.getFullLeaderboard.mockResolvedValue(mockLeaderboardData);

      render(<FullLeaderboard />, { wrapper });

      await waitFor(() => {
        expect(screen.getByText('Pos')).toBeInTheDocument();
        expect(screen.getByText('Player')).toBeInTheDocument();
        expect(screen.getByText('R1')).toBeInTheDocument();
        expect(screen.getByText('R2')).toBeInTheDocument();
        expect(screen.getByText('R3')).toBeInTheDocument();
        expect(screen.getByText('R4')).toBeInTheDocument();
        expect(screen.getByText('Total')).toBeInTheDocument();
        expect(screen.getByText('To Par')).toBeInTheDocument();
      });
    });

    test('displays player data in table rows', async () => {
      tournamentService.getFullLeaderboard.mockResolvedValue(mockLeaderboardData);

      render(<FullLeaderboard />, { wrapper });

      await waitFor(() => {
        expect(screen.getByText('Tiger Woods')).toBeInTheDocument();
        expect(screen.getByText('Rory McIlroy')).toBeInTheDocument();
        expect(screen.getByText('Phil Mickelson')).toBeInTheDocument();
      });
    });

    test('displays current round in header', async () => {
      tournamentService.getFullLeaderboard.mockResolvedValue(mockLeaderboardData);

      render(<FullLeaderboard />, { wrapper });

      await waitFor(() => {
        expect(screen.getByText('Round 2')).toBeInTheDocument();
      });
    });

    test('displays cut line information in header', async () => {
      tournamentService.getFullLeaderboard.mockResolvedValue(mockLeaderboardData);

      render(<FullLeaderboard />, { wrapper });

      await waitFor(() => {
        // Look for the header cut line badge specifically
        const cutBadge = screen.getByText(/cut: -3/i);
        expect(cutBadge).toBeInTheDocument();
        expect(cutBadge.textContent).toContain('73');
      });
    });

    test('displays fetched_at timestamp', async () => {
      tournamentService.getFullLeaderboard.mockResolvedValue(mockLeaderboardData);

      render(<FullLeaderboard />, { wrapper });

      await waitFor(() => {
        expect(screen.getByText(/accurate as of/i)).toBeInTheDocument();
      });
    });

    test('displays round scores for each player', async () => {
      tournamentService.getFullLeaderboard.mockResolvedValue(mockLeaderboardData);

      render(<FullLeaderboard />, { wrapper });

      await waitFor(() => {
        // Tiger's round 1 score
        expect(screen.getByText('68')).toBeInTheDocument();
        // Phil's round 1 score
        expect(screen.getByText('76')).toBeInTheDocument();
      });
    });
  });

  // ===========================
  // DRAFTED PLAYERS (3 tests)
  // ===========================

  describe('Drafted Players', () => {
    test('highlights drafted players with special styling', async () => {
      tournamentService.getFullLeaderboard.mockResolvedValue(mockLeaderboardData);

      render(<FullLeaderboard />, { wrapper });

      await waitFor(() => {
        const rows = screen.getAllByRole('row');
        const tigerRow = rows.find(row => row.textContent.includes('Tiger Woods'));
        expect(tigerRow).toHaveClass('bg-augusta-green-50');
        expect(tigerRow).toHaveClass('border-l-4');
      });
    });

    test('displays drafter name badge for drafted players', async () => {
      tournamentService.getFullLeaderboard.mockResolvedValue(mockLeaderboardData);

      render(<FullLeaderboard />, { wrapper });

      await waitFor(() => {
        expect(screen.getByText('John')).toBeInTheDocument();
      });
    });

    test('does not highlight non-drafted players', async () => {
      tournamentService.getFullLeaderboard.mockResolvedValue(mockLeaderboardData);

      render(<FullLeaderboard />, { wrapper });

      await waitFor(() => {
        const rows = screen.getAllByRole('row');
        const roryRow = rows.find(row => row.textContent.includes('Rory McIlroy'));
        expect(roryRow).not.toHaveClass('bg-augusta-green-50');
      });
    });
  });

  // ===========================
  // CUT LINE (2 tests)
  // ===========================

  describe('Cut Line', () => {
    test('displays cut player status indicator', async () => {
      tournamentService.getFullLeaderboard.mockResolvedValue(mockLeaderboardData);

      render(<FullLeaderboard />, { wrapper });

      await waitFor(() => {
        expect(screen.getByText(/\(CUT\)/i)).toBeInTheDocument();
      });
    });

    test('shows cut line separator before cut players', async () => {
      tournamentService.getFullLeaderboard.mockResolvedValue(mockLeaderboardData);

      render(<FullLeaderboard />, { wrapper });

      await waitFor(() => {
        expect(screen.getByText(/projected cut line/i)).toBeInTheDocument();
      });
    });
  });

  // ===========================
  // ERROR HANDLING (2 tests)
  // ===========================

  describe('Error Handling', () => {
    test('displays retry button in error state', async () => {
      tournamentService.getFullLeaderboard.mockRejectedValue(new Error('Network error'));

      render(<FullLeaderboard />, { wrapper });

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
      });
    });

    test('calls refetch when retry button is clicked', async () => {
      tournamentService.getFullLeaderboard.mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce(mockLeaderboardData);

      render(<FullLeaderboard />, { wrapper });

      await waitFor(() => {
        expect(screen.getByText(/failed to load leaderboard/i)).toBeInTheDocument();
      });

      const retryButton = screen.getByRole('button', { name: /try again/i });
      userEvent.click(retryButton);

      await waitFor(() => {
        expect(screen.getByText('Tournament Leaderboard')).toBeInTheDocument();
      });
    });
  });

  // ===========================
  // EMPTY STATES (2 tests)
  // ===========================

  describe('Empty States', () => {
    test('returns null when no tournament data', async () => {
      const noTournamentData = {
        success: true,
        data: {
          tournament: null,
          players: []
        }
      };
      tournamentService.getFullLeaderboard.mockResolvedValue(noTournamentData);

      const { container } = render(<FullLeaderboard />, { wrapper });

      await waitFor(() => {
        expect(container.firstChild).toBeNull();
      });
    });

    test('returns null when no players', async () => {
      const noPlayersData = {
        success: true,
        data: {
          tournament: { id: 1, name: 'Test', par: 72 },
          players: []
        }
      };
      tournamentService.getFullLeaderboard.mockResolvedValue(noPlayersData);

      const { container } = render(<FullLeaderboard />, { wrapper });

      await waitFor(() => {
        expect(container.firstChild).toBeNull();
      });
    });
  });

  // ===========================
  // TO PAR DISPLAY (2 tests)
  // ===========================

  describe('To Par Display', () => {
    test('displays negative to-par with correct styling', async () => {
      tournamentService.getFullLeaderboard.mockResolvedValue(mockLeaderboardData);

      render(<FullLeaderboard />, { wrapper });

      await waitFor(() => {
        expect(screen.getByText('-6')).toBeInTheDocument();
        expect(screen.getByText('-4')).toBeInTheDocument();
      });
    });

    test('displays positive to-par with plus sign', async () => {
      tournamentService.getFullLeaderboard.mockResolvedValue(mockLeaderboardData);

      render(<FullLeaderboard />, { wrapper });

      await waitFor(() => {
        expect(screen.getByText('+6')).toBeInTheDocument();
      });
    });
  });
});
