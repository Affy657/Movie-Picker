using MoviePicker.Api.Domain;
using MoviePicker.Api.Domain.Entities;
using Xunit;

namespace MoviePicker.Api.Tests.Domain;

public sealed class EventScheduleTests
{
    [Theory]
    [InlineData("2026-03-29", "02:00", 1, 0)]
    [InlineData("2026-03-29", "02:30", 1, 30)]
    [InlineData("2026-03-29", "02:59", 1, 59)]
    public void TryGetStartUtc_StartInTheSpringForwardGap_MovesForwardLikeTheWebApp(
        string date, string time, int expectedUtcHour, int expectedUtcMinute)
    {
        var scheduled = EventSchedule.TryGetStartUtc(date, time, out var startUtc);

        Assert.True(scheduled);
        Assert.Equal(new DateTimeOffset(2026, 3, 29, expectedUtcHour, expectedUtcMinute, 0, TimeSpan.Zero), startUtc);
    }

    [Fact]
    public void TryGetStartUtc_AmbiguousFallBackTime_ReadsTheSecondPassageLikeTheWebApp()
    {
        var scheduled = EventSchedule.TryGetStartUtc("2026-10-25", "02:30", out var startUtc);

        Assert.True(scheduled);
        Assert.Equal(new DateTimeOffset(2026, 10, 25, 1, 30, 0, TimeSpan.Zero), startUtc);
    }

    [Fact]
    public void Lifecycle_NightStartingInTheSpringForwardGap_GoesLiveAndThenPending()
    {
        var evt = new Event { Date = "2026-03-29", Time = "02:30" };
        var startUtc = new DateTimeOffset(2026, 3, 29, 1, 30, 0, TimeSpan.Zero);

        Assert.Equal(EventLifecycle.Upcoming, evt.Lifecycle(startUtc.AddMinutes(-1)));
        Assert.Equal(EventLifecycle.Live, evt.Lifecycle(startUtc));
        Assert.Equal(EventLifecycle.Pending, evt.Lifecycle(startUtc + EventSchedule.PendingDelay));
    }
}
