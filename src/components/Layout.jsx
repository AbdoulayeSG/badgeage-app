// src/components/Layout.jsx
// Main layout with sidebar navigation and top header
import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import {
  LayoutDashboard, Users, UserCheck, QrCode,
  Calendar, BarChart2, LogOut, Menu, X, ChevronRight
} from 'lucide-react';

const NAV_ITEMS = [
  { to: '/dashboard',   icon: LayoutDashboard, label: 'Tableau de bord' },
  { to: '/groups',      icon: Users,            label: 'Groupes'         },
  { to: '/people',      icon: UserCheck,        label: 'Personnes'       },
  { to: '/scanner',     icon: QrCode,           label: 'Scanner QR'      },
  { to: '/calendar',    icon: Calendar,         label: 'Calendrier'      },
  { to: '/statistics',  icon: BarChart2,        label: 'Statistiques'    },
  { to: '/attendances', icon: Users,            label: 'Présences'       },
];

export default function Layout({ children }) {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    toast.success('Déconnecté');
    navigate('/login');
  };

  const Sidebar = ({ mobile = false }) => (
    <aside
      style={{
        background: 'var(--bg-card)',
        borderRight: '1px solid var(--border)',
        width: mobile ? '100%' : '240px',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        padding: '1.5rem 1rem',
        position: mobile ? 'relative' : 'sticky',
        top: mobile ? 'auto' : 0,
        height: mobile ? 'auto' : '100vh',
      }}>
      {/* Logo */}
      <div className="flex items-center gap-3 mb-8 px-2">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
             style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
          <QrCode size={18} color="white" />
        </div>
        <span className="font-bold text-lg" style={{ color: 'var(--text-main)' }}>BadgeApp</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1">
        {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            onClick={() => setSidebarOpen(false)}
            className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}
          >
            <Icon size={18} />
            <span className="flex-1">{label}</span>
            <ChevronRight size={14} style={{ opacity: 0.4 }} />
          </NavLink>
        ))}
      </nav>

      {/* User info */}
      <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem', marginTop: '1rem' }}>
        <div className="flex items-center gap-3 px-2 mb-3">
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
               style={{ background: 'var(--primary)', color: 'white' }}>
            {(currentUser?.displayName || currentUser?.email || '?').charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate" style={{ color: 'var(--text-main)' }}>
              {currentUser?.displayName || 'Utilisateur'}
            </p>
            <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>
              {currentUser?.email}
            </p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="sidebar-item w-full"
          style={{ color: '#ef4444' }}>
          <LogOut size={18} />
          <span>Se déconnecter</span>
        </button>
      </div>
    </aside>
  );

  return (
    <div className="flex" style={{ minHeight: '100vh' }}>
      {/* Desktop sidebar */}
      <div className="hidden lg:block">
        <Sidebar />
      </div>

      {/* Mobile overlay sidebar */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0"
            style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(2px)' }}
            onClick={() => setSidebarOpen(false)}
          />
          <div className="relative w-64">
            <Sidebar mobile />
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top header (mobile) */}
        <header
          className="lg:hidden flex items-center justify-between px-4 py-3"
          style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-card)' }}>
          <button onClick={() => setSidebarOpen(true)} style={{ color: 'var(--text-main)' }}>
            <Menu size={22} />
          </button>
          <span className="font-bold" style={{ color: 'var(--text-main)' }}>BadgeApp</span>
          <div style={{ width: 22 }} />
        </header>

        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
