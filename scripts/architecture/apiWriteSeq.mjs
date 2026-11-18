export const APPLICATION_DIR = 'apps/api-dotnet/MoviePicker.Api/Application/';

export const WRITE_SEQ_EXEMPTIONS = new Map([
  [
    `${APPLICATION_DIR}UseCases/CreateEvent/CreateEventHandler.cs`,
    'the event and its host participant are inserted in the same transaction, no client holds an ETag of an event that does not exist yet',
  ],
]);

const EVENT_VIEW_REPOSITORY =
  /\bI(?:Movie|Vote|Participant|SeenMark|MovieRating)Repository\s+@?([A-Za-z_]\w*)/g;
const EVENT_REPOSITORY = /\bIEventRepository\s+@?([A-Za-z_]\w*)/g;
const WRITE_METHOD = String.raw`(?:Insert|Add|Upsert|Delete|Update|Anonymize|Set|Remove)\w*`;
const WRITE_SEQ_BUMP = 'LockForWriteAsync|MarkChangedAsync|UpdateAsync';
const CSHARP_STRING_RE = /"(?:[^"\\\n]|\\.)*"/g;

function namesDeclaredAs(declaration, code) {
  return new Set([...code.matchAll(declaration)].map(([, name]) => name));
}

function callsOn(names, method, code) {
  return [...names].flatMap((name) =>
    [...code.matchAll(new RegExp(String.raw`\b${name}\s*\??\.\s*(${method})\s*\(`, 'g'))].map(
      ([, called]) => `${name}.${called}`
    )
  );
}

function eventViewWritesIn(text) {
  const code = text.replace(CSHARP_STRING_RE, '""');
  const writes = callsOn(namesDeclaredAs(EVENT_VIEW_REPOSITORY, code), WRITE_METHOD, code);
  const bumps = callsOn(namesDeclaredAs(EVENT_REPOSITORY, code), WRITE_SEQ_BUMP, code);
  return { writes: [...new Set(writes)], bumpsWriteSeq: bumps.length > 0 };
}

export function writeSeqViolations(applicationFiles, exemptions = WRITE_SEQ_EXEMPTIONS) {
  const found = [];
  const exemptionsInUse = new Set();
  for (const [path, text] of applicationFiles) {
    const { writes, bumpsWriteSeq } = eventViewWritesIn(text);
    if (writes.length === 0) continue;
    if (exemptions.has(path)) {
      exemptionsInUse.add(path);
      continue;
    }
    if (!bumpsWriteSeq)
      found.push(
        `${path}: ${writes.join(', ')} without LockForWriteAsync, MarkChangedAsync or UpdateAsync on IEventRepository, the event view keeps serving its stale ETag (AGENTS.md, writeSeq)`
      );
  }
  for (const path of exemptions.keys())
    if (!exemptionsInUse.has(path))
      found.push(
        `${path}: listed in WRITE_SEQ_EXEMPTIONS but writes no movie, vote, participant, seen mark or rating any more, remove the exemption`
      );
  return found;
}
