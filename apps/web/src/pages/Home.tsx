import { Link } from 'react-router-dom';
import ThemeToggle from '../components/ThemeToggle';

export default function Home() {
  return (
    <main className="page">
      <div className="page-header-row">
        <h1>Movie Picker</h1>
        <ThemeToggle />
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
