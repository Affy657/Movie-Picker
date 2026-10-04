using MoviePicker.Api.Infrastructure.Migrations;
using Xunit;

namespace MoviePicker.Api.Tests.Infrastructure.Migrations;

public sealed class BackfillStepsTests
{
    private sealed record Item(string Id);

    private static readonly Action<Item, Exception> IgnoreFailure = (_, _) => { };

    private static Func<int, CancellationToken, Task<IReadOnlyList<Item>>> Batches(
        params IReadOnlyList<Item>[] pages)
    {
        var queue = new Queue<IReadOnlyList<Item>>(pages);
        return (_, _) => Task.FromResult(queue.Count > 0 ? queue.Dequeue() : []);
    }

    [Fact]
    public async Task RunBatchesAsync_CountsOnlyAppliedItems()
    {
        var applied = await BackfillSteps.RunBatchesAsync<Item>(
            Batches([new Item("a"), new Item("b"), new Item("c")]),
            item => item.Id,
            (item, _) => Task.FromResult(item.Id != "b"),
            IgnoreFailure,
            100,
            CancellationToken.None);

        Assert.Equal(2, applied.Updated);
    }

    [Fact]
    public async Task RunBatchesAsync_SourceKeepsReturningTheSamePage_StopsInsteadOfLooping()
    {
        var page = new List<Item> { new("a"), new("b") };
        var calls = 0;
        var seen = new List<string>();

        var applied = await BackfillSteps.RunBatchesAsync<Item>(
            (_, _) =>
            {
                calls++;
                return Task.FromResult<IReadOnlyList<Item>>(page);
            },
            item => item.Id,
            (item, _) =>
            {
                seen.Add(item.Id);
                return Task.FromResult(true);
            },
            IgnoreFailure,
            100,
            CancellationToken.None);

        Assert.Equal(2, applied.Updated);
        Assert.Equal(["a", "b"], seen);
        Assert.Equal(2, calls);
    }

    [Fact]
    public async Task RunBatchesAsync_AFullPageOfSkippedItems_DoesNotHideTheRest()
    {
        var pending = new List<Item> { new("stuck-1"), new("stuck-2"), new("a"), new("b"), new("c") };

        var applied = await BackfillSteps.RunBatchesAsync<Item>(
            (limit, _) => Task.FromResult<IReadOnlyList<Item>>(pending.Take(limit).ToList()),
            item => item.Id,
            (item, _) =>
            {
                if (item.Id.StartsWith("stuck", StringComparison.Ordinal))
                    return Task.FromResult(false);
                pending.Remove(item);
                return Task.FromResult(true);
            },
            IgnoreFailure,
            2,
            CancellationToken.None);

        Assert.Equal(3, applied.Updated);
        Assert.Equal(["stuck-1", "stuck-2"], pending.Select(item => item.Id));
    }

    [Fact]
    public async Task RunBatchesAsync_WalksEveryPageUntilExhausted()
    {
        var seen = new List<string>();

        var applied = await BackfillSteps.RunBatchesAsync<Item>(
            Batches([new Item("a")], [new Item("b")], [new Item("c")]),
            item => item.Id,
            (item, _) =>
            {
                seen.Add(item.Id);
                return Task.FromResult(true);
            },
            IgnoreFailure,
            1,
            CancellationToken.None);

        Assert.Equal(3, applied.Updated);
        Assert.Equal(["a", "b", "c"], seen);
    }

    [Fact]
    public async Task RunBatchesAsync_PageRepeatsAnAlreadySeenItem_AppliesItOnlyOnce()
    {
        var seen = new List<string>();

        var applied = await BackfillSteps.RunBatchesAsync<Item>(
            Batches([new Item("a"), new Item("b")], [new Item("b"), new Item("c")]),
            item => item.Id,
            (item, _) =>
            {
                seen.Add(item.Id);
                return Task.FromResult(true);
            },
            IgnoreFailure,
            100,
            CancellationToken.None);

        Assert.Equal(3, applied.Updated);
        Assert.Equal(["a", "b", "c"], seen);
    }

    [Fact]
    public async Task RunBatchesAsync_EmptyFirstPage_DoesNothing()
    {
        var applied = await BackfillSteps.RunBatchesAsync<Item>(
            Batches([]),
            item => item.Id,
            (_, _) => Task.FromResult(true),
            IgnoreFailure,
            100,
            CancellationToken.None);

        Assert.Equal(0, applied.Updated);
    }

    [Fact]
    public async Task RunBatchesAsync_Cancelled_Throws()
    {
        using var cts = new CancellationTokenSource();
        cts.Cancel();

        await Assert.ThrowsAnyAsync<OperationCanceledException>(() =>
            BackfillSteps.RunBatchesAsync<Item>(
                Batches([new Item("a")]),
                item => item.Id,
                (_, _) => Task.FromResult(true),
                IgnoreFailure,
                100,
                cts.Token));
    }

    [Fact]
    public async Task RunBatchesAsync_OneItemThrows_AppliesTheOthersAndCountsTheFailure()
    {
        var reported = new List<string>();

        var outcome = await BackfillSteps.RunBatchesAsync<Item>(
            Batches([new Item("a"), new Item("b"), new Item("c")]),
            item => item.Id,
            (item, _) => item.Id == "b"
                ? Task.FromException<bool>(new HttpRequestException("TMDB unavailable"))
                : Task.FromResult(true),
            (item, _) => reported.Add(item.Id),
            100,
            CancellationToken.None);

        Assert.Equal(new BackfillOutcome(2, 1), outcome);
        Assert.Equal(["b"], reported);
    }

    [Fact]
    public async Task RunBatchesAsync_ItemCancelled_LetsTheCancellationThrough()
    {
        var reported = new List<string>();

        await Assert.ThrowsAnyAsync<OperationCanceledException>(() =>
            BackfillSteps.RunBatchesAsync<Item>(
                Batches([new Item("a")]),
                item => item.Id,
                (_, _) => Task.FromException<bool>(new OperationCanceledException()),
                (item, _) => reported.Add(item.Id),
                100,
                CancellationToken.None));

        Assert.Empty(reported);
    }

    [Fact]
    public void Completed_WithoutFailure_ReturnsTheUpdatedCount()
    {
        Assert.Equal(5, new BackfillOutcome(5, 0).Completed("m"));
    }

    [Fact]
    public void Completed_WithFailures_ReportsTheMigrationIncomplete()
    {
        var ex = Assert.Throws<BackfillIncompleteException>(() => new BackfillOutcome(5, 2).Completed("m"));

        Assert.Equal(2, ex.Failed);
    }

    [Fact]
    public void Outcomes_AddUp()
    {
        Assert.Equal(new BackfillOutcome(3, 1), new BackfillOutcome(1, 0) + new BackfillOutcome(2, 1));
    }
}
