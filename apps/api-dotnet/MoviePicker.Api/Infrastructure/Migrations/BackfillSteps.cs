namespace MoviePicker.Api.Infrastructure.Migrations;

internal readonly record struct BackfillOutcome(long Updated, int Failed)
{
    public static BackfillOutcome operator +(BackfillOutcome left, BackfillOutcome right) =>
        new(left.Updated + right.Updated, left.Failed + right.Failed);

    public long Completed(string migrationId) =>
        Failed == 0 ? Updated : throw new BackfillIncompleteException(migrationId, Updated, Failed);
}

public sealed class BackfillIncompleteException(string migrationId, long updated, int failed)
    : Exception($"Migration {migrationId} left {failed} item(s) behind after updating {updated}; it will resume at the next startup")
{
    public int Failed { get; } = failed;
}

internal static class BackfillSteps
{
    public static async Task<BackfillOutcome> RunBatchesAsync<TItem>(
        Func<int, CancellationToken, Task<IReadOnlyList<TItem>>> listBatch,
        Func<TItem, string> idOf,
        Func<TItem, CancellationToken, Task<bool>> apply,
        Action<TItem, Exception> onFailure,
        int batchSize,
        CancellationToken ct)
    {
        var attempted = new HashSet<string>();
        var updated = 0L;
        var failed = 0;
        var limit = batchSize;

        while (true)
        {
            ct.ThrowIfCancellationRequested();
            var batch = await listBatch(limit, ct);
            var fresh = batch.Where(item => attempted.Add(idOf(item))).ToList();
            if (fresh.Count == 0)
            {
                if (batch.Count < limit)
                    return new BackfillOutcome(updated, failed);
                limit *= 2;
                continue;
            }

            foreach (var item in fresh)
            {
                ct.ThrowIfCancellationRequested();
                try
                {
                    if (await apply(item, ct))
                        updated++;
                }
                catch (Exception ex) when (ex is not OperationCanceledException)
                {
                    failed++;
                    onFailure(item, ex);
                }
            }
        }
    }
}
