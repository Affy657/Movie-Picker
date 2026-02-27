import { Link } from 'react-router-dom';

export default function Home() {
  return (
    <main className="page">
      <h1>Movie Picker</h1>
      <p className="lead">Choisissez le film de la soirée à plusieurs.</p>
      <nav className="nav-actions">
        <Link to="/new" className="btn btn-primary">
          Créer une soirée
        </Link>
      </nav>
    </main>
  );
}
