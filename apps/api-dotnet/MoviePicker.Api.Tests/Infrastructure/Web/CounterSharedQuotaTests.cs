using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Infrastructure.Persistence.InMemory;
using MoviePicker.Api.Infrastructure.Web;
using MoviePicker.Api.Tests.Logging;
using Xunit;

namespace MoviePicker.Api.Tests.Infrastructure.Web;

public sealed class CounterSharedQuotaTests
{
    private const string Scope = "scope";
    private const string Subject = "someone@example.com";

    private static readonly TimeSpan Window = TimeSpan.FromHours(24);

    private sealed class MovableClock(DateTimeOffset now) : TimeProvider
    {
        public DateTimeOffset Now { get; set; } = now;

        public override DateTimeOffset GetUtcNow() => Now;
    }

    private readonly MovableClock _clock = new(new DateTimeOffset(2026, 11, 6, 12, 0, 0, TimeSpan.Zero));

    private CounterSharedQuota Quota(IRateLimitCounterStore? counters = null, string? environment = null) =>
        new(
            counters ?? new InMemoryRateLimitCounterStore(_clock),
            _clock,
            new FakeHostEnvironment { EnvironmentName = environment ?? Environments.Production },
            NullLogger<CounterSharedQuota>.Instance);

    [Fact]
    public async Task TryConsume_RefusesPastTheLimit()
    {
        var quota = Quota();

        Assert.True(await quota.TryConsumeAsync(Scope, Subject, 2, Window));
        Assert.True(await quota.TryConsumeAsync(Scope, Subject, 2, Window));
        Assert.False(await quota.TryConsumeAsync(Scope, Subject, 2, Window));
    }

    [Fact]
    public async Task TryConsume_TheNextWindowStartsOver()
    {
        var quota = Quota();
        await quota.TryConsumeAsync(Scope, Subject, 1, Window);

        _clock.Now += Window;

        Assert.True(await quota.TryConsumeAsync(Scope, Subject, 1, Window));
    }

    [Fact]
    public async Task TryConsume_SubjectsAndScopesCountApart()
    {
        var quota = Quota();
        await quota.TryConsumeAsync(Scope, Subject, 1, Window);

        Assert.True(await quota.TryConsumeAsync(Scope, "other@example.com", 1, Window));
        Assert.True(await quota.TryConsumeAsync("other-scope", Subject, 1, Window));
    }

    [Fact]
    public async Task TryConsume_NeverWritesTheSubjectInTheCounterKey()
    {
        var counters = new Mock<IRateLimitCounterStore>();
        string? key = null;
        counters
            .Setup(c => c.IncrementAsync(It.IsAny<string>(), It.IsAny<DateTimeOffset>(), It.IsAny<CancellationToken>()))
            .Callback<string, DateTimeOffset, CancellationToken>((k, _, _) => key = k)
            .ReturnsAsync(1);

        await Quota(counters.Object).TryConsumeAsync(Scope, Subject, 1, Window);

        Assert.NotNull(key);
        Assert.StartsWith(Scope, key);
        Assert.DoesNotContain(Subject, key);
    }

    [Fact]
    public async Task TryConsume_ExpiresTheCounterWithItsWindow()
    {
        var counters = new Mock<IRateLimitCounterStore>();
        DateTimeOffset? expiresAt = null;
        counters
            .Setup(c => c.IncrementAsync(It.IsAny<string>(), It.IsAny<DateTimeOffset>(), It.IsAny<CancellationToken>()))
            .Callback<string, DateTimeOffset, CancellationToken>((_, end, _) => expiresAt = end)
            .ReturnsAsync(1);

        await Quota(counters.Object).TryConsumeAsync(Scope, Subject, 1, Window);

        Assert.Equal(new DateTimeOffset(2026, 11, 7, 0, 0, 0, TimeSpan.Zero), expiresAt);
    }

    [Fact]
    public async Task TryConsume_Development_LetsEverythingThroughWithoutCounting()
    {
        var counters = new Mock<IRateLimitCounterStore>();

        var allowed = await Quota(counters.Object, Environments.Development).TryConsumeAsync(Scope, Subject, 0, Window);

        Assert.True(allowed);
        counters.Verify(
            c => c.IncrementAsync(It.IsAny<string>(), It.IsAny<DateTimeOffset>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }

    [Fact]
    public async Task TryConsume_CounterStoreDown_LetsThroughAndWarns()
    {
        var counters = new Mock<IRateLimitCounterStore>();
        counters
            .Setup(c => c.IncrementAsync(It.IsAny<string>(), It.IsAny<DateTimeOffset>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new TimeoutException("down"));
        var logs = new CapturingLogger<CounterSharedQuota>();
        var quota = new CounterSharedQuota(
            counters.Object,
            _clock,
            new FakeHostEnvironment { EnvironmentName = Environments.Production },
            logs);

        Assert.True(await quota.TryConsumeAsync(Scope, Subject, 1, Window));

        Assert.Contains(logs.Entries, e => e.Level == LogLevel.Warning);
    }

    [Fact]
    public async Task TryConsume_CancelledRequest_IsNotSwallowed()
    {
        var counters = new Mock<IRateLimitCounterStore>();
        counters
            .Setup(c => c.IncrementAsync(It.IsAny<string>(), It.IsAny<DateTimeOffset>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new OperationCanceledException());

        await Assert.ThrowsAsync<OperationCanceledException>(
            () => Quota(counters.Object).TryConsumeAsync(Scope, Subject, 1, Window));
    }
}
