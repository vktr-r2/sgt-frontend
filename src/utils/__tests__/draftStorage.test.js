import {
  saveDraftToStorage,
  loadDraftFromStorage,
  clearDraftStorage,
  hasSavedDraft
} from '../draftStorage';

// Mock localStorage
const mockLocalStorage = (() => {
  let store = {};
  return {
    getItem: jest.fn(key => store[key] || null),
    setItem: jest.fn((key, value) => { store[key] = value; }),
    removeItem: jest.fn(key => { delete store[key]; }),
    clear: () => { store = {}; }
  };
})();

Object.defineProperty(window, 'localStorage', { value: mockLocalStorage });

const mockGolfers = [
  { id: 1, full_name: 'Tiger Woods' },
  { id: 2, full_name: 'Phil Mickelson' },
  { id: 3, full_name: 'Rory McIlroy' },
  { id: 4, full_name: 'Jordan Spieth' },
  { id: 5, full_name: 'Justin Thomas' },
  { id: 6, full_name: 'Dustin Johnson' },
  { id: 7, full_name: 'Brooks Koepka' },
  { id: 8, full_name: 'Jon Rahm' }
];

describe('draftStorage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLocalStorage.clear();
  });

  describe('saveDraftToStorage', () => {
    test('saves draft data to localStorage', () => {
      const selections = [mockGolfers[0], mockGolfers[1], null, null, null, null, null, null];
      saveDraftToStorage(123, selections);

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'sgt_draft_picks',
        expect.any(String)
      );

      const savedData = JSON.parse(mockLocalStorage.setItem.mock.calls[0][1]);
      expect(savedData.tournamentId).toBe(123);
      expect(savedData.selections).toEqual(selections);
      expect(savedData.savedAt).toBeDefined();
      expect(savedData.expiresAt).toBeDefined();
    });

    test('does not save if tournamentId is null', () => {
      saveDraftToStorage(null, []);
      expect(mockLocalStorage.setItem).not.toHaveBeenCalled();
    });

    test('does not save if tournamentId is undefined', () => {
      saveDraftToStorage(undefined, []);
      expect(mockLocalStorage.setItem).not.toHaveBeenCalled();
    });

    test('sets expiration to 48 hours from now', () => {
      const beforeSave = Date.now();
      saveDraftToStorage(123, []);
      const afterSave = Date.now();

      const savedData = JSON.parse(mockLocalStorage.setItem.mock.calls[0][1]);
      const expectedExpiration = 48 * 60 * 60 * 1000;

      expect(savedData.expiresAt).toBeGreaterThanOrEqual(beforeSave + expectedExpiration);
      expect(savedData.expiresAt).toBeLessThanOrEqual(afterSave + expectedExpiration);
    });

    test('handles localStorage errors gracefully', () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      mockLocalStorage.setItem.mockImplementationOnce(() => {
        throw new Error('QuotaExceeded');
      });

      // Should not throw
      expect(() => saveDraftToStorage(123, [])).not.toThrow();
      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });
  });

  describe('loadDraftFromStorage', () => {
    test('returns null when no saved draft exists', () => {
      const result = loadDraftFromStorage(123, mockGolfers);
      expect(result).toBeNull();
    });

    test('returns validated selections when draft is valid', () => {
      const selections = [mockGolfers[0], mockGolfers[1], null, null, null, null, null, null];
      const draftData = {
        tournamentId: 123,
        savedAt: Date.now(),
        expiresAt: Date.now() + 1000000,
        selections
      };
      mockLocalStorage.getItem.mockReturnValueOnce(JSON.stringify(draftData));

      const result = loadDraftFromStorage(123, mockGolfers);

      expect(result).toEqual(selections);
    });

    test('returns null and clears storage when tournament ID does not match', () => {
      const draftData = {
        tournamentId: 999, // Different tournament
        savedAt: Date.now(),
        expiresAt: Date.now() + 1000000,
        selections: [mockGolfers[0]]
      };
      mockLocalStorage.getItem.mockReturnValueOnce(JSON.stringify(draftData));

      const result = loadDraftFromStorage(123, mockGolfers);

      expect(result).toBeNull();
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('sgt_draft_picks');
    });

    test('returns null and clears storage when draft is expired', () => {
      const draftData = {
        tournamentId: 123,
        savedAt: Date.now() - 1000000,
        expiresAt: Date.now() - 1000, // Expired
        selections: [mockGolfers[0]]
      };
      mockLocalStorage.getItem.mockReturnValueOnce(JSON.stringify(draftData));

      const result = loadDraftFromStorage(123, mockGolfers);

      expect(result).toBeNull();
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('sgt_draft_picks');
    });

    test('replaces unavailable golfers with null', () => {
      const unavailableGolfer = { id: 999, full_name: 'Withdrawn Golfer' };
      const selections = [mockGolfers[0], unavailableGolfer, null, null, null, null, null, null];
      const draftData = {
        tournamentId: 123,
        savedAt: Date.now(),
        expiresAt: Date.now() + 1000000,
        selections
      };
      mockLocalStorage.getItem.mockReturnValueOnce(JSON.stringify(draftData));

      const result = loadDraftFromStorage(123, mockGolfers);

      expect(result[0]).toEqual(mockGolfers[0]); // Valid golfer kept
      expect(result[1]).toBeNull(); // Unavailable golfer replaced with null
    });

    test('returns fresh golfer data from availableGolfers', () => {
      const staleGolferData = { id: 1, full_name: 'Old Name', oldProperty: true };
      const selections = [staleGolferData, null, null, null, null, null, null, null];
      const draftData = {
        tournamentId: 123,
        savedAt: Date.now(),
        expiresAt: Date.now() + 1000000,
        selections
      };
      mockLocalStorage.getItem.mockReturnValueOnce(JSON.stringify(draftData));

      const result = loadDraftFromStorage(123, mockGolfers);

      expect(result[0]).toEqual(mockGolfers[0]); // Fresh data
      expect(result[0].oldProperty).toBeUndefined(); // Old property not present
    });

    test('returns null and clears if all selections become invalid', () => {
      const selections = [
        { id: 999, full_name: 'Withdrawn 1' },
        { id: 998, full_name: 'Withdrawn 2' },
        null, null, null, null, null, null
      ];
      const draftData = {
        tournamentId: 123,
        savedAt: Date.now(),
        expiresAt: Date.now() + 1000000,
        selections
      };
      mockLocalStorage.getItem.mockReturnValueOnce(JSON.stringify(draftData));

      const result = loadDraftFromStorage(123, mockGolfers);

      expect(result).toBeNull();
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('sgt_draft_picks');
    });

    test('handles corrupted JSON gracefully', () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      mockLocalStorage.getItem.mockReturnValueOnce('invalid json {{{');

      const result = loadDraftFromStorage(123, mockGolfers);

      expect(result).toBeNull();
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('sgt_draft_picks');
      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });
  });

  describe('clearDraftStorage', () => {
    test('removes draft from localStorage', () => {
      clearDraftStorage();
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('sgt_draft_picks');
    });

    test('handles localStorage errors gracefully', () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      mockLocalStorage.removeItem.mockImplementationOnce(() => {
        throw new Error('Storage error');
      });

      expect(() => clearDraftStorage()).not.toThrow();
      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });
  });

  describe('hasSavedDraft', () => {
    test('returns false when no draft exists', () => {
      expect(hasSavedDraft(123)).toBe(false);
    });

    test('returns true when valid draft exists for tournament', () => {
      const draftData = {
        tournamentId: 123,
        savedAt: Date.now(),
        expiresAt: Date.now() + 1000000,
        selections: []
      };
      mockLocalStorage.getItem.mockReturnValueOnce(JSON.stringify(draftData));

      expect(hasSavedDraft(123)).toBe(true);
    });

    test('returns false when draft is for different tournament', () => {
      const draftData = {
        tournamentId: 999,
        savedAt: Date.now(),
        expiresAt: Date.now() + 1000000,
        selections: []
      };
      mockLocalStorage.getItem.mockReturnValueOnce(JSON.stringify(draftData));

      expect(hasSavedDraft(123)).toBe(false);
    });

    test('returns false when draft is expired', () => {
      const draftData = {
        tournamentId: 123,
        savedAt: Date.now() - 1000000,
        expiresAt: Date.now() - 1000,
        selections: []
      };
      mockLocalStorage.getItem.mockReturnValueOnce(JSON.stringify(draftData));

      expect(hasSavedDraft(123)).toBe(false);
    });

    test('returns false on corrupted data', () => {
      mockLocalStorage.getItem.mockReturnValueOnce('invalid json');
      expect(hasSavedDraft(123)).toBe(false);
    });
  });
});
