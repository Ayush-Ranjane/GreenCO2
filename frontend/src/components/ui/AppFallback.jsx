import React from 'react';
import './AppFallback.css';

const AppFallback = ({ label = 'Loading GreenCO₂…', sublabel = 'Preparing your carbon intelligence workspace.' }) => (
  <div className="app-fallback" role="status" aria-live="polite">
    <div className="app-fallback__orb">
      <span />
      <span />
      <span />
    </div>
    <div className="app-fallback__content">
      <strong>{label}</strong>
      <p>{sublabel}</p>
    </div>
  </div>
);

export default AppFallback;
