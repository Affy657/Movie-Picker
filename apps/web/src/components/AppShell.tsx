import { NavLink, Outlet } from 'react-router-dom';
import ThemeToggle from './ThemeToggle';

function navLinkClass({ isActive }: { isActive: boolean }): string {
  return `app-nav-link${isActive ? ' app-nav-link-active' : ''}`;
}

export default function AppShell() {
  const links = (
    <>
      <NavLink to="/" end className={navLinkClass}>
        Accueil
      </NavLink>
      <NavLink to="/mes-soirees" className={navLinkClass}>
        Mes soirées
      </NavLink>
      <NavLink to="/compte" className={navLinkClass}>
        Compte
      </NavLink>
    </>
  );

  return (
    <div className="app-shell">
      <header className="app-shell-header">
        <nav className="app-nav-desktop" aria-label="Navigation principale">
          {links}
        </nav>
        <ThemeToggle />
      </header>
      <Outlet />
      <nav className="app-nav-mobile" aria-label="Navigation principale">
        {links}
      </nav>
    </div>
  );
}
