using MoviePicker.Api.Domain;
using MoviePicker.Api.Infrastructure.Persistence.InMemory;
using Xunit;

namespace MoviePicker.Api.Tests.Infrastructure.Persistence.InMemory;

public sealed class InMemoryUsageCountRepositoryTests
{
    private static readonly DateOnly Monday = new(2026, 11, 16);
    private static readonly DateOnly Tuesday = new(2026, 11, 17);

    private readonly InMemoryUsageCountRepository _repo = new();

    [Fact]
    public async Task Increment_AddsUpTheSameCountOnTheSameDay()
    {
        await _repo.IncrementAsync(Monday, UsageCount.LetterboxdSynced(forced: false));
        await _repo.IncrementAsync(Monday, UsageCount.LetterboxdSynced(forced: false));

        Assert.Equal(2, _repo.CountOf(Monday, UsageCount.LetterboxdSyncedMetric, "auto"));
    }

    [Fact]
    public async Task Increment_KeepsDaysAndVariantsApart()
    {
        await _repo.IncrementAsync(Monday, UsageCount.LetterboxdSynced(forced: false));
        await _repo.IncrementAsync(Tuesday, UsageCount.LetterboxdSynced(forced: false));
        await _repo.IncrementAsync(Tuesday, UsageCount.LetterboxdSynced(forced: true));

        Assert.Equal(1, _repo.CountOf(Monday, UsageCount.LetterboxdSyncedMetric, "auto"));
        Assert.Equal(1, _repo.CountOf(Tuesday, UsageCount.LetterboxdSyncedMetric, "auto"));
        Assert.Equal(1, _repo.CountOf(Tuesday, UsageCount.LetterboxdSyncedMetric, "manual"));
        Assert.Equal(0, _repo.CountOf(Monday, UsageCount.LetterboxdSyncedMetric, "manual"));
    }

    [Fact]
    public async Task Increment_CountsEveryConcurrentHit()
    {
        await Task.WhenAll(Enumerable.Range(0, 200)
            .Select(_ => Task.Run(() => _repo.IncrementAsync(Monday, UsageCount.LetterboxdChoicesConfirmed(1)))));

        Assert.Equal(200, _repo.CountOf(Monday, UsageCount.LetterboxdChoicesConfirmedMetric, "selected"));
    }
}
