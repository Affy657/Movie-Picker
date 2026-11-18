using Microsoft.Extensions.Logging;
using Moq;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.UsageCounts;
using MoviePicker.Api.Domain;
using MoviePicker.Api.Infrastructure.Persistence.InMemory;
using Xunit;

namespace MoviePicker.Api.Tests.UseCases.UsageCounts;

public sealed class UsageRecorderTests
{
    private static readonly DateTimeOffset LateEveningInParis = new(2026, 11, 18, 23, 30, 0, TimeSpan.Zero);

    private sealed class FixedClock(DateTimeOffset now) : TimeProvider
    {
        public override DateTimeOffset GetUtcNow() => now;
    }

    [Fact]
    public async Task RecordAsync_CountsOnTheParisDayOfTheAction()
    {
        var counts = new InMemoryUsageCountRepository();
        var recorder = new UsageRecorder(counts, Mock.Of<ILogger<UsageRecorder>>(), new FixedClock(LateEveningInParis));

        await recorder.RecordAsync(UsageCount.LetterboxdSynced(forced: true));
        await recorder.RecordAsync(UsageCount.LetterboxdSynced(forced: true));

        Assert.Equal(2, counts.CountOf(new DateOnly(2026, 11, 19), UsageCount.LetterboxdSyncedMetric, "manual"));
        Assert.Equal(0, counts.CountOf(new DateOnly(2026, 11, 18), UsageCount.LetterboxdSyncedMetric, "manual"));
    }

    [Fact]
    public async Task RecordAsync_NeverFailsTheActionItCounts()
    {
        var counts = new Mock<IUsageCountRepository>();
        counts.Setup(x => x.IncrementAsync(It.IsAny<DateOnly>(), It.IsAny<UsageCount>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new TimeoutException("database unreachable"));
        var logger = new Mock<ILogger<UsageRecorder>>();
        var recorder = new UsageRecorder(counts.Object, logger.Object, new FixedClock(LateEveningInParis));

        await recorder.RecordAsync(UsageCount.LetterboxdChoicesConfirmed(1));

        logger.Verify(
            x => x.Log(
                LogLevel.Warning,
                It.IsAny<EventId>(),
                It.IsAny<It.IsAnyType>(),
                It.IsAny<TimeoutException>(),
                It.IsAny<Func<It.IsAnyType, Exception?, string>>()),
            Times.Once);
    }

    [Fact]
    public async Task RecordAsync_NeverTurnsADoneActionIntoACancelledOne()
    {
        var counts = new Mock<IUsageCountRepository>();
        counts.Setup(x => x.IncrementAsync(It.IsAny<DateOnly>(), It.IsAny<UsageCount>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new OperationCanceledException());
        var logger = new Mock<ILogger<UsageRecorder>>();
        var recorder = new UsageRecorder(counts.Object, logger.Object, new FixedClock(LateEveningInParis));

        await recorder.RecordAsync(UsageCount.LetterboxdChoicesConfirmed(1), new CancellationToken(canceled: true));

        logger.Verify(
            x => x.Log(
                LogLevel.Warning,
                It.IsAny<EventId>(),
                It.IsAny<It.IsAnyType>(),
                It.IsAny<Exception?>(),
                It.IsAny<Func<It.IsAnyType, Exception?, string>>()),
            Times.Never);
    }
}
