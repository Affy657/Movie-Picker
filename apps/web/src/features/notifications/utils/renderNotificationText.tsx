import { Fragment, type ReactNode } from 'react';

const PLACEHOLDER = /\{\{(\w+)\}\}/g;
const BOLD_MARK = '**';

function withIsolatedValues(
  text: string,
  values: Readonly<Record<string, string>>,
  offset: number
): ReactNode[] {
  const nodes: ReactNode[] = [];
  let cursor = 0;
  for (const match of text.matchAll(PLACEHOLDER)) {
    const start = match.index;
    nodes.push(
      text.slice(cursor, start),
      <bdi key={offset + start}>{values[match[1] ?? ''] ?? ''}</bdi>
    );
    cursor = start + match[0].length;
  }
  nodes.push(text.slice(cursor));
  return nodes;
}

export function renderNotificationText(
  template: string,
  values: Readonly<Record<string, string>>
): ReactNode {
  const nodes: ReactNode[] = [];
  let offset = 0;
  let bold = false;
  for (const part of template.split(BOLD_MARK)) {
    const content = withIsolatedValues(part, values, offset);
    nodes.push(
      bold ? <strong key={offset}>{content}</strong> : <Fragment key={offset}>{content}</Fragment>
    );
    offset += part.length + BOLD_MARK.length;
    bold = !bold;
  }
  return nodes;
}
