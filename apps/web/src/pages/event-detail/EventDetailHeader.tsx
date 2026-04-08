import { Link } from 'react-router-dom';
import ShareLink from '../../components/ShareLink';
import ThemeToggle from '../../components/ThemeToggle';

export type EventDetailHeaderProps = {
  title: string;
  dateFormatted: string;
  terminé: boolean;
  /** URL publique à partager avec les invités (QR + copier). */
  shareUrl: string;
};

export default function EventDetailHeader({
  title,
  dateFormatted,
  terminé,
  shareUrl,
}: EventDetailHeaderProps) {
  return (
    <header className="event-header">
      <div className="event-header-top">
        <Link to="/" className="back-link">
          ← Accueil
        </Link>
        <ThemeToggle className="btn-theme-header" />
      </div>
      <h1>{title}</h1>
      <p className="event-meta">{dateFormatted}</p>
      {terminé && <p className="badge badge-finished">Soirée terminée</p>}
      {shareUrl ? <ShareLink url={shareUrl} showQr /> : null}
    </header>
  );
}
