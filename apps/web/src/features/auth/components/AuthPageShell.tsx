import { Link } from 'react-router-dom';
import type { ReactNode } from 'react';
import { ROUTES } from '@/app/routes';

type AuthPageShellProps = {
  title: string;
  /** Paragraphe d’intro sous le titre (style `muted`). */
  description?: string;
  children: ReactNode;
};

export default function AuthPageShell({ title, description, children }: AuthPageShellProps) {
  return (
    <>
      <Link to={ROUTES.home} className="back-link">
        ← Accueil
      </Link>
      <h1>{title}</h1>
      {description ? <p className="muted">{description}</p> : null}
      {children}
    </>
  );
}
