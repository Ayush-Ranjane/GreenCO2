/**
 * SkeletonLoader.jsx — Reusable Loading Placeholder
 * ---------------------------------------------------
 * Renders animated skeleton blocks that mimic real content layout.
 * Use instead of a spinner when you know the shape of the incoming data.
 *
 * Props:
 *   rows    {number} — how many skeleton rows to render (default 4)
 *   type    {string} — 'card' | 'table' | 'text'  (default 'card')
 *   height  {string} — CSS height of each block   (default '80px')
 *
 * Usage:
 *   <SkeletonLoader rows={3} type="card" />
 *   <SkeletonLoader rows={5} type="table" height="32px" />
 */

import React from 'react';
import './SkeletonLoader.css';

const SkeletonLoader = ({ rows = 4, type = 'card', height = '80px' }) => {

  if (type === 'table') {
    return (
      <div className="skeleton-table" role="status" aria-label="Loading…">
        {/* Table header shimmer */}
        <div className="skeleton-row skeleton-header" />
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="skeleton-row" style={{ height }} />
        ))}
      </div>
    );
  }

  if (type === 'text') {
    return (
      <div className="skeleton-text-block" role="status" aria-label="Loading…">
        {Array.from({ length: rows }).map((_, i) => (
          <div
            key={i}
            className="skeleton-text-line"
            /* Vary widths so it looks natural */
            style={{ width: i % 3 === 2 ? '60%' : '100%' }}
          />
        ))}
      </div>
    );
  }

  // Default — card grid skeleton
  return (
    <div className="skeleton-cards" role="status" aria-label="Loading…">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="skeleton-card" style={{ height }}>
          {/* Simulated card title bar */}
          <div className="skeleton-card-title" />
          {/* Simulated card value */}
          <div className="skeleton-card-value" />
        </div>
      ))}
    </div>
  );
};

export default SkeletonLoader;
