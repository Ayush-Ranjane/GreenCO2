/**
 * NotificationSettings.jsx — GreenCO2 Notification Email Manager
 * ================================================================
 * Allows users to add / remove additional email addresses that will
 * receive copies of all alert and report emails.
 *
 * APIs used:
 *   GET    /api/notifications       — list current notification emails
 *   POST   /api/notifications       — add an email  { email }
 *   DELETE /api/notifications       — remove an email { email }
 *
 * Drop this inside your Settings or Profile page, or mount as its own route.
 */

import React, { useEffect, useState } from 'react';
import axios from 'axios';
import '../assets/css/NotificationSettings.css';

const API = 'http://localhost:5000';

function authHeader() {
  return { Authorization: `Bearer ${localStorage.getItem('token')}` };
}

const NotificationSettings = () => {
  const [emails,    setEmails]    = useState([]);
  const [newEmail,  setNewEmail]  = useState('');
  const [loading,   setLoading]   = useState(false);
  const [adding,    setAdding]    = useState(false);
  const [removing,  setRemoving]  = useState(null); // email being removed
  const [error,     setError]     = useState('');
  const [success,   setSuccess]   = useState('');

  // ── Fetch existing emails ───────────────────────────────────────────────────
  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      try {
        const res = await axios.get(`${API}/api/notifications`, { headers: authHeader() });
        setEmails(res.data.emails || []);
      } catch (err) {
        setError('Failed to load notification emails.');
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  function flash(msg, isError = false) {
    if (isError) { setError(msg); setSuccess(''); }
    else          { setSuccess(msg); setError(''); }
    setTimeout(() => { setError(''); setSuccess(''); }, 4000);
  }

  // ── Add email ───────────────────────────────────────────────────────────────
  const handleAdd = async (e) => {
    e.preventDefault();
    const trimmed = newEmail.trim().toLowerCase();
    if (!trimmed || !trimmed.includes('@')) {
      flash('Please enter a valid email address.', true);
      return;
    }
    setAdding(true);
    try {
      const res = await axios.post(
        `${API}/api/notifications`,
        { email: trimmed },
        { headers: authHeader() },
      );
      setEmails(res.data.emails || []);
      setNewEmail('');
      flash(`✓ ${trimmed} added to notification list.`);
    } catch (err) {
      flash(err.response?.data?.error || 'Failed to add email.', true);
    } finally {
      setAdding(false);
    }
  };

  // ── Remove email ────────────────────────────────────────────────────────────
  const handleRemove = async (email) => {
    setRemoving(email);
    try {
      const res = await axios.delete(
        `${API}/api/notifications`,
        { headers: authHeader(), data: { email } },
      );
      setEmails(res.data.emails || []);
      flash(`✓ ${email} removed.`);
    } catch (err) {
      flash(err.response?.data?.error || 'Failed to remove email.', true);
    } finally {
      setRemoving(null);
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="notif-settings">

      <div className="notif-header">
        <span className="notif-icon">📧</span>
        <div>
          <h3>Notification Recipients</h3>
          <p>
            Alert and report emails are sent to your primary email plus everyone
            listed here. Maximum 10 extra recipients.
          </p>
        </div>
      </div>

      {/* Toast messages */}
      {error   && <div className="notif-toast notif-toast--error">⚠ {error}</div>}
      {success && <div className="notif-toast notif-toast--ok">{success}</div>}

      {/* Add form */}
      <form className="notif-add-form" onSubmit={handleAdd}>
        <input
          type="email"
          value={newEmail}
          onChange={e => setNewEmail(e.target.value)}
          placeholder="colleague@company.com"
          className="notif-input"
          disabled={adding || emails.length >= 10}
        />
        <button
          type="submit"
          className="btn btn--primary notif-add-btn"
          disabled={adding || !newEmail.trim() || emails.length >= 10}
        >
          {adding ? '⏳ Adding…' : '+ Add Recipient'}
        </button>
      </form>

      {emails.length >= 10 && (
        <p className="notif-limit-note">Maximum of 10 recipients reached.</p>
      )}

      {/* Email list */}
      {loading ? (
        <div className="notif-loading">
          <div className="loader" />
          <span>Loading…</span>
        </div>
      ) : emails.length === 0 ? (
        <div className="notif-empty">
          <span>📭</span>
          <p>No extra recipients yet. Add colleagues above to CC them on all alerts.</p>
        </div>
      ) : (
        <ul className="notif-list">
          {emails.map((email) => (
            <li key={email} className="notif-item">
              <span className="notif-avatar">
                {email.charAt(0).toUpperCase()}
              </span>
              <span className="notif-email">{email}</span>
              <button
                className="notif-remove-btn"
                onClick={() => handleRemove(email)}
                disabled={removing === email}
                title="Remove recipient"
              >
                {removing === email ? '⏳' : '✕'}
              </button>
            </li>
          ))}
        </ul>
      )}

      <p className="notif-footer-note">
        💡 All recipients receive the same alerts. They do not need a GreenCO₂ account.
      </p>
    </div>
  );
};

export default NotificationSettings;