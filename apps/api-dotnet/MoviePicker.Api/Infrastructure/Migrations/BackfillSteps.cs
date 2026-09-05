namespace MoviePicker.Api.Infrastructure.Migrations;

internal static class BackfillSteps
{
    public static async Task<long> RunBatchesAsync<TItem>(
        Func<int, CancellationToken, Task<IReadOnlyList<TItem>>> listBatch,
        Func<TItem, string> idOf,
        Func<TItem, CancellationToken, Task<bool>> apply,
        int batchSize,
        CancellationToken ct)
    {
        var attempted = new HashSet<string>();
        var updated = 0L;

        while (true)
        {
            ct.ThrowIfCancellationRequested();
            var batch = await listBatch(batchSize, ct);
            var fresh = batch.Where(item => attempted.Add(idOf(item))).ToList();
            if (fresh.Count == 0)
                return updated;

            foreach (var item in fresh)
            {
                ct.ThrowIfCancellationRequested();
                if (await apply(item, ct))
                    updated++;
            }
        }
    }

    public static async Task<bool> TryApplyAsync(Func<Task<bool>> apply, Action<Exception> onFailure)
    {
        try
        {
            return await apply();
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            onFailure(ex);
            return false;
        }
    }
}
