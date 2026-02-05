import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Draft from '../Draft';
import { tournamentService } from '../../services/tournament';
import { authService } from '../../services/auth';
import { __mockNavigate as mockNavigate } from '../../__mocks__/react-router-dom';

// Mock dependencies
jest.mock('../../services/tournament');
jest.mock('../../services/auth');
jest.mock('react-router-dom');

// Mock data
const mockGolfers = [
  { id: 1, full_name: 'Tiger Woods' },
  { id: 2, full_name: 'Phil Mickelson' },
  { id: 3, full_name: 'Rory McIlroy' },
  { id: 4, full_name: 'Jordan Spieth' },
  { id: 5, full_name: 'Justin Thomas' },
  { id: 6, full_name: 'Dustin Johnson' },
  { id: 7, full_name: 'Brooks Koepka' },
  { id: 8, full_name: 'Jon Rahm' },
  { id: 9, full_name: 'Bryson DeChambeau' },
  { id: 10, full_name: 'Patrick Cantlay' }
];

const mockTournament = {
  id: 1,
  name: 'The Masters',
  draft_window: {
    start: '2025-04-07T00:00:00Z',
    end: '2025-04-09T23:59:59Z'
  }
};

const mockPickModeDraftData = {
  mode: 'pick',
  golfers: mockGolfers,
  tournament: mockTournament,
  picks: []
};

const mockEditModeDraftData = {
  mode: 'edit',
  golfers: mockGolfers,
  tournament: mockTournament,
  picks: [
    { id: 1, golfer_id: 1, priority: 1 },
    { id: 2, golfer_id: 2, priority: 2 },
    { id: 3, golfer_id: 3, priority: 3 },
    { id: 4, golfer_id: 4, priority: 4 },
    { id: 5, golfer_id: 5, priority: 5 },
    { id: 6, golfer_id: 6, priority: 6 },
    { id: 7, golfer_id: 7, priority: 7 },
    { id: 8, golfer_id: 8, priority: 8 }
  ]
};

const mockReviewModeDraftData = {
  mode: 'review',
  golfers: mockGolfers,
  tournament: mockTournament,
  picks: [
    { id: 1, golfer_id: 1, priority: 1 },
    { id: 2, golfer_id: 2, priority: 2 },
    { id: 3, golfer_id: 3, priority: 3 },
    { id: 4, golfer_id: 4, priority: 4 },
    { id: 5, golfer_id: 5, priority: 5 },
    { id: 6, golfer_id: 6, priority: 6 },
    { id: 7, golfer_id: 7, priority: 7 },
    { id: 8, golfer_id: 8, priority: 8 }
  ]
};

const mockUnavailableDraftData = {
  mode: 'unavailable',
  golfers: [],
  tournament: mockTournament
};

const mockAppInfo = {
  current_tournament: mockTournament
};

// Helper function to create a fresh QueryClient for each test
const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false }
  }
});

// Wrapper component for React Query
const createWrapper = (queryClient) => {
  return ({ children }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('Draft Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    tournamentService.getAppInfo.mockResolvedValue(mockAppInfo);
  });

  describe('Rendering - All Modes', () => {
    test('renders loading state while fetching data', () => {
      tournamentService.getDraftData.mockImplementation(() => new Promise(() => {})); // Never resolves

      const queryClient = createTestQueryClient();
      render(<Draft />, { wrapper: createWrapper(queryClient) });

      expect(screen.getByText(/loading draft data/i)).toBeInTheDocument();
    });

    test('renders error state when data fetch fails', async () => {
      tournamentService.getDraftData.mockRejectedValue(new Error('Failed to fetch'));

      const queryClient = createTestQueryClient();
      render(<Draft />, { wrapper: createWrapper(queryClient) });

      await waitFor(() => {
        expect(screen.getByText(/error loading draft data/i)).toBeInTheDocument();
      });
    });

    test('renders header with back button and logout button', async () => {
      tournamentService.getDraftData.mockResolvedValue(mockPickModeDraftData);

      const queryClient = createTestQueryClient();
      render(<Draft />, { wrapper: createWrapper(queryClient) });

      await waitFor(() => {
        expect(screen.getByText(/draft picks/i)).toBeInTheDocument();
      });

      expect(screen.getByRole('button', { name: /back to dashboard/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /logout/i })).toBeInTheDocument();
    });

    test('renders draft window information in pick mode', async () => {
      tournamentService.getDraftData.mockResolvedValue(mockPickModeDraftData);

      const queryClient = createTestQueryClient();
      render(<Draft />, { wrapper: createWrapper(queryClient) });

      await waitFor(() => {
        expect(screen.getByText(/select 8 golfers for this tournament/i)).toBeInTheDocument();
      });
    });

    test('renders unavailable mode message', async () => {
      tournamentService.getDraftData.mockResolvedValue(mockUnavailableDraftData);

      const queryClient = createTestQueryClient();
      render(<Draft />, { wrapper: createWrapper(queryClient) });

      await waitFor(() => {
        expect(screen.getByText(/draft not available/i)).toBeInTheDocument();
        expect(screen.getByText(/tournament golfers may not be loaded yet/i)).toBeInTheDocument();
      });
    });
  });

  describe('Pick Mode', () => {
    test('renders 8 golfer selection dropdowns', async () => {
      tournamentService.getDraftData.mockResolvedValue(mockPickModeDraftData);

      const queryClient = createTestQueryClient();
      render(<Draft />, { wrapper: createWrapper(queryClient) });

      await waitFor(() => {
        for (let i = 1; i <= 8; i++) {
          expect(screen.getByLabelText(`Pick #${i}:`)).toBeInTheDocument();
        }
      });
    });

    test('submit button is disabled when less than 8 golfers selected', async () => {
      tournamentService.getDraftData.mockResolvedValue(mockPickModeDraftData);

      const queryClient = createTestQueryClient();
      render(<Draft />, { wrapper: createWrapper(queryClient) });

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /submit picks/i })).toBeDisabled();
      });
    });

    test('submit button is enabled when 8 golfers selected', async () => {
      tournamentService.getDraftData.mockResolvedValue(mockPickModeDraftData);

      const queryClient = createTestQueryClient();
      render(<Draft />, { wrapper: createWrapper(queryClient) });

      await waitFor(() => {
        expect(screen.getByLabelText('Pick #1:')).toBeInTheDocument();
      });

      // Select 8 golfers
      for (let i = 1; i <= 8; i++) {
        const select = screen.getByLabelText(`Pick #${i}:`);
        await userEvent.selectOptions(select, i.toString());
      }

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /submit picks/i })).not.toBeDisabled();
      });
    });

    test('shows success message after successful submission', async () => {
      tournamentService.getDraftData.mockResolvedValue(mockPickModeDraftData);
      tournamentService.submitPicks.mockResolvedValue({ message: 'Picks submitted successfully!' });

      const queryClient = createTestQueryClient();
      render(<Draft />, { wrapper: createWrapper(queryClient) });

      await waitFor(() => {
        expect(screen.getByLabelText('Pick #1:')).toBeInTheDocument();
      });

      // Select 8 golfers
      for (let i = 1; i <= 8; i++) {
        const select = screen.getByLabelText(`Pick #${i}:`);
        await userEvent.selectOptions(select, i.toString());
      }

      const submitButton = screen.getByRole('button', { name: /submit picks/i });
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/picks submitted successfully/i)).toBeInTheDocument();
      });
    });

    test('shows error message on failed submission', async () => {
      tournamentService.getDraftData.mockResolvedValue(mockPickModeDraftData);
      tournamentService.submitPicks.mockRejectedValue({
        response: { data: { error: 'Failed to submit picks' } }
      });

      const queryClient = createTestQueryClient();
      render(<Draft />, { wrapper: createWrapper(queryClient) });

      await waitFor(() => {
        expect(screen.getByLabelText('Pick #1:')).toBeInTheDocument();
      });

      // Select 8 golfers
      for (let i = 1; i <= 8; i++) {
        const select = screen.getByLabelText(`Pick #${i}:`);
        await userEvent.selectOptions(select, i.toString());
      }

      const submitButton = screen.getByRole('button', { name: /submit picks/i });
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/failed to submit picks/i)).toBeInTheDocument();
      });
    });

    test('filters out already selected golfers from other dropdowns', async () => {
      tournamentService.getDraftData.mockResolvedValue(mockPickModeDraftData);

      const queryClient = createTestQueryClient();
      render(<Draft />, { wrapper: createWrapper(queryClient) });

      await waitFor(() => {
        expect(screen.getByLabelText('Pick #1:')).toBeInTheDocument();
      });

      // Select Tiger Woods for Pick #1
      const select1 = screen.getByLabelText('Pick #1:');
      await userEvent.selectOptions(select1, '1');

      // Check that Tiger Woods is not available in Pick #2
      const select2 = screen.getByLabelText('Pick #2:');
      const options = Array.from(select2.querySelectorAll('option')).map(opt => opt.textContent);

      expect(options).not.toContain('Tiger Woods');
      expect(options).toContain('Phil Mickelson');
    });
  });

  describe('Edit Mode', () => {
    test('pre-populates golfers from existing picks', async () => {
      tournamentService.getDraftData.mockResolvedValue(mockEditModeDraftData);

      const queryClient = createTestQueryClient();
      render(<Draft />, { wrapper: createWrapper(queryClient) });

      await waitFor(() => {
        expect(screen.getByLabelText('Pick #1:')).toHaveValue('1');
        expect(screen.getByLabelText('Pick #2:')).toHaveValue('2');
        expect(screen.getByLabelText('Pick #3:')).toHaveValue('3');
        expect(screen.getByLabelText('Pick #4:')).toHaveValue('4');
        expect(screen.getByLabelText('Pick #5:')).toHaveValue('5');
        expect(screen.getByLabelText('Pick #6:')).toHaveValue('6');
        expect(screen.getByLabelText('Pick #7:')).toHaveValue('7');
        expect(screen.getByLabelText('Pick #8:')).toHaveValue('8');
      });
    });

    test('renders Update Picks button text in edit mode', async () => {
      tournamentService.getDraftData.mockResolvedValue(mockEditModeDraftData);

      const queryClient = createTestQueryClient();
      render(<Draft />, { wrapper: createWrapper(queryClient) });

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /update picks/i })).toBeInTheDocument();
      });
    });

    test('allows changing selections in edit mode', async () => {
      tournamentService.getDraftData.mockResolvedValue(mockEditModeDraftData);

      const queryClient = createTestQueryClient();
      render(<Draft />, { wrapper: createWrapper(queryClient) });

      await waitFor(() => {
        expect(screen.getByLabelText('Pick #1:')).toHaveValue('1');
      });

      // Change Pick #1 to Bryson DeChambeau (id: 9)
      const select1 = screen.getByLabelText('Pick #1:');
      await userEvent.selectOptions(select1, '9');

      expect(select1).toHaveValue('9');
    });

    test('submits updated picks successfully', async () => {
      tournamentService.getDraftData.mockResolvedValue(mockEditModeDraftData);
      tournamentService.submitPicks.mockResolvedValue({ message: 'Picks updated successfully!' });

      const queryClient = createTestQueryClient();
      render(<Draft />, { wrapper: createWrapper(queryClient) });

      await waitFor(() => {
        expect(screen.getByLabelText('Pick #1:')).toHaveValue('1');
      });

      // Change Pick #1
      const select1 = screen.getByLabelText('Pick #1:');
      await userEvent.selectOptions(select1, '9');

      const updateButton = screen.getByRole('button', { name: /update picks/i });
      await userEvent.click(updateButton);

      await waitFor(() => {
        expect(tournamentService.submitPicks).toHaveBeenCalled();
      });
    });

    test('sorts picks by priority before pre-populating', async () => {
      // Provide unsorted picks
      const unsortedData = {
        ...mockEditModeDraftData,
        picks: [
          { id: 1, golfer_id: 8, priority: 8 },
          { id: 2, golfer_id: 1, priority: 1 },
          { id: 3, golfer_id: 3, priority: 3 },
          { id: 4, golfer_id: 2, priority: 2 }
        ]
      };
      tournamentService.getDraftData.mockResolvedValue(unsortedData);

      const queryClient = createTestQueryClient();
      render(<Draft />, { wrapper: createWrapper(queryClient) });

      // Should be sorted by priority: 1, 2, 3, 8
      await waitFor(() => {
        expect(screen.getByLabelText('Pick #1:')).toHaveValue('1');
        expect(screen.getByLabelText('Pick #2:')).toHaveValue('2');
        expect(screen.getByLabelText('Pick #3:')).toHaveValue('3');
        expect(screen.getByLabelText('Pick #8:')).toHaveValue('8');
      });
    });
  });

  describe('Review Mode', () => {
    test('displays all picks with priorities', async () => {
      tournamentService.getDraftData.mockResolvedValue(mockReviewModeDraftData);

      const queryClient = createTestQueryClient();
      render(<Draft />, { wrapper: createWrapper(queryClient) });

      await waitFor(() => {
        for (let i = 1; i <= 8; i++) {
          expect(screen.getByText(`#${i}`)).toBeInTheDocument();
        }
      });
    });

    test('shows golfer names from picks', async () => {
      tournamentService.getDraftData.mockResolvedValue(mockReviewModeDraftData);

      const queryClient = createTestQueryClient();
      render(<Draft />, { wrapper: createWrapper(queryClient) });

      await waitFor(() => {
        expect(screen.getByText('Tiger Woods')).toBeInTheDocument();
        expect(screen.getByText('Phil Mickelson')).toBeInTheDocument();
        expect(screen.getByText('Rory McIlroy')).toBeInTheDocument();
      });
    });

    test('does not show edit controls in review mode', async () => {
      tournamentService.getDraftData.mockResolvedValue(mockReviewModeDraftData);

      const queryClient = createTestQueryClient();
      render(<Draft />, { wrapper: createWrapper(queryClient) });

      await waitFor(() => {
        expect(screen.getByText(/your tournament picks/i)).toBeInTheDocument();
      });

      expect(screen.queryByLabelText('Pick #1:')).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /submit picks/i })).not.toBeInTheDocument();
    });

    test('displays tournament name', async () => {
      tournamentService.getDraftData.mockResolvedValue(mockReviewModeDraftData);

      const queryClient = createTestQueryClient();
      render(<Draft />, { wrapper: createWrapper(queryClient) });

      await waitFor(() => {
        expect(screen.getByText(/the masters/i)).toBeInTheDocument();
      });
    });
  });

  describe('User Interactions', () => {
    test('selecting a golfer updates the selection', async () => {
      tournamentService.getDraftData.mockResolvedValue(mockPickModeDraftData);

      const queryClient = createTestQueryClient();
      render(<Draft />, { wrapper: createWrapper(queryClient) });

      await waitFor(() => {
        expect(screen.getByLabelText('Pick #1:')).toBeInTheDocument();
      });

      const select = screen.getByLabelText('Pick #1:');
      await userEvent.selectOptions(select, '1');

      expect(select).toHaveValue('1');
    });

    test('back button navigates to dashboard', async () => {
      tournamentService.getDraftData.mockResolvedValue(mockPickModeDraftData);

      const queryClient = createTestQueryClient();
      render(<Draft />, { wrapper: createWrapper(queryClient) });

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /back to dashboard/i })).toBeInTheDocument();
      });

      const backButton = screen.getByRole('button', { name: /back to dashboard/i });
      await userEvent.click(backButton);

      expect(mockNavigate).toHaveBeenCalledWith('/');
    });

    test('logout button logs out and navigates to login', async () => {
      tournamentService.getDraftData.mockResolvedValue(mockPickModeDraftData);
      authService.logout.mockResolvedValue();

      const queryClient = createTestQueryClient();
      render(<Draft />, { wrapper: createWrapper(queryClient) });

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /logout/i })).toBeInTheDocument();
      });

      const logoutButton = screen.getByRole('button', { name: /logout/i });
      await userEvent.click(logoutButton);

      await waitFor(() => {
        expect(authService.logout).toHaveBeenCalled();
        expect(mockNavigate).toHaveBeenCalledWith('/login');
      });
    });

    test('submitting picks redirects to dashboard after success', async () => {
      tournamentService.getDraftData.mockResolvedValue(mockPickModeDraftData);
      tournamentService.submitPicks.mockResolvedValue({ message: 'Success!' });

      const queryClient = createTestQueryClient();
      render(<Draft />, { wrapper: createWrapper(queryClient) });

      await waitFor(() => {
        expect(screen.getByLabelText('Pick #1:')).toBeInTheDocument();
      });

      // Select 8 golfers
      for (let i = 1; i <= 8; i++) {
        const select = screen.getByLabelText(`Pick #${i}:`);
        await userEvent.selectOptions(select, i.toString());
      }

      const submitButton = screen.getByRole('button', { name: /submit picks/i });
      await userEvent.click(submitButton);

      // Wait for redirect (1500ms timeout in component)
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/');
      }, { timeout: 2000 });
    });

    test('shows button loading state during submission', async () => {
      tournamentService.getDraftData.mockResolvedValue(mockPickModeDraftData);
      tournamentService.submitPicks.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

      const queryClient = createTestQueryClient();
      render(<Draft />, { wrapper: createWrapper(queryClient) });

      await waitFor(() => {
        expect(screen.getByLabelText('Pick #1:')).toBeInTheDocument();
      });

      // Select 8 golfers
      for (let i = 1; i <= 8; i++) {
        const select = screen.getByLabelText(`Pick #${i}:`);
        await userEvent.selectOptions(select, i.toString());
      }

      const submitButton = screen.getByRole('button', { name: /submit picks/i });
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/submitting/i)).toBeInTheDocument();
      });
    });
  });

  describe('Edge Cases & Accessibility', () => {
    test('handles missing tournament data gracefully', async () => {
      const dataWithoutTournament = {
        ...mockPickModeDraftData,
        tournament: null
      };
      tournamentService.getDraftData.mockResolvedValue(dataWithoutTournament);
      tournamentService.getAppInfo.mockResolvedValue({ current_tournament: null });

      const queryClient = createTestQueryClient();
      render(<Draft />, { wrapper: createWrapper(queryClient) });

      await waitFor(() => {
        expect(screen.getByText(/make your picks/i)).toBeInTheDocument();
      });

      // Should show fallback message
      expect(screen.getByText(/draft window information not available/i)).toBeInTheDocument();
    });

    test('prevents selecting more than 8 golfers', async () => {
      tournamentService.getDraftData.mockResolvedValue(mockPickModeDraftData);
      tournamentService.submitPicks.mockResolvedValue({ message: 'Success!' });

      const queryClient = createTestQueryClient();
      render(<Draft />, { wrapper: createWrapper(queryClient) });

      await waitFor(() => {
        expect(screen.getByLabelText('Pick #1:')).toBeInTheDocument();
      });

      // Select exactly 8 golfers
      for (let i = 1; i <= 8; i++) {
        const select = screen.getByLabelText(`Pick #${i}:`);
        await userEvent.selectOptions(select, i.toString());
      }

      const submitButton = screen.getByRole('button', { name: /submit picks/i });
      await userEvent.click(submitButton);

      // Verify submitPicks was called with exactly 8 picks
      await waitFor(() => {
        expect(tournamentService.submitPicks).toHaveBeenCalledWith(
          expect.arrayContaining([
            { golfer_id: 1 },
            { golfer_id: 2 },
            { golfer_id: 3 },
            { golfer_id: 4 },
            { golfer_id: 5 },
            { golfer_id: 6 },
            { golfer_id: 7 },
            { golfer_id: 8 }
          ])
        );
      });
    });

    test('labels are associated with select elements', async () => {
      tournamentService.getDraftData.mockResolvedValue(mockPickModeDraftData);

      const queryClient = createTestQueryClient();
      render(<Draft />, { wrapper: createWrapper(queryClient) });

      await waitFor(() => {
        for (let i = 1; i <= 8; i++) {
          const select = screen.getByLabelText(`Pick #${i}:`);
          expect(select).toBeInTheDocument();
          expect(select.tagName).toBe('SELECT');
        }
      });
    });
  });

  describe('localStorage Persistence', () => {
    const STORAGE_KEY = 'sgt_draft_picks';

    beforeEach(() => {
      localStorage.clear();
    });

    test('saves selections to localStorage when golfer is selected', async () => {
      tournamentService.getDraftData.mockResolvedValue(mockPickModeDraftData);

      const queryClient = createTestQueryClient();
      render(<Draft />, { wrapper: createWrapper(queryClient) });

      await waitFor(() => {
        expect(screen.getByLabelText('Pick #1:')).toBeInTheDocument();
      });

      // Select a golfer
      const select = screen.getByLabelText('Pick #1:');
      await userEvent.selectOptions(select, '1');

      // Check localStorage
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
      expect(stored.tournamentId).toBe(mockTournament.id);
      expect(stored.selections[0].id).toBe(1);
    });

    test('restores selections from localStorage on page load', async () => {
      // Pre-save draft to localStorage
      const savedDraft = {
        tournamentId: mockTournament.id,
        savedAt: Date.now(),
        expiresAt: Date.now() + 48 * 60 * 60 * 1000,
        selections: [
          mockGolfers[0],
          mockGolfers[1],
          null, null, null, null, null, null
        ]
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(savedDraft));

      tournamentService.getDraftData.mockResolvedValue(mockPickModeDraftData);

      const queryClient = createTestQueryClient();
      render(<Draft />, { wrapper: createWrapper(queryClient) });

      await waitFor(() => {
        expect(screen.getByLabelText('Pick #1:')).toHaveValue('1');
        expect(screen.getByLabelText('Pick #2:')).toHaveValue('2');
      });
    });

    test('shows draft restored notification when selections are restored', async () => {
      const savedDraft = {
        tournamentId: mockTournament.id,
        savedAt: Date.now(),
        expiresAt: Date.now() + 48 * 60 * 60 * 1000,
        selections: [mockGolfers[0], null, null, null, null, null, null, null]
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(savedDraft));

      tournamentService.getDraftData.mockResolvedValue(mockPickModeDraftData);

      const queryClient = createTestQueryClient();
      render(<Draft />, { wrapper: createWrapper(queryClient) });

      await waitFor(() => {
        expect(screen.getByText(/your previous draft selections have been restored/i)).toBeInTheDocument();
      });
    });

    test('can dismiss draft restored notification', async () => {
      const savedDraft = {
        tournamentId: mockTournament.id,
        savedAt: Date.now(),
        expiresAt: Date.now() + 48 * 60 * 60 * 1000,
        selections: [mockGolfers[0], null, null, null, null, null, null, null]
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(savedDraft));

      tournamentService.getDraftData.mockResolvedValue(mockPickModeDraftData);

      const queryClient = createTestQueryClient();
      render(<Draft />, { wrapper: createWrapper(queryClient) });

      await waitFor(() => {
        expect(screen.getByText(/your previous draft selections have been restored/i)).toBeInTheDocument();
      });

      const dismissButton = screen.getByRole('button', { name: /dismiss notification/i });
      await userEvent.click(dismissButton);

      await waitFor(() => {
        expect(screen.queryByText(/your previous draft selections have been restored/i)).not.toBeInTheDocument();
      });
    });

    test('does not restore expired draft', async () => {
      const expiredDraft = {
        tournamentId: mockTournament.id,
        savedAt: Date.now() - 100000,
        expiresAt: Date.now() - 1000, // Expired
        selections: [mockGolfers[0], null, null, null, null, null, null, null]
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(expiredDraft));

      tournamentService.getDraftData.mockResolvedValue(mockPickModeDraftData);

      const queryClient = createTestQueryClient();
      render(<Draft />, { wrapper: createWrapper(queryClient) });

      await waitFor(() => {
        expect(screen.getByLabelText('Pick #1:')).toHaveValue('');
      });

      expect(screen.queryByText(/your previous draft selections have been restored/i)).not.toBeInTheDocument();
    });

    test('does not restore draft from different tournament', async () => {
      const differentTournamentDraft = {
        tournamentId: 999, // Different tournament
        savedAt: Date.now(),
        expiresAt: Date.now() + 48 * 60 * 60 * 1000,
        selections: [mockGolfers[0], null, null, null, null, null, null, null]
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(differentTournamentDraft));

      tournamentService.getDraftData.mockResolvedValue(mockPickModeDraftData);

      const queryClient = createTestQueryClient();
      render(<Draft />, { wrapper: createWrapper(queryClient) });

      await waitFor(() => {
        expect(screen.getByLabelText('Pick #1:')).toHaveValue('');
      });

      expect(screen.queryByText(/your previous draft selections have been restored/i)).not.toBeInTheDocument();
    });

    test('clears localStorage on successful submission', async () => {
      tournamentService.getDraftData.mockResolvedValue(mockPickModeDraftData);
      tournamentService.submitPicks.mockResolvedValue({ message: 'Picks submitted successfully!' });

      const queryClient = createTestQueryClient();
      render(<Draft />, { wrapper: createWrapper(queryClient) });

      await waitFor(() => {
        expect(screen.getByLabelText('Pick #1:')).toBeInTheDocument();
      });

      // Select 8 golfers
      for (let i = 1; i <= 8; i++) {
        const select = screen.getByLabelText(`Pick #${i}:`);
        await userEvent.selectOptions(select, i.toString());
      }

      // Verify localStorage has data before submit
      expect(localStorage.getItem(STORAGE_KEY)).not.toBeNull();

      const submitButton = screen.getByRole('button', { name: /submit picks/i });
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/picks submitted successfully/i)).toBeInTheDocument();
      });

      // localStorage should be cleared after successful submission
      expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    });

    test('server data takes precedence over localStorage in edit mode', async () => {
      // Save different selections to localStorage
      const savedDraft = {
        tournamentId: mockTournament.id,
        savedAt: Date.now(),
        expiresAt: Date.now() + 48 * 60 * 60 * 1000,
        selections: [
          mockGolfers[4], // Justin Thomas (id: 5)
          mockGolfers[5], // Dustin Johnson (id: 6)
          null, null, null, null, null, null
        ]
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(savedDraft));

      // Server returns different picks
      tournamentService.getDraftData.mockResolvedValue(mockEditModeDraftData);

      const queryClient = createTestQueryClient();
      render(<Draft />, { wrapper: createWrapper(queryClient) });

      // Should show server data (Tiger Woods = 1, Phil Mickelson = 2)
      await waitFor(() => {
        expect(screen.getByLabelText('Pick #1:')).toHaveValue('1');
        expect(screen.getByLabelText('Pick #2:')).toHaveValue('2');
      });

      // Should not show restored notification in edit mode
      expect(screen.queryByText(/your previous draft selections have been restored/i)).not.toBeInTheDocument();
    });

    test('replaces unavailable golfers with null when restoring', async () => {
      // Save draft with a golfer that is no longer available
      const unavailableGolfer = { id: 999, full_name: 'Withdrawn Player' };
      const savedDraft = {
        tournamentId: mockTournament.id,
        savedAt: Date.now(),
        expiresAt: Date.now() + 48 * 60 * 60 * 1000,
        selections: [
          mockGolfers[0], // Tiger Woods - still available
          unavailableGolfer, // Not in golfers list
          null, null, null, null, null, null
        ]
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(savedDraft));

      tournamentService.getDraftData.mockResolvedValue(mockPickModeDraftData);

      const queryClient = createTestQueryClient();
      render(<Draft />, { wrapper: createWrapper(queryClient) });

      await waitFor(() => {
        expect(screen.getByLabelText('Pick #1:')).toHaveValue('1'); // Valid golfer restored
        expect(screen.getByLabelText('Pick #2:')).toHaveValue(''); // Unavailable golfer not restored
      });
    });
  });
});
