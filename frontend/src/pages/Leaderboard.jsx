import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getLeaderboard } from '../api/leaderboard';
import '../styles/Leaderboard.css';

const Leaderboard = () => {
  const { user } = useAuth();
  const [leaderboardData, setLeaderboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    fetchLeaderboard(currentPage);
  }, [currentPage]);

  const fetchLeaderboard = async (page) => {
    try {
      setLoading(true);
      setError(null);
      const data = await getLeaderboard({ page, limit: 50, includeMe: true });
      setLeaderboardData(data);
    } catch (err) {
      console.error('Error fetching leaderboard:', err);
      setError('Failed to load leaderboard. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= leaderboardData?.pagination?.totalPages) {
      setCurrentPage(newPage);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  if (loading && !leaderboardData) {
    return (
      <div className="lb-container">
        <div className="lb-loading-state">
          <div className="lb-spinner"></div>
          <p>Loading Champions...</p>
        </div>
      </div>
    );
  }

  if (error && !leaderboardData) {
    return (
      <div className="lb-container">
        <div className="lb-error-state">
          <span className="lb-error-icon">⚠️</span>
          <p>{error}</p>
          <button onClick={() => fetchLeaderboard(currentPage)} className="lb-retry-btn">
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  const { items = [], pagination, me } = leaderboardData || {};
  const topThree = items.slice(0, 3);
  const restOfList = items.slice(3);

  return (
    <div className="leaderboard-page">
      {/* Breadcrumb Navigation matching GameDashboard */}
      <div className="lb-breadcrumb-container">
        <nav className="lb-breadcrumb">
          <Link to="/user-dashboard" className="lb-crumb-link">
            <span className="lb-icon">🏠</span> Dashboard
          </Link>
          <span className="lb-crumb-sep">/</span>
          <Link to="/user-dashboard/games" className="lb-crumb-link">
            Games
          </Link>
          <span className="lb-crumb-sep">/</span>
          <span className="lb-crumb-active">Leaderboard</span>
        </nav>
      </div>

      <div className="lb-wrapper">
        {/* Header Section */}
      <header className="lb-header">
        <div className="lb-header-title-group">
          <h1 className="lb-title">
            Academic Excellence
          </h1>
          <p className="lb-subtitle">
            Tracking the finest minds of the Global Faculty community.
          </p>
        </div>
        <div className="lb-header-filter-group">
          <span className="lb-filter-label">FILTER MODULE</span>
          <button className="lb-filter-btn">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lb-filter-icon"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon></svg>
            Global Rankings
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lb-chevron-icon"><polyline points="6 9 12 15 18 9"></polyline></svg>
          </button>
        </div>
      </header>

      <div className="lb-main-layout">
        {/* Left Column - Main Leaderboard */}
        <div className="lb-primary-content">
          
          {/* Top 3 Podium */}
          {topThree.length > 0 && (
            <div className="lb-podium-section">
              <div className="lb-podium-container">
                {/* 2nd Place */}
                {topThree[1] && (
                  <div className="lb-podium-col rank-2">
                    <div className="lb-podium-avatar-container">
                      <div className="lb-podium-medal">
                        <img src="/src/assets/2ndmedal.png" alt="2nd Place" />
                      </div>
                      <div className="lb-avatar-ring rank-2-ring">
                        <img
                          src={topThree[1].avatar || `https://ui-avatars.com/api/?name=${topThree[1].username}&background=ffb3c6&color=fff&size=128`}
                          alt={topThree[1].username}
                          className="lb-podium-avatar"
                        />
                      </div>
                    </div>
                    <div className="lb-podium-name">{topThree[1].username}</div>
                    <div className="lb-podium-qp">{topThree[1].rating} QP</div>
                    <div className="lb-podium-block block-2">
                      <span className="lb-podium-rank">2</span>
                    </div>
                  </div>
                )}

                {/* 1st Place */}
                {topThree[0] && (
                  <div className="lb-podium-col rank-1">
                    <div className="lb-podium-avatar-container">
                      <div className="lb-podium-crown">
                        <img 
                          src="/src/assets/reborn.png" 
                          onError={(e) => { e.target.src = '/src/assets/1stmedal.png' }} 
                          alt="1st Place" 
                        />
                      </div>
                      <div className="lb-avatar-ring rank-1-ring">
                        <img
                          src={topThree[0].avatar || `https://ui-avatars.com/api/?name=${topThree[0].username}&background=a7f3d0&color=000&size=128`}
                          alt={topThree[0].username}
                          className="lb-podium-avatar"
                        />
                      </div>
                    </div>
                    <div className="lb-podium-name">{topThree[0].username}</div>
                    <div className="lb-podium-qp">{topThree[0].rating} QP</div>
                    <div className="lb-podium-block block-1">
                      <span className="lb-podium-rank">1</span>
                    </div>
                  </div>
                )}

                {/* 3rd Place */}
                {topThree[2] && (
                  <div className="lb-podium-col rank-3">
                    <div className="lb-podium-avatar-container">
                      <div className="lb-podium-medal">
                        <img src="/src/assets/3rdmedal.png" alt="3rd Place" />
                      </div>
                      <div className="lb-avatar-ring rank-3-ring">
                        <img
                          src={topThree[2].avatar || `https://ui-avatars.com/api/?name=${topThree[2].username}&background=bfdbfe&color=fff&size=128`}
                          alt={topThree[2].username}
                          className="lb-podium-avatar"
                        />
                      </div>
                    </div>
                    <div className="lb-podium-name">{topThree[2].username}</div>
                    <div className="lb-podium-qp">{topThree[2].rating} QP</div>
                    <div className="lb-podium-block block-3">
                      <span className="lb-podium-rank">3</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Full Leaderboard List */}
          <div className="lb-table-container">
            <h2 className="lb-section-title">Global Rankings</h2>
            
            {items.length === 0 ? (
              <div className="lb-empty-state">
                <div className="lb-empty-icon">🎮</div>
                <h3>No players yet!</h3>
                <p>Be the very first to play and claim the top spot.</p>
              </div>
            ) : (
              <div className="lb-table">
                <div className="lb-table-header">
                  <div className="lb-col rank">#</div>
                  <div className="lb-col player">Player</div>
                  <div className="lb-col rating">Rating</div>
                  <div className="lb-col record">W/L/D</div>
                  <div className="lb-col winrate">Win Rate</div>
                </div>

                <div className="lb-table-body">
                  {items.map((player) => {
                    const isCurrentUser = player.userId === user?._id;
                    return (
                      <div key={player.userId} className={`lb-table-row ${isCurrentUser ? 'is-me' : ''}`}>
                        <div className="lb-col rank">
                          <span className={`lb-rank-number ${player.rank <= 3 ? `top-${player.rank}` : ''}`}>
                            {player.rank}
                          </span>
                        </div>
                        
                        <div className="lb-col player">
                          <img
                            src={player.avatar || `https://ui-avatars.com/api/?name=${player.username}&background=random&size=64`}
                            alt={player.username}
                            className="lb-row-avatar"
                          />
                          <div className="lb-player-info">
                            <span className="lb-player-name">
                              {player.username}
                              {isCurrentUser && <span className="lb-you-badge">YOU</span>}
                            </span>
                            <span className="lb-player-meta">Year {player.currentYear} • Sem {player.currentSemester}</span>
                          </div>
                        </div>

                        <div className="lb-col rating">
                          <span className="lb-rating-val">{player.rating}</span>
                        </div>

                        <div className="lb-col record">
                          <span className="lb-w">{player.wins}</span>-
                          <span className="lb-l">{player.losses}</span>-
                          <span className="lb-d">{player.draws}</span>
                        </div>

                        <div className="lb-col winrate">
                          <div className="lb-progress-bg">
                            <div 
                              className="lb-progress-fill" 
                              style={{ width: `${player.winRate}%`, backgroundColor: player.winRate >= 50 ? '#10b981' : '#f59e0b' }}
                            ></div>
                          </div>
                          <span className="lb-winrate-text">{player.winRate}%</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Pagination Controls */}
            {pagination && pagination.totalPages > 1 && (
              <div className="lb-pagination">
                <button
                  className="lb-page-btn"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  &larr; Prev
                </button>
                <div className="lb-page-info">
                  Page <span>{pagination.page}</span> of {pagination.totalPages}
                </div>
                <button
                  className="lb-page-btn"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === pagination.totalPages}
                >
                  Next &rarr;
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right Sidebar */}
        <aside className="lb-sidebar">
          {me && me.rank ? (
            <div className="lb-glass-card user-stats-card">
              <div className="lb-card-header">
                <h3>Your Performance</h3>
                {me.winStreak > 2 && <span className="lb-streak-fire">🔥 {me.winStreak} Streak</span>}
              </div>
              
              <div className="lb-my-rank">
                <span className="lb-rank-val">#{me.rank}</span>
                <span className="lb-rank-lbl">Global Rank</span>
              </div>
              
              <div className="lb-stats-grid">
                <div className="lb-stat-box">
                  <span className="lb-sb-lbl">Rating</span>
                  <span className="lb-sb-val highlight">{me.rating}</span>
                </div>
                <div className="lb-stat-box">
                  <span className="lb-sb-lbl">Matches</span>
                  <span className="lb-sb-val">{me.totalMatches}</span>
                </div>
                <div className="lb-stat-box">
                  <span className="lb-sb-lbl">Wins</span>
                  <span className="lb-sb-val win">{me.wins}</span>
                </div>
                <div className="lb-stat-box">
                  <span className="lb-sb-lbl">Win Rate</span>
                  <span className="lb-sb-val">{me.winRate}%</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="lb-glass-card empty-stats-card">
              <h3>Your Rank</h3>
              <div className="lb-empty-box">
                <p>Play your first quiz battle to get ranked on the global leaderboard!</p>
                <Link to="/user-dashboard/games" className="lb-action-btn">
                  Play Now
                </Link>
              </div>
            </div>
          )}

          {/* Rules / Info Card */}
          <div className="lb-glass-card rules-card">
            <h3>How It Works</h3>
            <ul className="lb-rules-list">
              <li><img src="/src/assets/swords.png" alt="Win" className="lb-rule-icon" /> Win battles to earn <strong>+25 Rating</strong></li>
              <li><img src="/src/assets/shield.png" alt="Draw" className="lb-rule-icon" /> Draws award <strong>+5 Rating</strong></li>
              <li><img src="/src/assets/broken-heart.png" alt="Loss" className="lb-rule-icon" /> Losses deduct <strong>-15 Rating</strong></li>
              <li><img src="/src/assets/fire.png" alt="Streak" className="lb-rule-icon" /> Build win streaks for bragging rights!</li>
            </ul>
          </div>
        </aside>
      </div>
    </div>
    </div>
  );
};

export default Leaderboard;