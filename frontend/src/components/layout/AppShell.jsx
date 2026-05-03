/**
 * AppShell.jsx — Root layout wrapper
 * Renders sidebar + top-bar for authenticated pages,
 * minimal top-nav + footer for public pages.
 */

import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import Navbar from '../Navbar';
import Footer from '../Footer';
import '../../assets/css/AppShell.css';

const PUBLIC_PATHS = ['/', '/auth'];

const AppShell = ({ children, isLoggedIn, setIsLoggedIn }) => {
  const location = useLocation();
  const navigate  = useNavigate();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const isPublic = PUBLIC_PATHS.includes(location.pathname) || !isLoggedIn;

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user_email');
    setIsLoggedIn(false);
    navigate('/');
  };

  if (isPublic) {
    return (
      <div className="public-shell">
        <Navbar isLoggedIn={isLoggedIn} setIsLoggedIn={setIsLoggedIn} />
        <main className="public-main">{children}</main>
        <Footer />
      </div>
    );
  }

  return (
    <div className={`app-shell${sidebarCollapsed ? ' app-shell--collapsed' : ''}`}>
      {mobileSidebarOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => setMobileSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      <Sidebar
        onLogout={handleLogout}
        mobileOpen={mobileSidebarOpen}
        onMobileClose={() => setMobileSidebarOpen(false)}
        collapsed={sidebarCollapsed}
        onCollapse={setSidebarCollapsed}
      />

      <div className="app-shell__body">
        <Navbar
          isLoggedIn={isLoggedIn}
          setIsLoggedIn={setIsLoggedIn}
          onMenuClick={() => setMobileSidebarOpen(true)}
          showMenuButton
        />
        <main className="app-shell__main">
          {children}
        </main>
      </div>
    </div>
  );
};

export default AppShell;
