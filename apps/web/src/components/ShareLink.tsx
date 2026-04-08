import { useState } from 'react';
import QRCodeImport from 'react-qr-code';

/**
 * Interop CJS / bundler : `default` peut être `{ QRCode, default }` au lieu du forwardRef → React #130.
 */
const QRCode =
  typeof QRCodeImport === 'object' &&
  QRCodeImport !== null &&
  'QRCode' in QRCodeImport &&
  !('$$typeof' in QRCodeImport)
    ? (QRCodeImport as unknown as { QRCode: typeof QRCodeImport }).QRCode
    : QRCodeImport;

interface ShareLinkProps {
  url: string;
  label?: string;
  /** QR code repliable (URL invité uniquement — ne pas utiliser pour un lien hôte secret). */
  showQr?: boolean;
}

export default function ShareLink({
  url,
  label = 'Lien à partager',
  showQr = false,
}: ShareLinkProps) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="share-link">
      <label className="label">{label}</label>
      <div className="share-link-row">
        <input
          type="text"
          className="input input-readonly"
          readOnly
          value={url}
          aria-label="Lien de partage"
        />
        <button type="button" className="btn" onClick={copy}>
          {copied ? 'Copié !' : 'Copier le lien'}
        </button>
      </div>
      {showQr ? (
        <details className="share-qr-details">
          <summary className="share-qr-summary">QR code invitation</summary>
          <div className="share-qr-body">
            <div className="share-qr-canvas">
              <QRCode
                value={url}
                size={144}
                level="M"
                title="QR code — lien vers la soirée"
                bgColor="#ffffff"
                fgColor="#111827"
              />
            </div>
            <p className="share-qr-hint">
              Ouvrez l’appareil photo pour rejoindre la soirée sur mobile.
            </p>
          </div>
        </details>
      ) : null}
    </div>
  );
}
