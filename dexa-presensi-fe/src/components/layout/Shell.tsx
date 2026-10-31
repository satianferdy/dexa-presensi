import { useState, type ReactNode } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  CalendarDays,
  Clock3,
  LayoutDashboard,
  LogOut,
  Menu,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { useAuth } from '../../state/auth';

const logo = '/images.jpg';

export function Shell({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const [menu, setMenu] = useState(false);
  const nav = useNavigate();
  const isHrd = user?.role === 'HRD_ADMIN';
  const links = isHrd
    ? ([
        ['/hrd', 'Overview', LayoutDashboard],
        ['/hrd/employees', 'Employees', Users],
        ['/hrd/attendance', 'Monitoring', CalendarDays],
      ] as const)
    : ([
        ['/employee', 'Today', Clock3],
        ['/employee/history', 'History', CalendarDays],
      ] as const);
  return (
    <div className="shell">
      <aside className={`sidebar ${menu ? 'open' : ''}`}>
        <div className="brand">
          <img src={logo} alt="Dexa Group" />
          <span>WFH Attendance</span>
        </div>
        <nav>
          {links.map(([path, label, Icon]) => (
            <NavLink
              key={path}
              end
              to={path}
              onClick={() => setMenu(false)}
              className={({ isActive }) => (isActive ? 'active' : '')}
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="side-foot">
          <ShieldCheck size={17} /> Dexa Group internal portal
        </div>
      </aside>
      <div className="shell-main">
        <header className="topbar">
          <button
            className="menu-button"
            onClick={() => setMenu(!menu)}
            aria-label="Open navigation"
          >
            <Menu size={22} />
          </button>
          <div className="top-title">WFH Attendance</div>
          <div className="top-user">
            <div className="avatar">
              {(user?.employee?.fullName || user?.email || 'U').slice(0, 1).toUpperCase()}
            </div>
            <span>{user?.employee?.fullName || 'HR Admin'}</span>
            <button
              aria-label="Sign out"
              title="Sign out"
              onClick={() => {
                logout();
                nav('/login');
              }}
            >
              <LogOut size={18} />
            </button>
          </div>
        </header>
        <main className="content">{children}</main>
      </div>
      {menu && (
        <button className="scrim" aria-label="Close navigation" onClick={() => setMenu(false)} />
      )}
    </div>
  );
}
