import React, { useCallback, useEffect, useState } from 'react';
import { moderationAPI } from '../api/moderation';
import { useAuth } from '../context/AuthContext';
import Swal from 'sweetalert2';
import '../styles/ModerationDashboard.css';

const DashboardModeration = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [modPage, setModPage] = useState(1);
  const [modItems, setModItems] = useState([]);
  const [modMeta, setModMeta] = useState({ page: 1, totalPages: 1, total: 0, limit: 4 });
  const [modLoading, setModLoading] = useState(false);

  const fetchModerationItems = useCallback(async () => {
    if (!isAdmin) return;

    setModLoading(true);
    try {
      const data = await moderationAPI.getItems({ page: modPage, limit: 4 });
      setModItems(data.items || []);
      setModMeta(data.pagination || { page: 1, totalPages: 1, total: 0, limit: 4 });
    } catch (err) {
      console.error(err);
    } finally {
      setModLoading(false);
    }
  }, [isAdmin, modPage]);

  useEffect(() => {
    fetchModerationItems();
  }, [fetchModerationItems]);

  const handleRestore = async (itemId) => {
    const result = await Swal.fire({
      title: 'Restore content?',
      text: 'This content will be made visible again.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#2563eb',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Yes, restore',
    });
    if (!result.isConfirmed) return;

    try {
      await moderationAPI.restoreItem(itemId);
      await fetchModerationItems();
      await Swal.fire({
        title: 'Restored',
        text: 'Content restored successfully.',
        icon: 'success',
        timer: 1600,
        showConfirmButton: false,
      });
    } catch (err) {
      Swal.fire({
        title: 'Restore failed',
        text: err.message || 'Something went wrong while restoring content.',
        icon: 'error',
      });
    }
  };

  const handleDeleteContent = async (itemId) => {
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: 'This content will be deleted permanently.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Yes, delete it',
    });
    if (!result.isConfirmed) return;

    try {
      await moderationAPI.deleteContent(itemId);
      await fetchModerationItems();
      await Swal.fire({
        title: 'Deleted',
        text: 'Content deleted successfully.',
        icon: 'success',
        timer: 1600,
        showConfirmButton: false,
      });
    } catch (err) {
      Swal.fire({
        title: 'Delete failed',
        text: err.message || 'Something went wrong while deleting content.',
        icon: 'error',
      });
    }
  };

  const handleSuspend = async (submittedBy) => {
    if (!submittedBy?._id) return;
    const { value: daysRaw } = await Swal.fire({
      title: 'Suspend user',
      text: 'Suspend for how many days?',
      input: 'number',
      inputValue: 3,
      inputAttributes: {
        min: 1,
        step: 1,
      },
      showCancelButton: true,
      confirmButtonText: 'Next',
      cancelButtonText: 'Cancel',
      inputValidator: (value) => {
        if (!value || Number(value) < 1) {
          return 'Please enter a valid number of days';
        }
        return null;
      },
    });
    if (!daysRaw) return;

    const { value: reason } = await Swal.fire({
      title: 'Suspension reason',
      input: 'text',
      inputValue: 'Content policy violation',
      showCancelButton: true,
      confirmButtonText: 'Suspend user',
      cancelButtonText: 'Cancel',
      inputValidator: (value) => {
        if (!value || !value.trim()) {
          return 'Reason is required';
        }
        return null;
      },
    });
    if (!reason) return;

    try {
      await moderationAPI.suspendUser(submittedBy._id, { days: Number(daysRaw), reason: reason.trim() });
      await fetchModerationItems();
      await Swal.fire({
        title: 'User suspended',
        text: `${submittedBy?.username || 'User'} suspended successfully.`,
        icon: 'success',
        timer: 1700,
        showConfirmButton: false,
      });
    } catch (err) {
      Swal.fire({
        title: 'Suspend failed',
        text: err.message || 'Something went wrong while suspending user.',
        icon: 'error',
      });
    }
  };

  const handleUnsuspend = async (submittedBy) => {
    if (!submittedBy?._id) return;

    const result = await Swal.fire({
      title: 'Unsuspend user?',
      text: `${submittedBy?.username || 'This user'} will regain access immediately.`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#2563eb',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Yes, unsuspend',
    });
    if (!result.isConfirmed) return;

    try {
      await moderationAPI.unsuspendUser(submittedBy._id);
      await fetchModerationItems();
      await Swal.fire({
        title: 'User unsuspended',
        text: `${submittedBy?.username || 'User'} unsuspended successfully.`,
        icon: 'success',
        timer: 1700,
        showConfirmButton: false,
      });
    } catch (err) {
      Swal.fire({
        title: 'Unsuspend failed',
        text: err.message || 'Something went wrong while unsuspending user.',
        icon: 'error',
      });
    }
  };

  if (!isAdmin) {
    return (
      <div className="moderation-dashboard-container">
        <div className="moderation-content">
          <p className="empty-state">You do not have access to content moderation.</p>
        </div>
      </div>
    );
  }

  const startItem = modMeta.total === 0 ? 0 : ((modPage - 1) * modMeta.limit) + 1;

  return (
    <div className="moderation-dashboard-container">
      <div className="moderation-content">
        <div className="moderation-header">
          <h2 className="moderation-title">Content Moderation Queue</h2>
          <div className="moderation-tabs">
            <span className="moderation-tab-label">Show:</span>
            <button className="moderation-tab active">All Reports</button>
          </div>
        </div>

        <div className="moderation-table-container">
          <table className="moderation-table">
            <thead>
              <tr>
                <th>CONTENT TITLE</th>
                <th>SUBMITTED BY</th>
                <th>REPORT COUNT</th>
                <th>STATUS</th>
                <th>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {!modLoading && modItems.map((item) => {
                const suspended = item.submittedBy?.suspendedUntil && new Date(item.submittedBy.suspendedUntil).getTime() > Date.now();
                const initials = (item.submittedBy?.username || 'U').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

                return (
                  <tr key={item._id}>
                    <td>
                      <div className="content-title-cell">
                        <div className="content-title-main">{item.title}</div>
                        <div className="content-title-meta">
                          {item.contentType} / {item.moduleCode || 'N/A'} / {item.resourceType || 'Document'}
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="submitted-by-cell">
                        <div className="user-avatar-small">{initials}</div>
                        <span className="user-name">{item.submittedBy?.username || 'Unknown'}</span>
                      </div>
                    </td>
                    <td>
                      <span className={`report-count ${item.reportCount > 10 ? 'high' : item.reportCount > 0 ? 'medium' : 'low'}`}>
                        {item.reportCount}
                      </span>
                    </td>
                    <td>
                      {item.status === 'auto_hidden' ? (
                        <span className="status-badge auto-hidden">AUTO-HIDDEN</span>
                      ) : item.status === 'flagged' ? (
                        <span className="status-badge flagged">FLAGGED</span>
                      ) : (
                        <span className="status-badge normal">NORMAL</span>
                      )}
                    </td>
                    <td>
                      <div className="moderation-actions">
                        <button className="mod-action-btn restore" onClick={() => handleRestore(item._id)} title="Restore">
                          ↻
                        </button>
                        <button className="mod-action-btn delete" onClick={() => handleDeleteContent(item._id)} title="Delete">
                          🗑
                        </button>
                        {!suspended && (
                          <button className="mod-action-btn suspend" onClick={() => handleSuspend(item.submittedBy)} title="Suspend User">
                            ⊘
                          </button>
                        )}
                        {suspended && (
                          <button className="mod-action-btn unsuspend" onClick={() => handleUnsuspend(item.submittedBy)} title="Unsuspend User">
                            ✓
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!modLoading && modItems.length === 0 && (
                <tr>
                  <td colSpan={5} className="empty-state">
                    No moderation records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="moderation-pagination">
          <div className="pagination-info">
            Showing {startItem} of {modMeta.total} items
          </div>
          <div className="pagination-controls">
            <button
              className="pagination-btn"
              disabled={modPage <= 1}
              onClick={() => setModPage((prev) => Math.max(1, prev - 1))}
            >
              ‹
            </button>
            <button className={`pagination-btn ${modPage === 1 ? 'active' : ''}`} onClick={() => setModPage(1)}>
              1
            </button>
            {modMeta.totalPages > 1 && (
              <button className={`pagination-btn ${modPage === 2 ? 'active' : ''}`} onClick={() => setModPage(2)}>
                2
              </button>
            )}
            {modMeta.totalPages > 2 && (
              <button className={`pagination-btn ${modPage === 3 ? 'active' : ''}`} onClick={() => setModPage(3)}>
                3
              </button>
            )}
            <button
              className="pagination-btn"
              disabled={modPage >= modMeta.totalPages}
              onClick={() => setModPage((prev) => Math.min(modMeta.totalPages, prev + 1))}
            >
              ›
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardModeration;
