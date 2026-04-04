import React, { useState } from 'react';
import '../styles/ModerationReportModal.css';

const REASONS = [
  { value: 'inappropriate_content', label: 'Inappropriate Content' },
  { value: 'spam', label: 'Spam' },
  { value: 'incorrect_information', label: 'Incorrect Information' },
  { value: 'other', label: 'Other' },
];

const ModerationReportModal = ({ open, title, onClose, onSubmit }) => {
  const [reason, setReason] = useState('inappropriate_content');
  const [otherText, setOtherText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!open) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (reason === 'other' && !otherText.trim()) {
      alert('Please provide details for Other reason.');
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit({ reason, otherText: reason === 'other' ? otherText.trim() : '' });
      setOtherText('');
      setReason('inappropriate_content');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mod-report-overlay" onClick={onClose}>
      <div className="mod-report-modal" onClick={(e) => e.stopPropagation()}>
        <button className="mod-close" onClick={onClose}>&times;</button>
        <h3>Report Content</h3>
        <p className="mod-subtitle">{title}</p>

        <form onSubmit={handleSubmit} className="mod-form">
          {REASONS.map((entry) => (
            <label key={entry.value} className="mod-radio">
              <input
                type="radio"
                name="reason"
                value={entry.value}
                checked={reason === entry.value}
                onChange={(e) => setReason(e.target.value)}
              />
              {entry.label}
            </label>
          ))}

          {reason === 'other' && (
            <textarea
              rows={3}
              placeholder="Describe the issue"
              value={otherText}
              onChange={(e) => setOtherText(e.target.value)}
            />
          )}

          <button type="submit" className="mod-submit" disabled={submitting}>
            {submitting ? 'Submitting...' : 'Submit Report'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ModerationReportModal;