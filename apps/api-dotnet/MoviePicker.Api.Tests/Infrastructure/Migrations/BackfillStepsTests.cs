using MoviePicker.Api.Infrastructure.Migrations;
using Xunit;

namespace MoviePicker.Api.Tests.Infrastructure.Migrations;

public sealed class BackfillStepsTests
{
    private sealed record Item(string Id);

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
            100,
            CancellationToken.None);

        Assert.Equal(2, applied);
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
            100,
            CancellationToken.None);

        Assert.Equal(2, applied);
        Assert.Equal(["a", "b"], seen);
        Assert.Equal(2, calls);
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
            1,
            CancellationToken.None);

        Assert.Equal(3, applied);
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
            100,
            CancellationToken.None);

        Assert.Equal(3, applied);
        Assert.Equal(["a", "b", "c"], seen);
    }

    [Fact]
    public async Task RunBatchesAsync_EmptyFirstPage_DoesNothing()
    {
        var applied = await BackfillSteps.RunBatchesAsync<Item>(
            Batches([]),
            item => item.Id,
            (_, _) => Task.FromResult(true),
            100,
            CancellationToken.None);

        Assert.Equal(0, applied);
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
                100,
                cts.Token));
    }

    [Fact]
    public async Task TryApplyAsync_Success_ReturnsTheResultAndReportsNothing()
    {
        Exception? reported = null;

        var applied = await BackfillSteps.TryApplyAsync(() => Task.FromResult(true), ex => reported = ex);

        Assert.True(applied);
        Assert.Null(reported);
    }

    [Fact]
    public async Task TryApplyAsync_Throws_ReportsAndReturnsFalse()
    {
        Exception? reported = null;
        var boom = new HttpRequestException("TMDB indisponible");

        var applied = await BackfillSteps.TryApplyAsync(
            () => Task.FromException<bool>(boom),
            ex => reported = ex);

        Assert.False(applied);
        Assert.Same(boom, reported);
    }

    [Fact]
    public async Task TryApplyAsync_Cancelled_LetsTheCancellationThrough()
    {
        Exception? reported = null;

        await Assert.ThrowsAnyAsync<OperationCanceledException>(() =>
            BackfillSteps.TryApplyAsync(
                () => Task.FromException<bool>(new OperationCanceledException()),
                ex => reported = ex));

        Assert.Null(reported);
    }
}
