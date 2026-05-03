/**
 * Sidebar.jsx — Premium collapsible navigation sidebar
 */

import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, BarChart3, Bell, FileText,
  Upload, User, LogOut, ChevronLeft, ChevronRight, Leaf,
} from 'lucide-react';
import '../../assets/css/Sidebar.css';

const NAV_ITEMS = [
  { icon: LayoutDashboard, label: 'Dashboard',    path: '/client' },
  { icon: BarChart3,       label: 'Analytics',    path: '/analytics' },
  { icon: Bell,            label: 'Alerts',       path: '/alerts' },
  { icon: FileText,        label: 'Report',       path: '/report' },
  { icon: Upload,          label: 'Log Emissions', path: '/emission-form' },
  { icon: User,            label: 'Profile',      path: '/profile' },
];

const Sidebar = ({ onLogout, mobileOpen, onMobileClose, collapsed, onCollapse }) => {
  const location = useLocation();

  const email = localStorage.getItem('user_email') || '';
  const initials = email ? email.slice(0, 2).toUpperCase() : 'U';

  return (
    <aside className={`sidebar ${collapsed ? 'sidebar--collapsed' : ''} ${mobileOpen ? 'sidebar--mobile-open' : ''}`}>

      {/* Logo */}
      <div className="sidebar__logo">
        <div className="sidebar__logo-icon">
          <Leaf size={18} strokeWidth={2} />
        </div>
        <span className="sidebar__logo-text">GreenCO₂</span>
      </div>

      <div className="sidebar__divider" />

      {/* Navigation */}
      <nav className="sidebar__nav">
        {NAV_ITEMS.map(({ icon: Icon, label, path }) => {
          const active = location.pathname === path;
          return (
            <Link
              key={path}
              to={path}
              className={`sidebar__nav-item ${active ? 'sidebar__nav-item--active' : ''}`}
              title={collapsed ? label : undefined}
              onClick={onMobileClose}
            >
              <Icon size={17} strokeWidth={1.75} className="sidebar__nav-icon" />
              <span className="sidebar__nav-label">{label}</span>
              {active && <span className="sidebar__active-dot" />}
            </Link>
          );
        })}
      </nav>

      {/* Bottom section */}
      <div className="sidebar__footer">
        <div className="sidebar__divider" />

        <button
          className="sidebar__nav-item sidebar__logout-btn"
          onClick={onLogout}
          title={collapsed ? 'Logout' : undefined}
        >
          <LogOut size={17} strokeWidth={1.75} className="sidebar__nav-icon" />
          <span className="sidebar__nav-label">Logout</span>
        </button>

        <div className="sidebar__user" title={email}>
          <div className="sidebar__avatar">{initials}</div>
          <div className="sidebar__user-info">
            <span className="sidebar__user-email">{email}</span>
            <span className="sidebar__user-role">Industry User</span>
          </div>
        </div>

        <button
          className="sidebar__collapse-btn"
          onClick={() => onCollapse(!collapsed)}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed
            ? <ChevronRight size={15} strokeWidth={2} />
            : <ChevronLeft size={15} strokeWidth={2} />}
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
