import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { APPLICATION_DIR, WRITE_SEQ_EXEMPTIONS, writeSeqViolations } from './apiWriteSeq.mjs';

const HANDLER = `${APPLICATION_DIR}UseCases/Probe/ProbeHandler.cs`;

function handler(
  body,
  dependencies = 'IEventRepository eventRepository, IVoteRepository voteRepository'
) {
  return [
    `public sealed class ProbeHandler(${dependencies})`,
    '{',
    '    public async Task HandleAsync(Vote vote, CancellationToken ct)',
    '    {',
    ...body.map((line) => `        ${line}`),
    '    }',
    '}',
  ].join('\n');
}

const check = (text, exemptions = new Map()) =>
  writeSeqViolations(new Map([[HANDLER, text]]), exemptions);

describe('writeSeq', () => {
  it('refuses a vote written without moving the event', () => {
    const text = handler(['await voteRepository.UpsertAsync(vote, ct);']);

    assert.deepEqual(check(text), [
      `${HANDLER}: voteRepository.UpsertAsync without LockForWriteAsync, MarkChangedAsync or UpdateAsync on IEventRepository, the event view keeps serving its stale ETag (AGENTS.md, writeSeq)`,
    ]);
  });

  it('refuses a write through a field when the event is only read', () => {
    const text = [
      'public sealed class ProbeHandler',
      '{',
      '    private readonly IEventRepository _events;',
      '    private readonly IParticipantRepository _participants;',
      '    public async Task HandleAsync(string userId, CancellationToken ct)',
      '    {',
      '        var evt = await _events.GetBySlugAsync(userId, ct);',
      '        await _participants.AnonymizeByUserIdAsync(userId, ct);',
      '    }',
      '}',
    ].join('\n');

    assert.equal(check(text).length, 1);
  });

  it('refuses a helper that receives the repositories as parameters', () => {
    const text = [
      'public static class ProbeChildren',
      '{',
      '    public static async Task PurgeAsync(IVoteRepository votes, ISeenMarkRepository seenMarks, IMovieRatingRepository ratings, string eventId, IReadOnlyCollection<string> movieIds, CancellationToken ct)',
      '    {',
      '        await votes.DeleteByMovieIdsAsync(movieIds, ct);',
      '        await seenMarks.DeleteByMovieIdsAsync(eventId, movieIds, ct);',
      '        await ratings.DeleteByMovieIdsAsync(movieIds, ct);',
      '    }',
      '}',
    ].join('\n');

    assert.equal(check(text).length, 1);
  });

  it('counts a purge through EventChildData as a write of its caller', () => {
    const purge = 'await EventChildData.PurgeMoviesAsync(voteRepository, movieIds, ct);';

    assert.deepEqual(check(handler([purge])), [
      `${HANDLER}: EventChildData.PurgeMoviesAsync without LockForWriteAsync, MarkChangedAsync or UpdateAsync on IEventRepository, the event view keeps serving its stale ETag (AGENTS.md, writeSeq)`,
    ]);
    assert.deepEqual(check(handler(['await eventRepository.UpdateAsync(evt, ct);', purge])), []);
  });

  it('accepts a write that locks, marks or updates the event', () => {
    for (const bump of [
      'await eventRepository.LockForWriteAsync(vote.EventId, ct);',
      'await eventRepository.MarkChangedAsync(vote.EventId, ct);',
      'await eventRepository.UpdateAsync(evt, ct);',
    ])
      assert.deepEqual(check(handler([bump, 'await voteRepository.UpsertAsync(vote, ct);'])), []);
  });

  it('ignores reads, and a call written in a string', () => {
    const text = handler([
      'var votes = await voteRepository.GetParticipantVotesByEventAsync(vote.EventId, vote.ParticipantId, ct);',
      'logger.LogInformation("voteRepository.UpsertAsync(vote) skipped");',
    ]);

    assert.deepEqual(check(text), []);
  });

  it('accepts an exempted file and refuses a stale exemption', () => {
    const text = handler(['await voteRepository.UpsertAsync(vote, ct);']);
    const exemptions = new Map([[HANDLER, 'probe reason']]);
    const gone = `${APPLICATION_DIR}UseCases/Gone/GoneHandler.cs`;

    assert.deepEqual(check(text, exemptions), []);
    assert.equal(check(handler([]), exemptions).length, 1);
    assert.equal(check(text, new Map([...exemptions, [gone, 'probe reason']])).length, 1);
  });

  it('gives every exemption its reason, CreateEventHandler first', () => {
    assert.ok(
      WRITE_SEQ_EXEMPTIONS.has(`${APPLICATION_DIR}UseCases/CreateEvent/CreateEventHandler.cs`)
    );
    for (const reason of WRITE_SEQ_EXEMPTIONS.values()) assert.ok(reason.length > 20);
  });
});
