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
import { Mail, Building2, Factory, MapPin, Lock, Shield, User } from 'lucide-react';

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

  /* Generate initials from the pre-@ part of email (e.g. "john.doe@..." → "JD") */
  const initials = form.email
    ? form.email.split('@')[0].replace(/[^a-zA-Z]/g, '').slice(0, 2).toUpperCase() || '??'
    : '??';

  return (
    <div className="page">

      {/* ── Page Header ── */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Profile</h1>
          <p className="page-subtitle">Manage your account details</p>
        </div>
      </div>

      {/* ── Profile Hero Card ── */}
      <div className="card profile-hero">
        <div className="profile-avatar">{initials}</div>
        <div className="profile-hero__info">
          <div className="profile-hero__email">{form.email || 'Loading…'}</div>
          <div className="profile-hero__role">Industry User</div>
        </div>
        <span className="profile-status-badge">● Active</span>
      </div>

      {/* ── User Information ── */}
      <div className="card">
        <div className="card-title-row">
          <h3>User Information</h3>
          {!edit && (
            <button className="btn btn--ghost btn--sm" onClick={() => setEdit(true)}>Edit</button>
          )}
        </div>

        <div className="profile-form">
          <div className="profile-field">
            <label className="profile-label"><Mail size={12} /> Email</label>
            <input disabled value={form.email} className="input" placeholder="Loading…" />
          </div>
          <div className="profile-field">
            <label className="profile-label"><Building2 size={12} /> Company</label>
            <input disabled={!edit} value={form.company}
              onChange={(e) => setForm({ ...form, company: e.target.value })}
              className="input" placeholder="Your company name" />
          </div>
          <div className="profile-field">
            <label className="profile-label"><Factory size={12} /> Industry</label>
            <input disabled={!edit} value={form.industry}
              onChange={(e) => setForm({ ...form, industry: e.target.value })}
              className="input" placeholder="e.g. Manufacturing" />
          </div>
          <div className="profile-field">
            <label className="profile-label"><MapPin size={12} /> Location</label>
            <input disabled={!edit} value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
              className="input" placeholder="e.g. Mumbai, India" />
          </div>
        </div>

        {edit && (
          <div className="profile-edit-actions">
            <button className="btn btn--ghost btn--sm" onClick={() => setEdit(false)}>Cancel</button>
            <button className="btn btn--sm" onClick={handleSave}>Save Changes</button>
          </div>
        )}
      </div>

      {/* ── Security + Access row ── */}
      <div className="profile-bottom-row">
        <div className="card">
          <div className="card-title-row">
            <h3>Security</h3>
            <Lock size={14} style={{ color: 'var(--text-muted)' }} />
          </div>
          <p className="profile-coming-soon">Password management — coming soon</p>
          <button className="btn btn--ghost btn--sm" disabled style={{ marginTop: '12px' }}>Change Password</button>
        </div>

        <div className="card">
          <div className="card-title-row">
            <h3>System Access</h3>
            <Shield size={14} style={{ color: 'var(--text-muted)' }} />
          </div>
          <div className="access-rows">
            <div className="access-row"><span>Role</span><span className="access-value">Industry User</span></div>
            <div className="access-row"><span>Status</span><span className="access-value access-value--active">● Active</span></div>
          </div>
        </div>
      </div>

    </div>
  );
};

export default Profile;