const STORAGE_KEY = 'sgt_draft_picks';
const EXPIRATION_MS = 48 * 60 * 60 * 1000; // 48 hours

/**
 * Save draft selections to localStorage
 * @param {number} tournamentId - The tournament ID
 * @param {Array} selections - Array of 8 golfer objects (or null for empty slots)
 */
export const saveDraftToStorage = (tournamentId, selections) => {
  if (!tournamentId) return;

  const draftData = {
    tournamentId,
    savedAt: Date.now(),
    expiresAt: Date.now() + EXPIRATION_MS,
    selections
  };

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(draftData));
  } catch (error) {
    console.error('Failed to save draft to localStorage:', error);
  }
};

/**
 * Load draft selections from localStorage
 * Validates tournament ID, expiration, and golfer availability
 * @param {number} tournamentId - The current tournament ID
 * @param {Array} availableGolfers - Array of available golfer objects
 * @returns {Array|null} - Validated selections array or null if invalid/expired
 */
export const loadDraftFromStorage = (tournamentId, availableGolfers) => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;

    const draftData = JSON.parse(stored);

    // Validate tournament matches
    if (draftData.tournamentId !== tournamentId) {
      clearDraftStorage();
      return null;
    }

    // Validate not expired
    if (Date.now() > draftData.expiresAt) {
      clearDraftStorage();
      return null;
    }

    // Validate and filter selections - only keep golfers that are still available
    const availableGolferIds = new Set(availableGolfers.map(g => g.id));
    const validatedSelections = draftData.selections.map(selection => {
      if (!selection) return null;
      // Check if the golfer is still available in the tournament field
      if (!availableGolferIds.has(selection.id)) return null;
      // Return the full golfer object from available golfers to ensure fresh data
      return availableGolfers.find(g => g.id === selection.id) || null;
    });

    // Check if we have any valid selections to restore
    const hasValidSelections = validatedSelections.some(s => s !== null);
    if (!hasValidSelections) {
      clearDraftStorage();
      return null;
    }

    return validatedSelections;
  } catch (error) {
    console.error('Failed to load draft from localStorage:', error);
    clearDraftStorage();
    return null;
  }
};

/**
 * Clear draft storage
 */
export const clearDraftStorage = () => {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Failed to clear draft from localStorage:', error);
  }
};

/**
 * Check if there's a saved draft for the current tournament
 * @param {number} tournamentId - The current tournament ID
 * @returns {boolean} - True if a valid draft exists
 */
export const hasSavedDraft = (tournamentId) => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return false;

    const draftData = JSON.parse(stored);
    return draftData.tournamentId === tournamentId && Date.now() <= draftData.expiresAt;
  } catch {
    return false;
  }
};
