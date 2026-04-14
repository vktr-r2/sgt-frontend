import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import PastTournaments from '../PastTournaments';
import { tournamentService } from '../../services/tournament';

jest.mock('../../services/tournament');

const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

const makeWrapper = () => {
  const queryClient = createTestQueryClient();
  return ({ children }) => (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {children}
      </BrowserRouter>
    </QueryClientProvider>
  );
};

const mockTournaments = [
  {
    id: 1,
    name: 'The Masters',
    start_date: '2026-04-10',
    end_date: '2026-04-13',
    is_major: true,
    winner_username: 'Vik',
    winning_score: -4
  },
  {
    id: 2,
    name: 'Arnold Palmer Invitational',
    start_date: '2026-03-03',
    end_date: '2026-03-06',
    is_major: false,
    winner_username: 'Joe',
    winning_score: -3
  }
];

const mockResults = {
  success: true,
  data: {
    tournament: { id: 1, name: 'The Masters', par: 72 },
    results: [
      {
        place: 1,
        user_id: 1,
        username: 'Vik',
        total_points: -4,
        golfers: [
          {
            name: 'Scottie Scheffler',
            final_position: '1',
            status: 'active',
            total_score: 268,
            was_replaced: false,
            rounds: [
              { round: 1, score: 66 },
              { round: 2, score: 67 },
              { round: 3, score: 68 },
              { round: 4, score: 67 }
            ]
          }
        ]
      },
      {
        place: 2,
        user_id: 2,
        username: 'Joe',
        total_points: -3,
        golfers: [
          {
            name: 'Rory McIlroy',
            final_position: 'T5',
            status: 'active',
            total_score: 272,
            was_replaced: false,
            rounds: [
              { round: 1, score: 67 },
              { round: 2, score: 68 },
              { round: 3, score: 69 },
              { round: 4, score: 68 }
            ]
          }
        ]
      }
    ]
  }
};

describe('PastTournaments', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    tournamentService.getTournamentHistory.mockResolvedValue({
      success: true,
      data: { tournaments: mockTournaments }
    });
    tournamentService.getTournamentResults.mockResolvedValue(mockResults);
    tournamentService.getAppInfo.mockResolvedValue({
      current_tournament: null,
      recently_completed_tournament: null
    });
  });

  describe('Rendering States', () => {
    it('should display loading state while fetching history', () => {
      tournamentService.getTournamentHistory.mockImplementation(() => new Promise(() => {}));
      render(<PastTournaments />, { wrapper: makeWrapper() });
      expect(screen.getByText(/loading tournament history/i)).toBeInTheDocument();
    });

    it('should display error state when API call fails', async () => {
      tournamentService.getTournamentHistory.mockRejectedValue(new Error('API Error'));
      render(<PastTournaments />, { wrapper: makeWrapper() });
      await waitFor(() => {
        expect(screen.getByText(/error loading tournament history/i)).toBeInTheDocument();
      });
    });

    it('should display retry button on error', async () => {
      tournamentService.getTournamentHistory.mockRejectedValue(new Error('API Error'));
      render(<PastTournaments />, { wrapper: makeWrapper() });
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
      });
    });

    it('should refetch when retry button is clicked', async () => {
      tournamentService.getTournamentHistory.mockRejectedValue(new Error('API Error'));
      render(<PastTournaments />, { wrapper: makeWrapper() });
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
      });
      await userEvent.click(screen.getByRole('button', { name: /try again/i }));
      expect(tournamentService.getTournamentHistory).toHaveBeenCalledTimes(2);
    });
  });

  describe('Tournament List', () => {
    it('should display tournament list after loading', async () => {
      render(<PastTournaments />, { wrapper: makeWrapper() });
      await waitFor(() => {
        expect(screen.getByText('The Masters')).toBeInTheDocument();
        expect(screen.getByText('Arnold Palmer Invitational')).toBeInTheDocument();
      });
    });

    it('should display tournament name and dates', async () => {
      render(<PastTournaments />, { wrapper: makeWrapper() });
      await waitFor(() => {
        expect(screen.getAllByText('The Masters').length).toBeGreaterThan(0);
        expect(screen.getByText(/Apr 10–13/)).toBeInTheDocument();
      });
    });

    it('should display winner information', async () => {
      render(<PastTournaments />, { wrapper: makeWrapper() });
      await waitFor(() => {
        expect(screen.getByText(/Winner: Vik/)).toBeInTheDocument();
        expect(screen.getByText(/Winner: Joe/)).toBeInTheDocument();
      });
    });

    it('should display major badge for major tournaments', async () => {
      render(<PastTournaments />, { wrapper: makeWrapper() });
      await waitFor(() => {
        expect(screen.getByText(/⭐ MAJOR/)).toBeInTheDocument();
      });
    });

    it('should display empty message when no tournaments', async () => {
      tournamentService.getTournamentHistory.mockResolvedValue({
        success: true,
        data: { tournaments: [] }
      });
      render(<PastTournaments />, { wrapper: makeWrapper() });
      await waitFor(() => {
        expect(screen.getByText(/no past tournaments yet this season/i)).toBeInTheDocument();
      });
    });
  });

  describe('Accordion Behavior', () => {
    it('should expand tournament results when clicked', async () => {
      render(<PastTournaments />, { wrapper: makeWrapper() });
      await waitFor(() => {
        expect(screen.getByText('The Masters')).toBeInTheDocument();
      });
      await userEvent.click(screen.getByText('The Masters'));
      expect(tournamentService.getTournamentResults).toHaveBeenCalledWith(1);
    });

    it('should collapse tournament when clicked again', async () => {
      render(<PastTournaments />, { wrapper: makeWrapper() });
      await waitFor(() => {
        expect(screen.getAllByText('The Masters').length).toBeGreaterThan(0);
      });
      // Use button role to target the accordion toggle, not the leaderboard header
      await userEvent.click(screen.getByRole('button', { name: /The Masters/ }));
      await waitFor(() => {
        expect(screen.getByText('Scottie Scheffler')).toBeInTheDocument();
      });
      await userEvent.click(screen.getByRole('button', { name: /The Masters/ }));
      expect(screen.queryByText('Scottie Scheffler')).not.toBeInTheDocument();
    });

    it('should only have one tournament expanded at a time', async () => {
      render(<PastTournaments />, { wrapper: makeWrapper() });
      await waitFor(() => {
        expect(screen.getByText('The Masters')).toBeInTheDocument();
      });
      await userEvent.click(screen.getByText('The Masters'));
      await waitFor(() => {
        expect(tournamentService.getTournamentResults).toHaveBeenCalledWith(1);
      });
      await userEvent.click(screen.getByText('Arnold Palmer Invitational'));
      expect(tournamentService.getTournamentResults).toHaveBeenCalledWith(2);
      expect(tournamentService.getTournamentResults).toHaveBeenCalledTimes(2);
    });

    it('should show loading state while results are fetching', async () => {
      tournamentService.getTournamentResults.mockImplementation(() => new Promise(() => {}));
      render(<PastTournaments />, { wrapper: makeWrapper() });
      await waitFor(() => {
        expect(screen.getByText('The Masters')).toBeInTheDocument();
      });
      await userEvent.click(screen.getByText('The Masters'));
      expect(document.querySelector('.animate-spin')).toBeInTheDocument();
    });

    it('should display results table when loaded', async () => {
      render(<PastTournaments />, { wrapper: makeWrapper() });
      await waitFor(() => {
        expect(screen.getByText('The Masters')).toBeInTheDocument();
      });
      await userEvent.click(screen.getByText('The Masters'));
      await waitFor(() => {
        expect(screen.getByText('Scottie Scheffler')).toBeInTheDocument();
      });
    });

    it('should show not available message when results array is empty', async () => {
      tournamentService.getTournamentResults.mockResolvedValue({
        success: true,
        data: {
          tournament: { id: 1, name: 'The Masters', par: 72 },
          results: []
        }
      });
      render(<PastTournaments />, { wrapper: makeWrapper() });
      await waitFor(() => {
        expect(screen.getByText('The Masters')).toBeInTheDocument();
      });
      await userEvent.click(screen.getByText('The Masters'));
      await waitFor(() => {
        expect(screen.getByText(/Results are not yet available/i)).toBeInTheDocument();
      });
    });

    it('should display error inside panel when results fail', async () => {
      tournamentService.getTournamentResults.mockRejectedValue(new Error('Results error'));
      render(<PastTournaments />, { wrapper: makeWrapper() });
      await waitFor(() => {
        expect(screen.getByText('The Masters')).toBeInTheDocument();
      });
      await userEvent.click(screen.getByText('The Masters'));
      await waitFor(() => {
        expect(screen.getByText(/error loading results/i)).toBeInTheDocument();
      });
    });

    it('should use cached results on re-expand', async () => {
      render(<PastTournaments />, { wrapper: makeWrapper() });
      await waitFor(() => {
        expect(screen.getAllByText('The Masters').length).toBeGreaterThan(0);
      });
      // Expand
      await userEvent.click(screen.getByRole('button', { name: /The Masters/ }));
      await waitFor(() => {
        expect(screen.getByText('Scottie Scheffler')).toBeInTheDocument();
      });
      // Collapse
      await userEvent.click(screen.getByRole('button', { name: /The Masters/ }));
      expect(screen.queryByText('Scottie Scheffler')).not.toBeInTheDocument();
      // Re-expand
      await userEvent.click(screen.getByRole('button', { name: /The Masters/ }));
      await waitFor(() => {
        expect(screen.getByText('Scottie Scheffler')).toBeInTheDocument();
      });
      // Should have been called only once (cached second time)
      expect(tournamentService.getTournamentResults).toHaveBeenCalledTimes(1);
    });
  });

  describe('Final Leaderboard', () => {
    it('should render TournamentLeaderboard in final mode with expanded columns', async () => {
      render(<PastTournaments />, { wrapper: makeWrapper() });
      await waitFor(() => {
        expect(screen.getByText('The Masters')).toBeInTheDocument();
      });
      await userEvent.click(screen.getByText('The Masters'));
      await waitFor(() => {
        expect(screen.getByText('Score')).toBeInTheDocument();
        expect(screen.getByText('Strokes')).toBeInTheDocument();
        expect(screen.getByText('Tourn')).toBeInTheDocument();
        expect(screen.getByText('Season')).toBeInTheDocument();
      });
    });

    it('should display all users in results', async () => {
      render(<PastTournaments />, { wrapper: makeWrapper() });
      await waitFor(() => {
        expect(screen.getByText('The Masters')).toBeInTheDocument();
      });
      await userEvent.click(screen.getByText('The Masters'));
      await waitFor(() => {
        expect(screen.getByText('Vik')).toBeInTheDocument();
        expect(screen.getByText('Joe')).toBeInTheDocument();
      });
    });

    it('should highlight current user in results', async () => {
      localStorage.setItem('user', JSON.stringify({ user_id: 1 }));
      render(<PastTournaments />, { wrapper: makeWrapper() });
      await waitFor(() => {
        expect(screen.getByText('The Masters')).toBeInTheDocument();
      });
      await userEvent.click(screen.getByText('The Masters'));
      await waitFor(() => {
        expect(screen.getByText('Vik')).toBeInTheDocument();
      });
      localStorage.clear();
    });
  });

  describe('Navigation', () => {
    it('should display page title', () => {
      render(<PastTournaments />, { wrapper: makeWrapper() });
      // The h2 heading contains "Past Tournaments"
      expect(screen.getByRole('heading', { level: 2, name: /Past Tournaments/ })).toBeInTheDocument();
    });

    it('should navigate to dashboard when Dashboard tab is clicked', async () => {
      const { __mockNavigate } = require('../../__mocks__/react-router-dom');
      render(<PastTournaments />, { wrapper: makeWrapper() });
      await userEvent.click(screen.getByRole('button', { name: 'Dashboard' }));
      expect(__mockNavigate).toHaveBeenCalledWith('/');
    });
  });

  describe('Data Fetching', () => {
    it('should call getTournamentHistory with current year and getTournamentResults on expand', async () => {
      render(<PastTournaments />, { wrapper: makeWrapper() });
      // Wait for tournament list to render
      await waitFor(() => {
        expect(screen.getAllByText('The Masters').length).toBeGreaterThan(0);
      });
      expect(tournamentService.getTournamentHistory).toHaveBeenCalledWith(new Date().getFullYear(), 1, null);
      await userEvent.click(screen.getByRole('button', { name: /The Masters/ }));
      await waitFor(() => {
        expect(tournamentService.getTournamentResults).toHaveBeenCalledWith(1);
      });
    });

    it('should pass exclude_id to getTournamentHistory when recently_completed_tournament exists', async () => {
      tournamentService.getAppInfo.mockResolvedValue({
        current_tournament: null,
        recently_completed_tournament: { id: 99, name: 'Arnold Palmer Invitational', end_date: '2026-03-09', is_major: false }
      });

      render(<PastTournaments />, { wrapper: makeWrapper() });

      await waitFor(() => {
        expect(tournamentService.getTournamentHistory).toHaveBeenCalledWith(
          new Date().getFullYear(),
          1,
          99
        );
      });
    });

    it('should pass null exclude_id when recently_completed_tournament is null', async () => {
      tournamentService.getAppInfo.mockResolvedValue({
        current_tournament: null,
        recently_completed_tournament: null
      });

      render(<PastTournaments />, { wrapper: makeWrapper() });

      await waitFor(() => {
        expect(tournamentService.getTournamentHistory).toHaveBeenCalledWith(
          new Date().getFullYear(),
          1,
          null
        );
      });
    });
  });
});
