import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import CurrentSeason from '../CurrentSeason';
import { tournamentService } from '../../services/tournament';

// Mock the tournament service
jest.mock('../../services/tournament', () => ({
  tournamentService: {
    getSeasonStandings: jest.fn()
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
const mockStandingsData = {
  success: true,
  data: {
    season_year: 2026,
    standings: [
      {
        rank: 1,
        user_id: 1,
        username: 'Tiger Woods',
        total_points: -15,
        first_place: 3,
        second_place: 2,
        third_place: 1,
        fourth_place: 2,
        majors_won: 1,
        winners_picked: 5,
        total_cuts_missed: 4
      },
      {
        rank: 2,
        user_id: 2,
        username: 'Rory McIlroy',
        total_points: -12,
        first_place: 2,
        second_place: 3,
        third_place: 2,
        fourth_place: 1,
        majors_won: 0,
        winners_picked: 4,
        total_cuts_missed: 6
      },
      {
        rank: 3,
        user_id: 3,
        username: 'Jordan Spieth',
        total_points: -8,
        first_place: 1,
        second_place: 2,
        third_place: 3,
        fourth_place: 1,
        majors_won: 1,
        winners_picked: 3,
        total_cuts_missed: 8
      }
    ]
  }
};

describe('CurrentSeason Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  // ===========================
  // RENDERING STATES (3 tests)
  // ===========================

  describe('Rendering States', () => {
    test('displays loading state while fetching data', () => {
      tournamentService.getSeasonStandings.mockImplementation(() => new Promise(() => {}));

      render(<CurrentSeason />, { wrapper });

      expect(screen.getByText(/loading season standings/i)).toBeInTheDocument();
      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    test('displays error state when API call fails', async () => {
      tournamentService.getSeasonStandings.mockRejectedValue(new Error('Network error'));

      render(<CurrentSeason />, { wrapper });

      await waitFor(() => {
        expect(screen.getByText(/error loading season standings/i)).toBeInTheDocument();
      });
    });

    test('displays standings table when data loads successfully', async () => {
      tournamentService.getSeasonStandings.mockResolvedValue(mockStandingsData);

      render(<CurrentSeason />, { wrapper });

      await waitFor(() => {
        expect(screen.getByText('2026 Season Standings')).toBeInTheDocument();
        expect(screen.getByRole('table')).toBeInTheDocument();
      });
    });
  });

  // ===========================
  // DATA DISPLAY (5 tests)
  // ===========================

  describe('Data Display', () => {
    test('displays all table headers', async () => {
      tournamentService.getSeasonStandings.mockResolvedValue(mockStandingsData);

      render(<CurrentSeason />, { wrapper });

      await waitFor(() => {
        expect(screen.getByText('Rank')).toBeInTheDocument();
        expect(screen.getByText('Player')).toBeInTheDocument();
        expect(screen.getByText('Points')).toBeInTheDocument();
        expect(screen.getByText('1st')).toBeInTheDocument();
        expect(screen.getByText('2nd')).toBeInTheDocument();
        expect(screen.getByText('3rd')).toBeInTheDocument();
        expect(screen.getByText('4th')).toBeInTheDocument();
        expect(screen.getByText('Majors')).toBeInTheDocument();
        expect(screen.getByText('Winners')).toBeInTheDocument();
        expect(screen.getByText('Cuts')).toBeInTheDocument();
      });
    });

    test('displays all user data in table rows', async () => {
      tournamentService.getSeasonStandings.mockResolvedValue(mockStandingsData);

      render(<CurrentSeason />, { wrapper });

      await waitFor(() => {
        // Check first user
        expect(screen.getByText('Tiger Woods')).toBeInTheDocument();
        expect(screen.getByText('-15')).toBeInTheDocument();

        // Check second user
        expect(screen.getByText('Rory McIlroy')).toBeInTheDocument();
        expect(screen.getByText('-12')).toBeInTheDocument();

        // Check third user
        expect(screen.getByText('Jordan Spieth')).toBeInTheDocument();
        expect(screen.getByText('-8')).toBeInTheDocument();
      });
    });

    test('displays season year in header', async () => {
      tournamentService.getSeasonStandings.mockResolvedValue(mockStandingsData);

      render(<CurrentSeason />, { wrapper });

      await waitFor(() => {
        expect(screen.getByText('2026 Season Standings')).toBeInTheDocument();
      });
    });

    test('handles empty standings array gracefully', async () => {
      const emptyData = {
        success: true,
        data: {
          season_year: 2026,
          standings: []
        }
      };
      tournamentService.getSeasonStandings.mockResolvedValue(emptyData);

      render(<CurrentSeason />, { wrapper });

      await waitFor(() => {
        expect(screen.getByText('2026 Season Standings')).toBeInTheDocument();
        expect(screen.getByRole('table')).toBeInTheDocument();
        // Table should exist but have no data rows
        const rows = screen.queryAllByRole('row');
        expect(rows.length).toBe(1); // Only header row
      });
    });

    test('displays negative points correctly', async () => {
      tournamentService.getSeasonStandings.mockResolvedValue(mockStandingsData);

      render(<CurrentSeason />, { wrapper });

      await waitFor(() => {
        expect(screen.getByText('-15')).toBeInTheDocument();
        expect(screen.getByText('-12')).toBeInTheDocument();
        expect(screen.getByText('-8')).toBeInTheDocument();
      });
    });

    test('displays placement counts and statistics correctly', async () => {
      tournamentService.getSeasonStandings.mockResolvedValue(mockStandingsData);

      render(<CurrentSeason />, { wrapper });

      await waitFor(() => {
        // Check that placement, majors, winners, and cuts data is displayed
        // Tiger Woods: 3 first, 2 second, 1 third, 2 fourth, 1 major, 5 winners, 4 cuts
        const rows = screen.getAllByRole('row');
        const tigerRow = rows.find(row => row.textContent.includes('Tiger Woods'));
        expect(tigerRow.textContent).toContain('3'); // first_place
        expect(tigerRow.textContent).toContain('5'); // winners_picked
        expect(tigerRow.textContent).toContain('4'); // total_cuts_missed
      });
    });
  });

  // ===========================
  // USER HIGHLIGHTING (3 tests)
  // ===========================

  describe('User Highlighting', () => {
    test('highlights current user row with green background', async () => {
      localStorage.setItem('user', JSON.stringify({ user_id: 2, name: 'Rory McIlroy' }));
      tournamentService.getSeasonStandings.mockResolvedValue(mockStandingsData);

      render(<CurrentSeason />, { wrapper });

      await waitFor(() => {
        const rows = screen.getAllByRole('row');
        // Find the row with Rory McIlroy (user_id: 2)
        const roryRow = rows.find(row => row.textContent.includes('Rory McIlroy'));
        expect(roryRow).toHaveClass('bg-augusta-green-50');
        expect(roryRow).toHaveClass('border-l-4');
        expect(roryRow).toHaveClass('border-augusta-green-600');
      });
    });

    test('adds green left border to current user row', async () => {
      localStorage.setItem('user', JSON.stringify({ user_id: 1, name: 'Tiger Woods' }));
      tournamentService.getSeasonStandings.mockResolvedValue(mockStandingsData);

      render(<CurrentSeason />, { wrapper });

      await waitFor(() => {
        const rows = screen.getAllByRole('row');
        const tigerRow = rows.find(row => row.textContent.includes('Tiger Woods'));
        expect(tigerRow).toHaveClass('border-l-4');
        expect(tigerRow).toHaveClass('border-augusta-green-600');
      });
    });

    test('does not highlight any row when no user is logged in', async () => {
      tournamentService.getSeasonStandings.mockResolvedValue(mockStandingsData);

      render(<CurrentSeason />, { wrapper });

      await waitFor(() => {
        const rows = screen.getAllByRole('row');
        const dataRows = rows.filter((row, index) => index > 0); // Skip header row
        dataRows.forEach(row => {
          expect(row).not.toHaveClass('bg-augusta-green-50');
          expect(row).toHaveClass('hover:bg-clubhouse-cream');
        });
      });
    });
  });

  // ===========================
  // ERROR HANDLING (3 tests)
  // ===========================

  describe('Error Handling', () => {
    test('displays error message on network failure', async () => {
      tournamentService.getSeasonStandings.mockRejectedValue(new Error('Network error'));

      render(<CurrentSeason />, { wrapper });

      await waitFor(() => {
        expect(screen.getByText(/error loading season standings/i)).toBeInTheDocument();
      });
    });

    test('displays retry button in error state', async () => {
      tournamentService.getSeasonStandings.mockRejectedValue(new Error('Network error'));

      render(<CurrentSeason />, { wrapper });

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
      });
    });

    test('calls refetch when retry button is clicked', async () => {
      tournamentService.getSeasonStandings.mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce(mockStandingsData);

      render(<CurrentSeason />, { wrapper });

      await waitFor(() => {
        expect(screen.getByText(/error loading season standings/i)).toBeInTheDocument();
      });

      const retryButton = screen.getByRole('button', { name: /try again/i });
      userEvent.click(retryButton);

      await waitFor(() => {
        expect(screen.getByText('2026 Season Standings')).toBeInTheDocument();
      });
    });
  });

  // ===========================
  // DATA FETCHING (2 tests)
  // ===========================

  describe('Data Fetching', () => {
    test('calls getSeasonStandings with current year', async () => {
      const currentYear = new Date().getFullYear();
      tournamentService.getSeasonStandings.mockResolvedValue(mockStandingsData);

      render(<CurrentSeason />, { wrapper });

      await waitFor(() => {
        expect(tournamentService.getSeasonStandings).toHaveBeenCalledWith(currentYear);
      });
    });

    test('uses correct React Query configuration', async () => {
      tournamentService.getSeasonStandings.mockResolvedValue(mockStandingsData);

      render(<CurrentSeason />, { wrapper });

      await waitFor(() => {
        expect(screen.getByText('2026 Season Standings')).toBeInTheDocument();
      });

      // Verify API was called
      expect(tournamentService.getSeasonStandings).toHaveBeenCalledTimes(1);
    });
  });

  // ===========================
  // RESPONSIVE (1 test)
  // ===========================

  describe('Responsive Design', () => {
    test('applies overflow scrolling for mobile responsiveness', async () => {
      tournamentService.getSeasonStandings.mockResolvedValue(mockStandingsData);

      render(<CurrentSeason />, { wrapper });

      await waitFor(() => {
        const tableContainer = screen.getByRole('table').closest('div');
        expect(tableContainer).toHaveClass('overflow-x-auto');
      });
    });
  });
});
