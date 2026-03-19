import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Link } from 'react-router-dom';

type Props = {
  children: ReactNode;
};

type State = {
  hasError: boolean;
  error: Error | null;
};

/**
 * Limite les erreurs React non gérées (roadmap § 30). Réinitialisé au changement de route via `key` sur le parent.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  render(): ReactNode {
    if (this.state.hasError && this.state.error) {
      return (
        <main className="page">
          <h1>Un problème est survenu</h1>
          <p className="error" role="alert">
            {this.state.error.message}
          </p>
          <p className="muted">
            Vous pouvez recharger la page ou retourner à l&apos;accueil. Si le problème persiste,
            essayez de vider le cache du navigateur.
          </p>
          <div className="error-boundary-actions">
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => this.setState({ hasError: false, error: null })}
            >
              Réessayer
            </button>
            <Link to="/" className="btn">
              Accueil
            </Link>
          </div>
        </main>
      );
    }

    return this.props.children;
  }
}
