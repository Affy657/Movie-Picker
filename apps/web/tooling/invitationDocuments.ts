import type { Plugin } from 'vite';
import { fr } from '../src/shared/i18n/locales/fr.ts';

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

function attributeValue(tag: string, name: string): string | null {
  const marker = ` ${name}="`;
  const start = tag.indexOf(marker);
  if (start < 0) return null;
  const valueStart = start + marker.length;
  const valueEnd = tag.indexOf('"', valueStart);
  return valueEnd < 0 ? null : tag.slice(valueStart, valueEnd);
}

function describesThePage(tag: string): boolean {
  const key = attributeValue(tag, 'name') ?? attributeValue(tag, 'property');
  if (key === null) return false;
  return (
    key === 'description' || key === 'robots' || key.startsWith('og:') || key.startsWith('twitter:')
  );
}

function closingEnd(html: string, closing: string, from: number): number {
  const at = html.indexOf(closing, from);
  return at < 0 ? from : at + closing.length;
}

function replacedElementEnd(html: string, tag: string, after: number): number | null {
  if (tag === '<title>') return closingEnd(html, '</title>', after);
  if (tag.startsWith('<script') && attributeValue(tag, 'type') === 'application/ld+json') {
    return closingEnd(html, '</script>', after);
  }
  if (tag.startsWith('<link') && attributeValue(tag, 'rel') === 'canonical') return after;
  if (tag.startsWith('<meta') && describesThePage(tag)) return after;
  return null;
}

function withoutTrailingIndent(text: string): string {
  let end = text.length;
  while (end > 0 && (text[end - 1] === ' ' || text[end - 1] === '\t')) end -= 1;
  return text.slice(0, end);
}

function afterWhitespace(html: string, from: number): number {
  let at = from;
  while (at < html.length && /\s/.test(html.charAt(at))) at += 1;
  return at;
}

function withoutPageHeadTags(html: string): string {
  let kept = '';
  let cursor = 0;
  let open = html.indexOf('<');
  while (open >= 0) {
    const close = html.indexOf('>', open);
    if (close < 0) break;
    const end = replacedElementEnd(html, html.slice(open, close + 1), close + 1);
    if (end === null) {
      open = html.indexOf('<', open + 1);
      continue;
    }
    kept += withoutTrailingIndent(html.slice(cursor, open));
    cursor = afterWhitespace(html, end);
    open = html.indexOf('<', cursor);
  }
  return kept + html.slice(cursor);
}

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
  const stripped = withoutPageHeadTags(shell);
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
