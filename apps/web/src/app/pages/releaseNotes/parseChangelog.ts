export type ChangelogSectionKind =
  'added' | 'changed' | 'deprecated' | 'removed' | 'fixed' | 'security';

export type InlinePart = { text: string; strong: boolean; code: boolean };

export type ChangelogRelease = {
  version: string;
  date: string;
  summary: string[];
  sections: { kind: ChangelogSectionKind; items: InlinePart[][] }[];
};

const SECTION_KINDS: Readonly<Record<string, ChangelogSectionKind>> = {
  Added: 'added',
  Changed: 'changed',
  Deprecated: 'deprecated',
  Removed: 'removed',
  Fixed: 'fixed',
  Security: 'security',
};

const RELEASE_HEADING = /^## \[(\d+\.\d+\.\d+)\] - (\d{4}-\d{2}-\d{2})$/;
const SECTION_HEADING = /^### (.+)$/;
const COMPARISON_LINK = /^\[[^\]]+\]: \S+$/;

function splitCode(text: string, strong: boolean): InlinePart[] {
  return text
    .split('`')
    .map((chunk, index) => ({ text: chunk, strong, code: index % 2 === 1 }))
    .filter((part) => part.text !== '');
}

export function parseInline(text: string): InlinePart[] {
  return text.split('**').flatMap((chunk, index) => splitCode(chunk, index % 2 === 1));
}

type ParseState = {
  releases: ChangelogRelease[];
  release: ChangelogRelease | null;
  section: ChangelogRelease['sections'][number] | null;
  ignoringSection: boolean;
};

function openSection(state: ParseState, release: ChangelogRelease, title: string): void {
  const kind = SECTION_KINDS[title];
  state.section = kind ? { kind, items: [] } : null;
  state.ignoringSection = !kind;
  if (state.section) release.sections.push(state.section);
}

function readBody(state: ParseState, release: ChangelogRelease, line: string): void {
  if (line.startsWith('- ')) state.section?.items.push(parseInline(line.slice(2).trim()));
  else if (!state.section) release.summary.push(line.trim());
}

function readLine(state: ParseState, line: string): void {
  const releaseMatch = RELEASE_HEADING.exec(line);
  if (releaseMatch) {
    state.release = {
      version: releaseMatch[1]!,
      date: releaseMatch[2]!,
      summary: [],
      sections: [],
    };
    state.releases.push(state.release);
    state.section = null;
    state.ignoringSection = false;
    return;
  }
  if (line.startsWith('## ') || COMPARISON_LINK.test(line)) {
    state.release = null;
    return;
  }
  if (!state.release || line.trim() === '') return;
  const sectionMatch = SECTION_HEADING.exec(line);
  if (sectionMatch) openSection(state, state.release, sectionMatch[1]!.trim());
  else if (!state.ignoringSection) readBody(state, state.release, line);
}

export function parseChangelog(markdown: string): ChangelogRelease[] {
  const state: ParseState = { releases: [], release: null, section: null, ignoringSection: false };
  for (const line of markdown.split('\n')) readLine(state, line);
  return state.releases;
}
