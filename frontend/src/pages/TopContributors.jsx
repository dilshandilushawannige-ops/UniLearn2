import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import html2canvas from 'html2canvas';
import api from '../api/axios';
import podiumMedal1st from '../assets/podium-medal-1st.png';
import podiumMedal2nd from '../assets/podium-medal-2nd.png';
import podiumMedal3rd from '../assets/podium-medal-3rd.png';
import '../styles/StackOver.css';

const PODIUM_MEDAL_SRC = { 1: podiumMedal1st, 2: podiumMedal2nd, 3: podiumMedal3rd };

const SITE_NAME = (import.meta.env.VITE_SITE_NAME || 'UniLearnHub').trim();

/** Podium slot 1–3 (use slot index, not only API `user.rank`, so labels match the column). */
const rankBadge = (rank) => {
  const r = Number(rank);
  if (r === 1) return { label: 'Champion', tone: 'gold' };
  if (r === 2) return { label: 'Runner-up', tone: 'silver' };
  if (r === 3) return { label: '3rd place', tone: 'bronze' };
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

/** Maps backend `User.checkAndAwardBadges` names → CSS modifier (exact match; avoids false “first” hits). */
const BADGE_KIND_BY_NAME = {
  'first question': 'first-question',
  'first answer': 'first-answer',
  helpful: 'helpful',
  'accepted pro': 'accepted-pro',
  'top contributor': 'top-contributor',
};

const badgeKind = (name = '') => {
  const k = (name || '').toLowerCase().trim();
  return BADGE_KIND_BY_NAME[k] || 'default';
};

const RANK_WORD = { 1: 'FIRST', 2: 'SECOND', 3: 'THIRD' };

/** Pictograms per resolved `kind` (must stay in sync with `badgeKind`). */
const BadgeTypeIcon = ({ kind, size = 20 }) => {
  const cls = 'leaderboard-badge-type-icon';
  switch (kind) {
    case 'first-question':
      return (
        <svg className={cls} viewBox="0 0 24 24" width={size} height={size} aria-hidden>
          <rect x="5" y="4" width="14" height="18" rx="2" fill="none" stroke="currentColor" strokeWidth="1.75" />
          <path d="M8 8h8M8 12h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <circle cx="17" cy="16" r="3" fill="currentColor" opacity="0.25" />
        </svg>
      );
    case 'first-answer':
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
    case 'helpful':
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
    case 'accepted-pro':
      return (
        <svg className={cls} viewBox="0 0 24 24" width={size} height={size} aria-hidden>
          <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="1.75" />
          <path d="M8 12l2.5 2.5L16 9" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case 'top-contributor':
      return (
        <svg className={cls} viewBox="0 0 24 24" width={size} height={size} aria-hidden>
          <path
            d="M12 3l2.2 4.5L19 8.5l-3.5 3.4.8 4.9L12 15.9 7.7 16.8l.8-4.9L5 8.5l4.8-.9L12 3z"
            fill="currentColor"
            opacity="0.9"
          />
        </svg>
      );
    default:
      return (
        <svg className={cls} viewBox="0 0 24 24" width={size} height={size} aria-hidden>
          <circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" strokeWidth="1.75" />
          <path d="M12 8v5M12 16h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
  }
};

function CreativeBadge({ name, compact = false }) {
  const kind = badgeKind(name);
  return (
    <div className={`lb-site-badge lb-site-badge--${kind}${compact ? ' lb-site-badge--compact' : ''}`} title={name}>
      <span className="lb-site-badge__icon" aria-hidden>
        <BadgeTypeIcon kind={kind} size={compact ? 16 : 18} />
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

/** Certificate of Achievement (navy / light blue / gold). Ref = root node for PNG export. */
const PodiumCertificate = React.forwardRef(function PodiumCertificate(
  { place, displayName, vacant, modal = false },
  ref
) {
  const slot = Number(place);
  const word = RANK_WORD[slot] || 'FIRST';
  const name = (displayName || '').trim() || '—';

  return (
    <div
      ref={ref}
      className={`podium-certificate podium-certificate--place-${place}${vacant ? ' podium-certificate--vacant' : ''}${modal ? ' podium-certificate--modal' : ''}`}
      role={modal ? 'document' : 'img'}
      aria-label={
        vacant ? `${word} place — certificate slot open` : `Certificate of achievement for ${name}, ${word} place`
      }
    >
      <div className="podium-certificate__frame">
        <span className="podium-certificate__corner podium-certificate__corner--tr" aria-hidden />
        <span className="podium-certificate__corner podium-certificate__corner--bl" aria-hidden />
        <div className="podium-certificate__sheet">
          <div className="podium-certificate__title">Certificate</div>
          <div className="podium-certificate__subtitle">of achievement</div>
          <p className="podium-certificate__issuer">{SITE_NAME}</p>
          <div className="podium-certificate__diamonds" aria-hidden>
            <span />
            <span />
            <span />
          </div>
          <p className="podium-certificate__present">This certificate is proudly presented to</p>
          <p className="podium-certificate__name">{vacant ? '—' : name}</p>
          <p className="podium-certificate__body">
            {vacant
              ? 'Awaiting a top forum contributor.'
              : `For excellence as ${word} place on the ${SITE_NAME} forum leaderboard.`}
          </p>
          <p className="podium-certificate__official">
            Official recognition · {SITE_NAME} · Top Contributors
          </p>
          <div className="podium-certificate__footer">
            <div className="podium-certificate__sig">
              <span className="podium-certificate__sig-hand podium-certificate__sig-hand--left" aria-hidden>
                {SITE_NAME}
              </span>
              <span className="podium-certificate__sig-line" />
              <span className="podium-certificate__sig-label">Executive Director</span>
            </div>
            <div className="podium-certificate__seal-wrap" aria-hidden>
              <div className="podium-certificate__seal">
                <span className="podium-certificate__seal-star">★</span>
                <span className="podium-certificate__seal-rank">{slot}</span>
                <span className="podium-certificate__seal-site">{SITE_NAME}</span>
              </div>
              <div className="podium-certificate__ribbons">
                <span className="podium-certificate__ribbon podium-certificate__ribbon--l" />
                <span className="podium-certificate__ribbon podium-certificate__ribbon--r" />
              </div>
            </div>
            <div className="podium-certificate__sig">
              <span className="podium-certificate__sig-hand podium-certificate__sig-hand--right" aria-hidden>
                Leadership Team
              </span>
              <span className="podium-certificate__sig-line" />
              <span className="podium-certificate__sig-label">Forum Board</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

PodiumCertificate.displayName = 'PodiumCertificate';

function PodiumSlot({ user, place, metal, onOpenCertificate }) {
  const beam = place === 1 ? 'tall' : place === 2 ? 'mid' : 'short';
  const slotLabel = user ? rankBadge(place) : null;
  const word = RANK_WORD[Number(place)] || 'FIRST';

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
            {slotLabel && (
              <span className={`awards-podium-champion rank-${slotLabel.tone}`}>{slotLabel.label}</span>
            )}
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

      <button
        type="button"
        className={`awards-floating-cap awards-medal-img${user ? '' : ' awards-floating-cap--vacant'}`}
        style={{ backgroundImage: `url(${PODIUM_MEDAL_SRC[place]})` }}
        onClick={() => onOpenCertificate(place)}
        aria-label={
          user ? `Open certificate: ${user.username}, ${word} place` : `Open ${word} place certificate`
        }
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
            (user.badges || []).map((b, i) => (
              <CreativeBadge key={`${b.name}-${b.awardedAt || i}`} name={b.name} />
            ))
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
  const [certModal, setCertModal] = useState(null);
  const [certDownloading, setCertDownloading] = useState(false);
  const certCaptureRef = useRef(null);
  const certExportLockRef = useRef(false);

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

  useEffect(() => {
    if (!certModal) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') setCertModal(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [certModal]);

  const openCertificate = (place) => {
    const idx = Math.max(0, Math.min(2, place - 1));
    setCertModal({ place, user: podiumUsers[idx] });
  };

  const downloadCertificatePng = useCallback(async () => {
    if (certExportLockRef.current) return;
    const node = certCaptureRef.current;
    if (!node || !certModal) return;
    certExportLockRef.current = true;
    setCertDownloading(true);
    try {
      await document.fonts.ready;
      const canvas = await html2canvas(node, {
        scale: 2,
        useCORS: true,
        allowTaint: false,
        backgroundColor: '#ffffff',
        logging: false,
      });
      const safeUser = (certModal.user?.username || 'open-slot').replace(/[^\w.-]+/g, '_');
      const { place } = certModal;
      const link = document.createElement('a');
      link.download = `${SITE_NAME.replace(/\s+/g, '-')}-certificate-place-${place}-${safeUser}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      console.error(err);
    } finally {
      certExportLockRef.current = false;
      setCertDownloading(false);
    }
  }, [certModal]);

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
                  <PodiumSlot
                    key={place}
                    user={podiumUsers[idx]}
                    place={place}
                    metal={metal}
                    onOpenCertificate={openCertificate}
                  />
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
                    {(u.badges || []).map((b, i) => (
                      <CreativeBadge key={`${b.name}-${b.awardedAt || i}`} name={b.name} compact />
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

      {certModal && (
        <div
          className="podium-cert-modal-backdrop"
          onClick={() => setCertModal(null)}
          role="presentation"
        >
          <div
            className="podium-cert-modal-card"
            role="dialog"
            aria-modal="true"
            aria-label={`${RANK_WORD[certModal.place]} place certificate`}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="podium-cert-modal-close"
              onClick={() => setCertModal(null)}
              aria-label="Close certificate"
            >
              ×
            </button>
            <PodiumCertificate
              ref={certCaptureRef}
              place={certModal.place}
              displayName={certModal.user?.username}
              vacant={!certModal.user}
              modal
            />
            <div className="podium-cert-modal-actions">
              <button
                type="button"
                className="podium-cert-download-btn"
                onClick={downloadCertificatePng}
                disabled={certDownloading}
              >
                {certDownloading ? 'Preparing download…' : 'Download certificate (PNG)'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TopContributors;
