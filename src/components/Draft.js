import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { tournamentService } from '../services/tournament';
import { authService } from '../services/auth';

function Draft() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedGolfers, setSelectedGolfers] = useState([]);
  const [initialLoad, setInitialLoad] = useState(true);
  const [message, setMessage] = useState('');

  const { data, isLoading, error } = useQuery({
    queryKey: ['draftData'],
    queryFn: tournamentService.getDraftData
  });

  // Pre-populate selectedGolfers when in edit mode
  React.useEffect(() => {
    if (data && (data.mode === 'edit' || data.mode === 'pick') && initialLoad) {
      if (data.mode === 'edit' && data.picks && data.picks.length > 0) {
        // Fill array to length 8, with null for missing slots
        const initialSelections = Array(8).fill(null);

        // Place each golfer at their priority position (priority 1 -> index 0, etc.)
        data.picks.forEach(pick => {
          const golfer = data.golfers.find(g => g.id === pick.golfer_id);
          if (golfer && pick.priority >= 1 && pick.priority <= 8) {
            initialSelections[pick.priority - 1] = golfer;
          }
        });

        setSelectedGolfers(initialSelections);
      }
      setInitialLoad(false);
    }
  }, [data, initialLoad]);

  const { data: tournamentData } = useQuery({
    queryKey: ['tournamentData'],
    queryFn: tournamentService.getAppInfo
  });

  const submitPicksMutation = useMutation({
    mutationFn: tournamentService.submitPicks,
    onSuccess: (response) => {
      setMessage(response.message || 'Picks submitted successfully!');
      queryClient.invalidateQueries(['draftData']);
      // Redirect to dashboard after successful submission
      setTimeout(() => {
        navigate('/');
      }, 1500); // Give user time to see the success message
    },
    onError: (error) => {
      setMessage(error.response?.data?.error || 'Failed to submit picks');
    }
  });

  const handleGolferSelect = (golfer, priority) => {
    const newPicks = [...selectedGolfers];
    newPicks[priority - 1] = golfer;
    setSelectedGolfers(newPicks);
  };

  const getAvailableGolfers = (currentPriority) => {
    if (!data?.golfers) return [];
    
    const selectedGolferIds = selectedGolfers
      .map((golfer, index) => {
        // Don't exclude the current slot's selection
        if (index === currentPriority - 1) return null;
        return golfer?.id;
      })
      .filter(id => id !== null);
    
    return data.golfers.filter(golfer => 
      !selectedGolferIds.includes(golfer.id)
    );
  };

  const handleSubmit = () => {
    const picks = selectedGolfers
      .filter(golfer => golfer)
      .map(golfer => ({ golfer_id: golfer.id }));
    
    if (picks.length !== 8) {
      setMessage('Please select exactly 8 golfers');
      return;
    }
    
    submitPicksMutation.mutate(picks);
  };

  const handleLogout = async () => {
    await authService.logout();
    navigate('/login');
  };

  const formatDraftWindow = () => {
    const tournament = tournamentData?.current_tournament;
    if (!tournament?.draft_window?.start || !tournament?.draft_window?.end) {
      return 'Draft window information not available';
    }
    
    const startDate = new Date(tournament.draft_window.start);
    const endDate = new Date(tournament.draft_window.end);
    
    const formatDate = (date) => {
      return date.toLocaleDateString('en-US', { 
        weekday: 'long', 
        month: 'short', 
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    };
    
    const startFormatted = formatDate(startDate);
    const endFormatted = formatDate(endDate);
    
    return `${startFormatted} - ${endFormatted}`;
  };

  if (isLoading) return (
    <div className="min-h-screen bg-clubhouse-cream flex items-center justify-center">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-augusta-green-600 mb-4"></div>
        <p className="font-sans text-clubhouse-brown text-lg">Loading draft data...</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="min-h-screen bg-clubhouse-cream flex items-center justify-center">
      <div className="bg-red-50 border-l-4 border-error-red rounded-lg p-6 max-w-md">
        <p className="font-sans text-error-red font-medium">Error loading draft data</p>
      </div>
    </div>
  );

  const renderContent = () => {
    switch (data?.mode) {
      case 'unavailable':
        return (
          <div className="bg-white rounded-xl shadow-elevated p-8 text-center max-w-2xl mx-auto animate-fade-in">
            <div className="w-16 h-16 bg-sand-light rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-sand-dark" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 className="font-display text-2xl text-clubhouse-mahogany mb-3">Draft Not Available</h3>
            <p className="font-sans text-clubhouse-brown">
              The draft is not currently available. Tournament golfers may not be loaded yet.
            </p>
          </div>
        );
      
      case 'pick':
        return (
          <div className="animate-fade-in">
            {/* Draft Window Banner */}
            <div className="bg-augusta-green-50 border-l-4 border-augusta-green-600 rounded-lg p-4 mb-6 flex items-start gap-3 animate-slide-up">
              <svg className="w-6 h-6 text-augusta-green-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <h4 className="font-sans font-semibold text-augusta-green-800 mb-1">Draft Window Open</h4>
                <p className="font-sans text-sm text-augusta-green-700">{formatDraftWindow()}</p>
              </div>
            </div>

            <div className="text-center mb-8">
              <h3 className="font-display text-3xl text-clubhouse-mahogany mb-2">Make Your Picks</h3>
              <p className="font-sans text-clubhouse-brown">Select 8 golfers for this tournament</p>
            </div>

            {message && (
              <div className={`rounded-lg p-4 mb-6 ${
                message.toLowerCase().includes('success')
                  ? 'bg-green-50 border-l-4 border-success-green text-success-green'
                  : 'bg-red-50 border-l-4 border-error-red text-error-red'
              }`}>
                <p className="font-sans font-medium">{message}</p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-24 md:mb-8">
              {[1, 2, 3, 4, 5, 6, 7, 8].map(priority => (
                <div
                  key={priority}
                  className={`bg-white rounded-xl shadow-country-club p-6 hover:shadow-elevated
                             transition-all duration-200 border-2 border-transparent
                             hover:border-augusta-green-200 animate-stagger-${priority}`}
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full bg-augusta-green-600 flex items-center justify-center flex-shrink-0">
                      <span className="font-sans font-bold text-white">{priority}</span>
                    </div>
                    <label htmlFor={`pick-${priority}`} className="font-sans font-medium text-clubhouse-brown">
                      Pick #{priority}:
                    </label>
                  </div>

                  <div className="relative">
                    <select
                      id={`pick-${priority}`}
                      value={selectedGolfers[priority - 1]?.id || ''}
                      onChange={(e) => {
                        const golfer = data.golfers.find(g => g.id === parseInt(e.target.value));
                        handleGolferSelect(golfer, priority);
                      }}
                      className="w-full px-4 py-3 font-sans bg-clubhouse-cream border-2 border-clubhouse-beige
                                 rounded-lg appearance-none cursor-pointer
                                 focus:border-augusta-green-600 focus:ring-4 focus:ring-augusta-green-100
                                 transition-all duration-200 outline-none"
                    >
                      <option value="">Select a golfer</option>
                      {getAvailableGolfers(priority).map(golfer => (
                        <option key={golfer.id} value={golfer.id}>
                          {golfer.full_name}
                        </option>
                      ))}
                    </select>
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                      <svg className="w-5 h-5 text-clubhouse-brown" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="fixed md:static bottom-0 left-0 right-0 bg-white md:bg-transparent p-4 md:p-0 shadow-elevated md:shadow-none">
              <button
                onClick={handleSubmit}
                disabled={submitPicksMutation.isPending || selectedGolfers.filter(g => g).length !== 8}
                className="w-full max-w-md mx-auto block bg-augusta-green-600 hover:bg-augusta-green-700
                           text-white font-sans font-bold py-4 px-8 rounded-lg
                           transition-all duration-200 shadow-md hover:shadow-lg
                           disabled:bg-gray-300 disabled:cursor-not-allowed disabled:shadow-none
                           focus:outline-none focus:ring-4 focus:ring-augusta-green-200"
              >
                {submitPicksMutation.isPending ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Submitting...
                  </span>
                ) : 'Submit Picks'}
              </button>
            </div>
          </div>
        );

      case 'edit':
        return (
          <div className="animate-fade-in">
            {/* Draft Window Banner */}
            <div className="bg-augusta-green-50 border-l-4 border-augusta-green-600 rounded-lg p-4 mb-6 flex items-start gap-3 animate-slide-up">
              <svg className="w-6 h-6 text-augusta-green-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <h4 className="font-sans font-semibold text-augusta-green-800 mb-1">Draft Window Open</h4>
                <p className="font-sans text-sm text-augusta-green-700">{formatDraftWindow()}</p>
              </div>
            </div>

            <div className="text-center mb-8">
              <h3 className="font-display text-3xl text-clubhouse-mahogany mb-2">Edit Your Picks</h3>
              <p className="font-sans text-clubhouse-brown">You can modify your picks for this tournament</p>
            </div>

            {message && (
              <div className={`rounded-lg p-4 mb-6 ${
                message.toLowerCase().includes('success')
                  ? 'bg-green-50 border-l-4 border-success-green text-success-green'
                  : 'bg-red-50 border-l-4 border-error-red text-error-red'
              }`}>
                <p className="font-sans font-medium">{message}</p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-24 md:mb-8">
              {[1, 2, 3, 4, 5, 6, 7, 8].map(priority => (
                <div
                  key={priority}
                  className={`bg-white rounded-xl shadow-country-club p-6 hover:shadow-elevated
                             transition-all duration-200 border-2 border-transparent
                             hover:border-augusta-green-200 animate-stagger-${priority}`}
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full bg-augusta-green-600 flex items-center justify-center flex-shrink-0">
                      <span className="font-sans font-bold text-white">{priority}</span>
                    </div>
                    <label htmlFor={`pick-${priority}`} className="font-sans font-medium text-clubhouse-brown">
                      Pick #{priority}:
                    </label>
                  </div>

                  <div className="relative">
                    <select
                      id={`pick-${priority}`}
                      value={selectedGolfers[priority - 1]?.id || ''}
                      onChange={(e) => {
                        const golfer = data.golfers.find(g => g.id === parseInt(e.target.value));
                        handleGolferSelect(golfer, priority);
                      }}
                      className="w-full px-4 py-3 font-sans bg-clubhouse-cream border-2 border-clubhouse-beige
                                 rounded-lg appearance-none cursor-pointer
                                 focus:border-augusta-green-600 focus:ring-4 focus:ring-augusta-green-100
                                 transition-all duration-200 outline-none"
                    >
                      <option value="">Select a golfer</option>
                      {getAvailableGolfers(priority).map(golfer => (
                        <option key={golfer.id} value={golfer.id}>
                          {golfer.full_name}
                        </option>
                      ))}
                    </select>
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                      <svg className="w-5 h-5 text-clubhouse-brown" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="fixed md:static bottom-0 left-0 right-0 bg-white md:bg-transparent p-4 md:p-0 shadow-elevated md:shadow-none">
              <button
                onClick={handleSubmit}
                disabled={submitPicksMutation.isPending || selectedGolfers.filter(g => g).length !== 8}
                className="w-full max-w-md mx-auto block bg-augusta-green-600 hover:bg-augusta-green-700
                           text-white font-sans font-bold py-4 px-8 rounded-lg
                           transition-all duration-200 shadow-md hover:shadow-lg
                           disabled:bg-gray-300 disabled:cursor-not-allowed disabled:shadow-none
                           focus:outline-none focus:ring-4 focus:ring-augusta-green-200"
              >
                {submitPicksMutation.isPending ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Updating...
                  </span>
                ) : 'Update Picks'}
              </button>
            </div>
          </div>
        );
      
      case 'review':
        return (
          <div className="animate-fade-in">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-trophy-gold rounded-full mb-4">
                <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              </div>
              <h3 className="font-display text-3xl text-clubhouse-mahogany mb-2">Your Tournament Picks</h3>
              <p className="font-sans text-clubhouse-brown">
                {data?.tournament?.name ? `Your picks for ${data.tournament.name}` : 'Your current tournament picks'}
              </p>
            </div>

            <div className="max-w-3xl mx-auto space-y-3">
              {data.picks?.sort((a, b) => a.priority - b.priority).map((pick, index) => {
                const golfer = data.golfers?.find(g => g.id === pick.golfer_id);
                return (
                  <div
                    key={pick.id}
                    className={`bg-white rounded-xl shadow-country-club p-5 border-l-4 border-augusta-green-600
                               flex items-center gap-4 hover:shadow-elevated transition-all duration-200
                               animate-stagger-${index + 1}`}
                  >
                    <div className="w-12 h-12 rounded-full bg-augusta-green-600 flex items-center justify-center flex-shrink-0">
                      <span className="font-sans font-bold text-white text-lg">#{pick.priority}</span>
                    </div>
                    <div className="flex-grow">
                      <p className="font-sans text-lg font-semibold text-clubhouse-mahogany">
                        {golfer?.full_name || 'Unknown Golfer'}
                      </p>
                    </div>
                    <svg className="w-6 h-6 text-trophy-gold flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                );
              })}
            </div>

            <div className="text-center mt-8">
              <p className="font-sans text-sm text-clubhouse-brown">
                Draft window is closed. Your picks are locked in for this tournament.
              </p>
            </div>
          </div>
        );
      
      default:
        return <div>Unknown draft mode</div>;
    }
  };

  return (
    <div className="min-h-screen bg-clubhouse-cream pb-20">
      <div className="bg-white shadow-country-club sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <h2 className="font-display text-3xl text-clubhouse-mahogany">Draft Picks</h2>
            <button
              onClick={() => navigate('/')}
              className="bg-augusta-green-600 hover:bg-augusta-green-700 text-white
                         font-sans font-medium px-4 py-2 rounded-lg transition-all duration-200
                         shadow-md hover:shadow-lg flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Dashboard
            </button>
          </div>
          <button
            onClick={handleLogout}
            className="bg-clubhouse-brown hover:bg-clubhouse-mahogany text-white
                       font-sans font-medium px-6 py-2 rounded-lg transition-all duration-200
                       shadow-md hover:shadow-lg"
          >
            Logout
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {renderContent()}
      </div>
    </div>
  );
}

export default Draft;