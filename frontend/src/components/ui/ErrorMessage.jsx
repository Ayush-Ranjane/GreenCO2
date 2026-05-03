/**
 * ErrorMessage.jsx — Reusable Error Display Component
 * -----------------------------------------------------
 * Renders a consistent error card across all pages.
 *
 * Props:
 *   title   {string}   — headline (default "Something went wrong")
 *   message {string}   — error detail text
 *   onRetry {function} — optional retry callback; renders a Retry button if provided
 *
 * Usage:
 *   <ErrorMessage message={error} onRetry={() => window.location.reload()} />
 */

import React from 'react';
import './ErrorMessage.css';

const ErrorMessage = ({
  title   = 'Something went wrong',
  message = 'An unexpected error occurred. Please try again.',
  onRetry = null,
}) => (
  <div className="error-card" role="alert">
    <span className="error-icon" aria-hidden="true">⚠️</span>
    <div className="error-body">
      <h3 className="error-title">{title}</h3>
      <p  className="error-message">{message}</p>
      {onRetry && (
        <button className="error-retry-btn" onClick={onRetry}>
          ↺ Try Again
        </button>
      )}
    </div>
  </div>
);

export default ErrorMessage;
