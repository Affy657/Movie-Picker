import type { Plugin } from 'vite';
import { fr } from '../src/shared/i18n/locales/fr';

export interface InvitationDocument {
  fileName: string;
  title: string;
  description: string;
}

const SITE_NAME = 'Movie Picker';
const SITE_IMAGE = 'https://www.movie-picker.fr/og-image.png';

export const INVITATION_DOCUMENTS: ReadonlyArray<InvitationDocument> = [
  {
    fileName: 'invitations/list.html',
    title: fr.lists.join.previewTitle,
    description: fr.lists.join.previewDescription,
  },
  {
    fileName: 'invitations/group.html',
    title: fr.groups.join.previewTitle,
    description: fr.groups.join.previewDescription,
  },
];

const PAGE_HEAD_TAGS = [
  /[ \t]*<title>[\s\S]*?<\/title>\s*/g,
  /[ \t]*<meta\b[^>]*\b(?:name|property)="(?:description|robots|og:[^"]*|twitter:[^"]*)"[^>]*>\s*/g,
  /[ \t]*<link\b[^>]*\brel="canonical"[^>]*>\s*/g,
  /[ \t]*<script\b[^>]*\btype="application\/ld\+json"[^>]*>[\s\S]*?<\/script>\s*/g,
];

function attribute(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

function headTags({ title, description }: InvitationDocument): string {
  const text = attribute(title);
  const summary = attribute(description);
  return [
    `<title>${text} | ${SITE_NAME}</title>`,
    `<meta name="description" content="${summary}" />`,
    '<meta name="robots" content="noindex, nofollow" />',
    `<meta property="og:site_name" content="${SITE_NAME}" />`,
    '<meta property="og:type" content="website" />',
    `<meta property="og:title" content="${text}" />`,
    `<meta property="og:description" content="${summary}" />`,
    `<meta property="og:image" content="${SITE_IMAGE}" />`,
    `<meta property="og:image:alt" content="${SITE_NAME}" />`,
    '<meta property="og:locale" content="fr_FR" />',
    '<meta name="twitter:card" content="summary_large_image" />',
    `<meta name="twitter:title" content="${text}" />`,
    `<meta name="twitter:description" content="${summary}" />`,
    `<meta name="twitter:image" content="${SITE_IMAGE}" />`,
  ].join('\n');
}

export function invitationDocument(shell: string, document: InvitationDocument): string {
  const stripped = PAGE_HEAD_TAGS.reduce((html, tag) => html.replace(tag, ''), shell);
  const headEnd = stripped.indexOf('</head>');
  if (headEnd < 0) throw new Error('index.html: no </head> to write the invitation preview into');
  return `${stripped.slice(0, headEnd)}${headTags(document)}\n${stripped.slice(headEnd)}`;
}

export function invitationDocumentsPlugin(): Plugin {
  return {
    name: 'moviepicker-invitation-documents',
    apply: (config, { command }) => command === 'build' && !config.build?.ssr,
    enforce: 'post',
    generateBundle(_options, bundle) {
      const shell = bundle['index.html'];
      if (shell?.type !== 'asset') {
        this.error('index.html is missing from the bundle: no invitation document to derive');
      }
      for (const document of INVITATION_DOCUMENTS) {
        this.emitFile({
          type: 'asset',
          fileName: document.fileName,
          source: invitationDocument(String(shell.source), document),
        });
      }
    },
  };
}
