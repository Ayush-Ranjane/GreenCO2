/**
 * Profile.jsx — User Profile Page
 * ---------------------------------
 * Props: none (reads user email from localStorage, fetches rest from API)
 *
 * State:
 *   edit {boolean} — toggles between view mode and edit mode for the form
 *   form {object}  — stores email, company, industry, location values
 *
 * Hooks:
 *   useEffect — fetches profile data from GET /api/profile on mount
 *   useState  — manages edit mode toggle and form field values
 *
 * Logic (preserved exactly):
 *   handleSave → PUT /api/profile with updated company/industry/location
 *   The email field is always disabled (cannot be changed via UI)
 */

import React, { useState, useEffect } from 'react';
import API from '../api/api';
import '../assets/css/Profile.css';

const Profile = () => {
  /* Toggle between view mode (false) and edit mode (true) */
  const [edit, setEdit] = useState(false);

  /* Form data — mirrors the shape of the GET /api/profile response */
  const [form, setForm] = useState({
    email:    '',
    company:  '',
    industry: '',
    location: '',
  });

  /**
   * handleSave — sends updated profile fields to the backend
   * Only company, industry, and location are editable.
   * Email is immutable so it's excluded from the PUT body.
   */
  const handleSave = async () => {
    try {
      await API.put('/api/profile', {
        company:  form.company,
        industry: form.industry,
        location: form.location,
      });

      setEdit(false); // return to view mode on success
      alert('Profile updated successfully');

    } catch {
      alert('Update failed — please try again.');
    }
  };

  /**
   * Fetch profile data on component mount.
   * Populates the form state from the backend response.
   */
  useEffect(() => {
    API.get('/api/profile')
      .then((res) => {
        setForm(res.data);
      })
      .catch(() => {
        alert('Failed to load profile data.');
      });
  }, []); // empty dep array = runs once on mount

  /* Generate initials avatar from email (e.g. "ay@..." → "AY") */
  const initials = form.email
    ? form.email.slice(0, 2).toUpperCase()
    : '??';

  return (
    <div className="page">

      {/* ── Page Header ── */}
      <h1>
        <span className="page-icon">👤</span>
        Profile
      </h1>

      {/* ── Profile Header ──
          Shows avatar initials + email at the top of the page */}
      <div className="card profile-header-card">
        <div className="profile-avatar">{initials}</div>
        <div className="profile-header-info">
          <div className="profile-email">{form.email || 'Loading…'}</div>
          <div className="profile-role">Industry User</div>
        </div>
        <span className="profile-status-badge">🟢 Active</span>
      </div>

      {/* ── User Information Card ──
          Fields: email (disabled), company, industry, location
          Edit mode toggled by the Edit/Save button */}
      <div className="card">
        <h3>User Information</h3>

        {/* Email — always disabled, cannot be changed */}
        <label>Email</label>
        <input
          disabled
          value={form.email}
          className="input"
          placeholder="Loading…"
        />

        {/* Company — editable in edit mode */}
        <label>Company</label>
        <input
          disabled={!edit}
          value={form.company}
          onChange={(e) => setForm({ ...form, company: e.target.value })}
          className="input"
          placeholder="Your company name"
        />

        {/* Industry — editable in edit mode */}
        <label>Industry</label>
        <input
          disabled={!edit}
          value={form.industry}
          onChange={(e) => setForm({ ...form, industry: e.target.value })}
          className="input"
          placeholder="e.g. Manufacturing"
        />

        {/* Location — editable in edit mode */}
        <label>Location</label>
        <input
          disabled={!edit}
          value={form.location}
          onChange={(e) => setForm({ ...form, location: e.target.value })}
          className="input"
          placeholder="e.g. Mumbai, India"
        />

        {/* Toggle between Edit and Save buttons based on edit state */}
        {!edit ? (
          <button className="btn" onClick={() => setEdit(true)}>
            ✏️ Edit Profile
          </button>
        ) : (
          <div className="profile-edit-actions">
            {/* Cancel — discard changes and return to view mode */}
            <button
              className="btn-secondary"
              onClick={() => setEdit(false)}
            >
              Cancel
            </button>
            {/* Save — sends PUT request */}
            <button className="btn" onClick={handleSave}>
              💾 Save Changes
            </button>
          </div>
        )}
      </div>

      {/* ── Security Card ── */}
      <div className="card">
        <h3>Security</h3>
        <p className="profile-coming-soon">
          🔒 Password management — coming soon
        </p>
        <button className="btn-secondary" disabled>
          Change Password
        </button>
      </div>

      {/* ── System Access Card ── */}
      <div className="card">
        <h3>System Access</h3>
        <div className="access-rows">
          <div className="access-row">
            <span>Role</span>
            <span className="access-value">Industry User</span>
          </div>
          <div className="access-row">
            <span>Status</span>
            <span className="access-value access-value--active">● Active</span>
          </div>
        </div>
      </div>

    </div>
  );
};

export default Profile;