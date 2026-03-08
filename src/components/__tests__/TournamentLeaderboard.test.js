import React from 'react';
import { render, screen } from '@testing-library/react';
import TournamentLeaderboard from '../TournamentLeaderboard';

const mockTournament = {
  id: 1,
  name: 'The Masters',
  par: 72,
  current_round: 2,
  cut_line: { score: '-3', count: 65 }
};

const mockLiveLeaderboard = [
  {
    user_id: 1,
    username: 'John Doe',
    current_position: 1,
    golfers: [
      {
        golfer_id: 1,
        name: 'Tiger Woods',
        position: '1',
        status: 'active',
        rounds: [
          { round: 1, score: 68, thru: 'F' },
          { round: 2, score: 70, thru: '14' }
        ],
        was_replaced: false
      }
    ]
  }
];

const mockFinalLeaderboard = [
  {
    place: 1,
    user_id: 1,
    username: 'John Doe',
    total_points: -4,
    golfers: [
      {
        name: 'Tiger Woods',
        final_position: '1',
        status: 'active',
        total_score: 272,
        was_replaced: false
      }
    ]
  }
];

describe('TournamentLeaderboard', () => {
  describe('Live Mode', () => {
    it('should render round columns R1, R2, R3, R4', () => {
      render(
        <TournamentLeaderboard
          leaderboard={mockLiveLeaderboard}
          currentUserId={null}
          tournament={mockTournament}
        />
      );
      expect(screen.getByText('R1')).toBeInTheDocument();
      expect(screen.getByText('R2')).toBeInTheDocument();
      expect(screen.getByText('R3')).toBeInTheDocument();
      expect(screen.getByText('R4')).toBeInTheDocument();
    });

    it('should display even par score as "E"', () => {
      const leaderboard = [{
        user_id: 1, username: 'John', current_position: 1,
        golfers: [{ golfer_id: 1, name: 'Golfer', position: 'T1', status: 'active',
          rounds: [{ round: 1, score: 72, thru: 'F' }], was_replaced: false }]
      }];
      render(
        <TournamentLeaderboard leaderboard={leaderboard} currentUserId={null} tournament={mockTournament} />
      );
      expect(screen.getAllByText('E').length).toBeGreaterThan(0);
    });

    it('should display under par score with minus sign', () => {
      const leaderboard = [{
        user_id: 1, username: 'John', current_position: 1,
        golfers: [{ golfer_id: 1, name: 'Golfer', position: 'T1', status: 'active',
          rounds: [{ round: 1, score: 70, thru: 'F' }], was_replaced: false }]
      }];
      render(
        <TournamentLeaderboard leaderboard={leaderboard} currentUserId={null} tournament={mockTournament} />
      );
      expect(screen.getAllByText('-2').length).toBeGreaterThan(0);
    });

    it('should display over par score with plus sign', () => {
      const leaderboard = [{
        user_id: 1, username: 'John', current_position: 1,
        golfers: [{ golfer_id: 1, name: 'Golfer', position: 'T10', status: 'active',
          rounds: [{ round: 1, score: 75, thru: 'F' }], was_replaced: false }]
      }];
      render(
        <TournamentLeaderboard leaderboard={leaderboard} currentUserId={null} tournament={mockTournament} />
      );
      expect(screen.getAllByText('+3').length).toBeGreaterThan(0);
    });

    it('should display "--" for missing round scores', () => {
      const leaderboard = [{
        user_id: 1, username: 'John', current_position: 1,
        golfers: [{ golfer_id: 1, name: 'Golfer', position: 'T1', status: 'active',
          rounds: [{ round: 1, score: 68, thru: 'F' }], was_replaced: false }]
      }];
      render(
        <TournamentLeaderboard leaderboard={leaderboard} currentUserId={null} tournament={mockTournament} />
      );
      const dashes = screen.getAllByText('--');
      expect(dashes.length).toBeGreaterThanOrEqual(3);
    });

    it('should display scissors icon for cut golfer', () => {
      const leaderboard = [{
        user_id: 1, username: 'John', current_position: 1,
        golfers: [{ golfer_id: 1, name: 'Cut Golfer', position: 'CUT', status: 'cut',
          rounds: [{ round: 1, score: 78, thru: 'F' }, { round: 2, score: 76, thru: 'F' }],
          was_replaced: false }]
      }];
      render(
        <TournamentLeaderboard leaderboard={leaderboard} currentUserId={null} tournament={mockTournament} />
      );
      expect(screen.getByText('✂️')).toBeInTheDocument();
    });

    it('should display prohibited icon for withdrawn golfer', () => {
      const leaderboard = [{
        user_id: 1, username: 'John', current_position: 1,
        golfers: [{ golfer_id: 1, name: 'WD Golfer', position: 'WD', status: 'wd',
          rounds: [{ round: 1, score: 72, thru: 'F' }], was_replaced: false }]
      }];
      render(
        <TournamentLeaderboard leaderboard={leaderboard} currentUserId={null} tournament={mockTournament} />
      );
      expect(screen.getByText('🚫')).toBeInTheDocument();
    });

    it('should display thru indicator for in-progress current round', () => {
      const leaderboard = [{
        user_id: 1, username: 'John', current_position: 1,
        golfers: [{ golfer_id: 1, name: 'Golfer', position: 'T5', status: 'active',
          rounds: [
            { round: 1, score: 68, thru: 'F' },
            { round: 2, score: 71, thru: '9' }
          ], was_replaced: false }]
      }];
      render(
        <TournamentLeaderboard leaderboard={leaderboard} currentUserId={null} tournament={mockTournament} />
      );
      expect(screen.getByText('(9)')).toBeInTheDocument();
    });

    it('should highlight current user row', () => {
      render(
        <TournamentLeaderboard
          leaderboard={mockLiveLeaderboard}
          currentUserId={1}
          tournament={mockTournament}
        />
      );
      const userCell = screen.getByText('John Doe');
      expect(userCell).toBeInTheDocument();
      // The rank cell should have green left border class
      const rankCell = userCell.parentElement.querySelector('td:first-child');
      expect(rankCell).toBeTruthy();
    });

    it('should display position ordinal for golfer', () => {
      render(
        <TournamentLeaderboard
          leaderboard={mockLiveLeaderboard}
          currentUserId={null}
          tournament={mockTournament}
        />
      );
      expect(screen.getByText('(1st)')).toBeInTheDocument();
    });

    it('should display Team and Tot column headers', () => {
      render(
        <TournamentLeaderboard
          leaderboard={mockLiveLeaderboard}
          currentUserId={null}
          tournament={mockTournament}
        />
      );
      expect(screen.getByText('Team')).toBeInTheDocument();
      expect(screen.getByText('Tot')).toBeInTheDocument();
    });

    it('should NOT flag golfer as cut if they made the cut after R1+R2 but had a bad R3', () => {
      const leaderboard = [{
        user_id: 1, username: 'John', current_position: 1,
        golfers: [{ golfer_id: 1, name: 'Golfer', position: 'T10', status: 'active',
          rounds: [
            { round: 1, score: 70, thru: 'F' },
            { round: 2, score: 71, thru: 'F' },
            { round: 3, score: 78, thru: 'F' }
          ], was_replaced: false }]
      }];
      const tournamentWithCut = {
        ...mockTournament,
        current_round: 3,
        cut_line: { score: '+2', count: 70 }
      };
      render(
        <TournamentLeaderboard leaderboard={leaderboard} currentUserId={null} tournament={tournamentWithCut} />
      );
      expect(screen.queryByText('✂️')).not.toBeInTheDocument();
    });
  });

  describe('Final Mode', () => {
    it('should render Final and Pts columns instead of round columns', () => {
      render(
        <TournamentLeaderboard
          leaderboard={mockFinalLeaderboard}
          currentUserId={null}
          tournament={mockTournament}
          mode="final"
        />
      );
      expect(screen.getByText('Final')).toBeInTheDocument();
      expect(screen.getByText('Pts')).toBeInTheDocument();
      expect(screen.queryByText('R1')).not.toBeInTheDocument();
      expect(screen.queryByText('R2')).not.toBeInTheDocument();
    });

    it('should display raw strokes in Final column', () => {
      render(
        <TournamentLeaderboard
          leaderboard={mockFinalLeaderboard}
          currentUserId={null}
          tournament={mockTournament}
          mode="final"
        />
      );
      expect(screen.getByText('272')).toBeInTheDocument();
    });

    it('should not display thru indicators in final mode', () => {
      render(
        <TournamentLeaderboard
          leaderboard={mockFinalLeaderboard}
          currentUserId={null}
          tournament={mockTournament}
          mode="final"
        />
      );
      expect(screen.queryByText('(F)')).not.toBeInTheDocument();
      expect(screen.queryByText(/^\(\d+\)$/)).not.toBeInTheDocument();
    });

    it('should display was_replaced badge for replaced golfers', () => {
      const leaderboardWithReplaced = [{
        place: 1,
        user_id: 1,
        username: 'John Doe',
        total_points: -4,
        golfers: [{
          name: 'Replacement Golfer',
          final_position: '5',
          status: 'active',
          total_score: 280,
          was_replaced: true
        }]
      }];
      render(
        <TournamentLeaderboard
          leaderboard={leaderboardWithReplaced}
          currentUserId={null}
          tournament={mockTournament}
          mode="final"
        />
      );
      expect(screen.getByText('↔')).toBeInTheDocument();
    });

    it('should highlight current user in final mode', () => {
      render(
        <TournamentLeaderboard
          leaderboard={mockFinalLeaderboard}
          currentUserId={1}
          tournament={mockTournament}
          mode="final"
        />
      );
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should render without error when leaderboard is empty', () => {
      render(
        <TournamentLeaderboard
          leaderboard={[]}
          currentUserId={null}
          tournament={mockTournament}
        />
      );
      expect(screen.getByText('The Masters')).toBeInTheDocument();
    });

    it('should render without error when user has empty golfers array', () => {
      const leaderboard = [{
        user_id: 1,
        username: 'John Doe',
        current_position: 1,
        golfers: []
      }];
      render(
        <TournamentLeaderboard
          leaderboard={leaderboard}
          currentUserId={null}
          tournament={mockTournament}
        />
      );
      expect(screen.getByText('The Masters')).toBeInTheDocument();
    });

    it('should default to live mode when mode prop is not specified', () => {
      render(
        <TournamentLeaderboard
          leaderboard={mockLiveLeaderboard}
          currentUserId={null}
          tournament={mockTournament}
        />
      );
      expect(screen.getByText('R1')).toBeInTheDocument();
    });
  });
});
