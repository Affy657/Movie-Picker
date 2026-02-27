import { useState } from 'react';

interface ShareLinkProps {
  url: string;
}

export default function ShareLink({ url }: ShareLinkProps) {
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
      <label className="label">Lien à partager</label>
      <div className="share-link-row">
        <input type="text" className="input input-readonly" readOnly value={url} aria-label="Lien de partage" />
        <button type="button" className="btn" onClick={copy}>
          {copied ? 'Copié !' : 'Copier le lien'}
        </button>
      </div>
    </div>
  );
}
