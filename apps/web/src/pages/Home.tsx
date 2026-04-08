import { Link } from 'react-router-dom';
import { APP_DOCUMENT_TITLE, useDocumentTitle } from '../hooks/useDocumentTitle';

export default function Home() {
  useDocumentTitle(APP_DOCUMENT_TITLE);

  return (
    <main className="page">
      <div className="page-header-row">
        <h1>Movie Picker</h1>
      </div>
      <p className="lead">Choisissez le film de la soirée à plusieurs.</p>
      <nav className="nav-actions">
        <Link to="/new" className="btn btn-primary">
          Créer une soirée
        </Link>
      </nav>
    </main>
  );
}
