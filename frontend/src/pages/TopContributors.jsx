import React, { useEffect, useMemo, useState } from 'react';
import api from '../api/axios';
import podiumMedalsSprite from '../assets/podium-medals.png';
import '../styles/StackOver.css';

const rankBadge = (rank) => {
  if (rank === 1) return { label: 'Champion', tone: 'gold' };
  if (rank === 2) return { label: 'Runner-up', tone: 'silver' };
  if (rank === 3) return { label: '3rd place', tone: 'bronze' };
  return null;
};

const resolveContributorAvatar = (avatar, username) => {
  const a = (avatar || '').trim();
  if (a) {
    if (/^https?:\/\//i.test(a)) return a;
    if (a.startsWith('/')) {
      const root = (import.meta.env.VITE_API_URL || '').replace(/\/api\/?$/, '') || '';
      return `${root}${a}`;
    }
  }
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(username || 'U')}&background=random&size=128`;
};

/** Visual theme key per achievement (creative card styles) */
const badgeKind = (name = '') => {
  const v = name.toLowerCase();
  if (v.includes('first question')) return 'first-question';
  if (v.includes('first answer')) return 'first-answer';
  if (v.includes('helpful')) return 'helpful';
  if (v.includes('accepted')) return 'accepted-pro';
  if (v.includes('top contributor')) return 'top-contributor';
  return 'default';
};

const RANK_WORD = { 1: 'FIRST', 2: 'SECOND', 3: 'THIRD' };

/** Small badge-type pictograms (matches backend badge names) */
const BadgeTypeIcon = ({ name, size = 20 }) => {
  const n = (name || '').toLowerCase();
  const cls = 'leaderboard-badge-type-icon';
  if (n.includes('first question')) {
    return (
      <svg className={cls} viewBox="0 0 24 24" width={size} height={size} aria-hidden>
        <rect x="5" y="4" width="14" height="18" rx="2" fill="none" stroke="currentColor" strokeWidth="1.75" />
        <path d="M8 8h8M8 12h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="17" cy="16" r="3" fill="currentColor" opacity="0.25" />
      </svg>
    );
  }
  if (n.includes('first answer')) {
    return (
      <svg className={cls} viewBox="0 0 24 24" width={size} height={size} aria-hidden>
        <path
          d="M5 6h12a2 2 0 012 2v6a2 2 0 01-2 2h-4l-4 4v-4H5a2 2 0 01-2-2V8a2 2 0 012-2z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinejoin="round"
        />
        <path d="M8 10h6M8 13h4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
    );
  }
  if (n.includes('helpful')) {
    return (
      <svg className={cls} viewBox="0 0 24 24" width={size} height={size} aria-hidden>
        <path
          d="M12 21s-6-4.35-6-9a4 4 0 018 0c0 4.65-6 9-6 9z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  if (n.includes('accepted')) {
    return (
      <svg className={cls} viewBox="0 0 24 24" width={size} height={size} aria-hidden>
        <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="1.75" />
        <path d="M8 12l2.5 2.5L16 9" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (n.includes('top contributor')) {
    return (
      <svg className={cls} viewBox="0 0 24 24" width={size} height={size} aria-hidden>
        <path
          d="M12 3l2.2 4.5L19 8.5l-3.5 3.4.8 4.9L12 15.9 7.7 16.8l.8-4.9L5 8.5l4.8-.9L12 3z"
          fill="currentColor"
          opacity="0.9"
        />
      </svg>
    );
  }
  return (
    <svg className={cls} viewBox="0 0 24 24" width={size} height={size} aria-hidden>
      <circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" strokeWidth="1.75" />
      <path d="M12 8v5M12 16h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
};

function CreativeBadge({ name, compact = false }) {
  const kind = badgeKind(name);
  return (
    <div className={`lb-site-badge lb-site-badge--${kind}${compact ? ' lb-site-badge--compact' : ''}`} title={name}>
      <span className="lb-site-badge__icon" aria-hidden>
        <BadgeTypeIcon name={name} size={compact ? 16 : 18} />
      </span>
      <span className="lb-site-badge__label">{name}</span>
    </div>
  );
}

/** Left → right: 1st, 2nd, 3rd (reading order) */
const podiumOrder = [
  { place: 1, metal: 'gold' },
  { place: 2, metal: 'silver' },
  { place: 3, metal: 'bronze' },
];

function PodiumSlot({ user, place, metal }) {
  const word = RANK_WORD[place];
  const beam = place === 1 ? 'tall' : place === 2 ? 'mid' : 'short';
  const rb = user ? rankBadge(user.rank) : null;

  return (
    <div
      className={`awards-podium-col awards-podium-col--${metal} place-${place}${user ? '' : ' awards-podium-col--vacant'}`}
    >
      <div className={`awards-podium-top${user ? '' : ' awards-podium-top--empty'}`}>
        {user ? (
          <>
            <div className="awards-podium-avatar-ring">
              <img
                className="awards-podium-avatar"
                src={resolveContributorAvatar(user.avatar, user.username)}
                alt=""
                width={72}
                height={72}
              />
            </div>
            <div className="awards-podium-name">{user.username}</div>
            <div className="awards-podium-rep">{user.reputationScore} rep</div>
            {rb && <span className={`awards-podium-champion rank-${rb.tone}`}>{rb.label}</span>}
            <div className="awards-podium-mini">
              <span>{user.questionsAsked} Q</span>
              <span className="awards-podium-mini-dot">·</span>
              <span>{user.answersGiven} A</span>
            </div>
          </>
        ) : (
          <div className="awards-podium-placeholder" aria-hidden>
            <span className="awards-podium-placeholder-icon">—</span>
          </div>
        )}
      </div>

      <div
        className={`awards-floating-cap awards-medal-sprite awards-medal-sprite--place-${place}${user ? '' : ' awards-floating-cap--vacant'}`}
        style={{ backgroundImage: `url(${podiumMedalsSprite})` }}
        role="img"
        aria-label={`${word} place medal`}
      />

      <div className={`awards-beam awards-beam--${beam}${user ? '' : ' awards-beam--vacant'}`} aria-hidden>
        <span className="awards-beam__sheen" />
      </div>

      <div className={`awards-base${user ? '' : ' awards-base--vacant'}`}>
        <div className="awards-base__disc" />
        <div className="awards-base__core" />
        <div className="awards-base__glow" />
      </div>

      {user && (
        <div className="awards-podium-badges">
          {(user.badges || []).length > 0 ? (
            (user.badges || []).map((b) => <CreativeBadge key={b.name} name={b.name} />)
          ) : (
            <span className="awards-podium-badges-empty">No badges yet</span>
          )}
        </div>
      )}
    </div>
  );
}

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

  const { podiumUsers, tableRows } = useMemo(() => {
    const list = leaderboard.topContributors || [];
    const byRank = { 1: null, 2: null, 3: null };
    list.forEach((u) => {
      if (u.rank >= 1 && u.rank <= 3) byRank[u.rank] = u;
    });
    const podiumSlots = podiumOrder.map(({ place }) => byRank[place]);
    const tableRows = list.filter((u) => u.rank > 3);
    return { podiumUsers: podiumSlots, tableRows };
  }, [leaderboard.topContributors]);

  return (
    <div className="forum-shell">
      <div className="forum-header-card leaderboard-page-intro">
        <div>
          <h1 className="forum-title">Top Contributors</h1>
          <p className="forum-subtitle">Ranked by reputation, questions asked, and answers given.</p>
        </div>
      </div>

      <div className="leaderboard-card leaderboard-card--podium-site">
        <div className="leaderboard-awards-shell">
          {loading && <p className="leaderboard-awards-loading">Loading…</p>}
          {!loading && leaderboard.topContributors.length === 0 && (
            <p className="leaderboard-awards-loading">No contributors yet.</p>
          )}
          {!loading && leaderboard.topContributors.length > 0 && (
            <>
              <header className="leaderboard-awards-header">
                <div className="leaderboard-awards-stars" aria-hidden>
                  <span className="awards-star awards-star--sm">★</span>
                  <span className="awards-star awards-star--lg">★</span>
                  <span className="awards-star awards-star--sm">★</span>
                </div>
                <h2 className="leaderboard-awards-heading">Podium</h2>
                <p className="leaderboard-awards-tagline">First · Second · Third</p>
              </header>
              <div className="awards-podium-grid" aria-label="Top three contributors">
                {podiumOrder.map(({ place, metal }, idx) => (
                  <PodiumSlot key={place} user={podiumUsers[idx]} place={place} metal={metal} />
                ))}
              </div>
            </>
          )}
        </div>

        {!loading && tableRows.length > 0 && (
          <div className="leaderboard-awards-table-zone">
            <h4 className="leaderboard-table-section-title">Rest of leaderboard</h4>
            <div className="leaderboard-table-wrap">
              <div className="leaderboard-table-head">
                <span>Rank</span>
                <span>Student</span>
                <span>Badges</span>
                <span>Questions</span>
                <span>Answers</span>
                <span>Reputation</span>
              </div>

              {tableRows.map((u) => (
                <div key={u.userId} className="leaderboard-table-row">
                  <span className="leaderboard-cell leaderboard-rank-cell">#{u.rank}</span>
                  <span className="leaderboard-cell leaderboard-student-cell">
                    <img
                      className="leaderboard-avatar"
                      src={resolveContributorAvatar(u.avatar, u.username)}
                      alt=""
                      width={36}
                      height={36}
                    />
                    <span className="leaderboard-username">{u.username}</span>
                  </span>
                  <span className="leaderboard-cell leaderboard-badges-cell">
                    {(u.badges || []).map((b) => (
                      <CreativeBadge key={b.name} name={b.name} compact />
                    ))}
                    {!u.badges?.length && <span className="leaderboard-badge-empty">No badges yet</span>}
                  </span>
                  <span className="leaderboard-cell">{u.questionsAsked}</span>
                  <span className="leaderboard-cell">{u.answersGiven}</span>
                  <span className="leaderboard-cell">{u.reputationScore}</span>
                </div>
              ))}
            </div>
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
