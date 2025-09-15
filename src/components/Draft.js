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
        // Sort picks by priority and map to golfers
        const sortedPicks = [...data.picks].sort((a, b) => a.priority - b.priority);
        const preSelectedGolfers = sortedPicks.map(pick => {
          return data.golfers.find(golfer => golfer.id === pick.golfer_id);
        }).filter(Boolean);
        
        // Fill array to length 8, with undefined for missing slots
        const initialSelections = Array(8).fill(null);
        preSelectedGolfers.forEach((golfer, index) => {
          if (index < 8) {
            initialSelections[index] = golfer;
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

  if (isLoading) return <div className="loading">Loading draft data...</div>;
  if (error) return <div className="error">Error loading draft data</div>;

  const renderContent = () => {
    switch (data?.mode) {
      case 'unavailable':
        return (
          <div className="draft-unavailable">
            <h3>Draft Not Available</h3>
            <p>The draft is not currently available. Tournament golfers may not be loaded yet.</p>
          </div>
        );
      
      case 'pick':
        return (
          <div className="draft-pick">
            <h3>Make Your Picks</h3>
            <p>Select 8 golfers for this tournament ({formatDraftWindow()})</p>
            
            {message && <div className={`message ${message.includes('success') ? 'success' : 'error'}`}>{message}</div>}
            
            <div className="golfer-selection">
              {[1, 2, 3, 4, 5, 6, 7, 8].map(priority => (
                <div key={priority} className="pick-slot">
                  <label>Pick #{priority}:</label>
                  <select 
                    value={selectedGolfers[priority - 1]?.id || ''}
                    onChange={(e) => {
                      const golfer = data.golfers.find(g => g.id === parseInt(e.target.value));
                      handleGolferSelect(golfer, priority);
                    }}
                  >
                    <option value="">Select a golfer</option>
                    {getAvailableGolfers(priority).map(golfer => (
                      <option key={golfer.id} value={golfer.id}>
                        {golfer.full_name}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
            
            <button 
              onClick={handleSubmit}
              disabled={submitPicksMutation.isPending || selectedGolfers.filter(g => g).length !== 8}
              className="submit-btn"
            >
              {submitPicksMutation.isPending ? 'Submitting...' : 'Submit Picks'}
            </button>
          </div>
        );

      case 'edit':
        return (
          <div className="draft-edit">
            <h3>Edit Your Picks</h3>
            <p>You can modify your picks for this tournament ({formatDraftWindow()})</p>
            
            {message && <div className={`message ${message.includes('success') ? 'success' : 'error'}`}>{message}</div>}
            
            <div className="golfer-selection">
              {[1, 2, 3, 4, 5, 6, 7, 8].map(priority => (
                <div key={priority} className="pick-slot">
                  <label>Pick #{priority}:</label>
                  <select 
                    value={selectedGolfers[priority - 1]?.id || ''}
                    onChange={(e) => {
                      const golfer = data.golfers.find(g => g.id === parseInt(e.target.value));
                      handleGolferSelect(golfer, priority);
                    }}
                  >
                    <option value="">Select a golfer</option>
                    {getAvailableGolfers(priority).map(golfer => (
                      <option key={golfer.id} value={golfer.id}>
                        {golfer.full_name}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
            
            <button 
              onClick={handleSubmit}
              disabled={submitPicksMutation.isPending || selectedGolfers.filter(g => g).length !== 8}
              className="submit-btn"
            >
              {submitPicksMutation.isPending ? 'Updating...' : 'Update Picks'}
            </button>
          </div>
        );
      
      case 'review':
        return (
          <div className="draft-review">
            <h3>Your Tournament Picks</h3>
            <p>Here are your current picks for {data?.tournament?.name}</p>
            
            <div className="picks-list">
              {data.picks?.map((pick, index) => {
                const golfer = data.golfers?.find(g => g.id === pick.golfer_id);
                return (
                  <div key={pick.id} className="pick-item">
                    <span className="priority">#{pick.priority}</span>
                    <span className="golfer-name">{golfer?.full_name || 'Unknown Golfer'}</span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      
      default:
        return <div>Unknown draft mode</div>;
    }
  };

  return (
    <div className="draft">
      <div className="draft-header">
        <div>
          <h2>Draft Picks</h2>
          <button onClick={() => navigate('/')} className="back-btn">
            ← Back to Dashboard
          </button>
        </div>
        <button onClick={handleLogout} className="logout-btn">
          Logout
        </button>
      </div>
      
      <div className="draft-content">
        {renderContent()}
      </div>
    </div>
  );
}

export default Draft;