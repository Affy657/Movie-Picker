import { describe, expect, it } from 'vitest';
import { fr } from '../src/shared/i18n/locales/fr';
import { INVITATION_DOCUMENTS, invitationDocument } from './invitationDocuments';

const SHELL = `<!doctype html>
<html lang="fr">
  <head>
    <meta charset="UTF-8" />
    <meta
      name="description"
      content="Description du site"
    />
    <meta property="og:title" content="Titre du site" />
    <meta property="og:url" content="https://www.movie-picker.fr/" />
    <meta name="twitter:card" content="summary_large_image" />
    <link rel="canonical" href="https://www.movie-picker.fr/" />
    <title>Titre du site</title>
    <script type="application/ld+json">{"@type":"WebSite"}</script>
    <script>document.documentElement.lang = 'fr';</script>
  </head>
  <body><div id="root"></div><script type="module" src="/assets/index.js"></script></body>
</html>
`;

function meta(html: string, key: string): string | null {
  const match = new RegExp(`<meta (?:name|property)="${key}" content="([^"]*)"`).exec(html);
  return match?.[1] ?? null;
}

describe('invitationDocument', () => {
  const group = INVITATION_DOCUMENTS.find((doc) => doc.fileName === 'invitations/group.html')!;
  const html = invitationDocument(SHELL, group);

  it('serves one document per invitation prefix, never the token itself', () => {
    expect(INVITATION_DOCUMENTS.map((doc) => doc.fileName)).toEqual([
      'invitations/list.html',
      'invitations/group.html',
    ]);
  });

  it('describes the invitation instead of the home page', () => {
    expect(html).toContain(`<title>${fr.groups.join.previewTitle} | Movie Picker</title>`);
    expect(meta(html, 'og:title')).toBe(fr.groups.join.previewTitle);
    expect(meta(html, 'description')).toBe(fr.groups.join.previewDescription);
    expect(meta(html, 'og:description')).toBe(fr.groups.join.previewDescription);
    expect(meta(html, 'twitter:title')).toBe(fr.groups.join.previewTitle);
    expect(meta(html, 'robots')).toBe('noindex, nofollow');
    expect(html).not.toContain('Titre du site');
    expect(html).not.toContain('Description du site');
  });

  it('claims no address, since the real one carries a secret token', () => {
    expect(html).not.toContain('rel="canonical"');
    expect(html).not.toContain('og:url');
    expect(html).not.toContain('application/ld+json');
  });

  it('keeps the application shell and its inline scripts byte for byte', () => {
    expect(html).toContain("<script>document.documentElement.lang = 'fr';</script>");
    expect(html).toContain('<div id="root"></div>');
    expect(html).toContain('src="/assets/index.js"');
    expect(html).toContain('<meta charset="UTF-8" />');
  });

  it('escapes the texts it writes into attributes', () => {
    const escaped = invitationDocument(SHELL, {
      fileName: 'x.html',
      title: 'A "quoted" <title>',
      description: 'R&D',
    });
    expect(escaped).toContain('content="A &quot;quoted&quot; &lt;title&gt;"');
    expect(escaped).toContain('content="R&amp;D"');
  });
});
