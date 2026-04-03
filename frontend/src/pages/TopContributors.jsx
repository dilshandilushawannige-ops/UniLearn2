import React, { useEffect, useState } from 'react';
import api from '../api/axios';
import '../styles/StackOver.css';

const rankBadge = (rank) => {
  if (rank === 1) return { label: '🥇 Champion', tone: 'gold' };
  if (rank === 2) return { label: '🥈 Runner-up', tone: 'silver' };
  if (rank === 3) return { label: '🥉 3rd Place', tone: 'bronze' };
  return null;
};

const badgeTone = (name = '') => {
  const v = name.toLowerCase();
  if (v.includes('#1') || v.includes('champion')) return 'gold';
  if (v.includes('#2') || v.includes('runner')) return 'silver';
  if (v.includes('#3') || v.includes('third')) return 'bronze';
  if (v.includes('top')) return 'teal';
  if (v.includes('helpful') || v.includes('pro')) return 'purple';
  return 'default';
};

const TopContributors = () => {
  const [leaderboard, setLeaderboard] = useState({ topContributors: [], myStats: null });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const res = await api.get('/questions/top-contributors');
        setLeaderboard(res.data.data || { topContributors: [], myStats: null });
      } catch (err) {
        console.error(err.message);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  return (
    <div className="forum-shell">
      <div className="leaderboard-card">
        <h3 className="leaderboard-title">Top Contributors</h3>
        <p className="leaderboard-subtitle">Students who have helped the community the most</p>

        {loading ? (
          <p className="forum-state-note">Loading...</p>
        ) : (
          <div className="leaderboard-table-wrap">
            <div className="leaderboard-table-head">
              <span>Rank</span>
              <span>Student</span>
              <span>Badges</span>
              <span>Questions</span>
              <span>Answers</span>
              <span>Reputation</span>
            </div>

            {leaderboard.topContributors.slice(0, 10).map((u) => (
              <div key={u.userId} className="leaderboard-table-row">
                <span className="leaderboard-cell">{u.rank}</span>
                <span className="leaderboard-cell">{u.username}</span>
                <span className="leaderboard-cell leaderboard-badges-cell">
                  {rankBadge(u.rank) && (
                    <span className={`leaderboard-badge-pill rank-${rankBadge(u.rank).tone}`}>
                      {rankBadge(u.rank).label}
                    </span>
                  )}
                  {(u.badges || []).slice(0, 3).map((b) => (
                    <span key={b.name} className={`leaderboard-badge-pill ${badgeTone(b.name)}`}>
                      {b.name}
                    </span>
                  ))}
                  {!u.badges?.length && <span className="leaderboard-badge-empty">No badges yet</span>}
                </span>
                <span className="leaderboard-cell">{u.questionsAsked}</span>
                <span className="leaderboard-cell">{u.answersGiven}</span>
                <span className="leaderboard-cell">{u.reputationScore}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="leaderboard-card">
        <h3 className="leaderboard-title">YOUR STATS</h3>

        {loading ? (
          <p className="forum-state-note">Loading...</p>
        ) : (
          <div className="your-stats-grid">
            <div className="your-stat-box">
              <div className="your-stat-rank">#{leaderboard.myStats?.rank || 0}</div>
              <div className="your-stat-label">Rank</div>
            </div>
            <div className="your-stat-box">
              <div className="your-stat-value">{leaderboard.myStats?.reputationScore || 0}</div>
              <div className="your-stat-label">Reputation</div>
            </div>
            <div className="your-stat-box">
              <div className="your-stat-value">{leaderboard.myStats?.questionsAsked || 0}</div>
              <div className="your-stat-label">Questions</div>
            </div>
            <div className="your-stat-box">
              <div className="your-stat-value">{leaderboard.myStats?.answersGiven || 0}</div>
              <div className="your-stat-label">Answers</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TopContributors;

