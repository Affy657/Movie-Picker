using MoviePicker.Api.Domain;
using MoviePicker.Api.Domain.Entities;
using Xunit;

namespace MoviePicker.Api.Tests.Domain;

public sealed class EventTests
{
    private static Event WithSchedule(string date, string time, string? winnerMovieId = null) => new()
    {
        Date = date,
        Time = time,
        WinnerMovieId = winnerMovieId
    };

    [Fact]
    public void Lifecycle_ClosedAtSet_AlwaysFinished()
    {
        var evt = new Event { ClosedAt = new DateTimeOffset(2000, 1, 1, 0, 0, 0, TimeSpan.Zero) };
        var now = new DateTimeOffset(2026, 6, 30, 12, 0, 0, TimeSpan.Zero);

        Assert.Equal(EventLifecycle.Finished, evt.Lifecycle(now));
        Assert.True(evt.IsFinished(now));
    }

    [Fact]
    public void Lifecycle_UnparseableDate_Upcoming()
    {
        var evt = new Event { Date = string.Empty, Time = string.Empty };
        var now = new DateTimeOffset(2026, 6, 30, 12, 0, 0, TimeSpan.Zero);

        Assert.Equal(EventLifecycle.Upcoming, evt.Lifecycle(now));
        Assert.False(evt.IsFinished(now));
    }

    [Fact]
    public void Lifecycle_BeforeStart_Upcoming()
    {
        var evt = WithSchedule("2026-06-30", "20:00");
        var now = new DateTimeOffset(2026, 6, 30, 10, 0, 0, TimeSpan.Zero);

        Assert.Equal(EventLifecycle.Upcoming, evt.Lifecycle(now));
    }

    [Fact]
    public void Lifecycle_AfterStart_BeforePendingDelay_Live()
    {
        var evt = WithSchedule("2026-06-30", "20:00");
        var summerStartUtc = new DateTimeOffset(2026, 6, 30, 18, 0, 0, TimeSpan.Zero);
        var now = summerStartUtc.AddHours(1);

        Assert.Equal(EventLifecycle.Live, evt.Lifecycle(now));
        Assert.False(evt.IsFinished(now));
    }

    [Fact]
    public void Lifecycle_AfterPendingDelay_NoWinner_Pending()
    {
        var evt = WithSchedule("2026-06-30", "20:00");
        var summerStartUtc = new DateTimeOffset(2026, 6, 30, 18, 0, 0, TimeSpan.Zero);
        var now = summerStartUtc + EventSchedule.PendingDelay;

        Assert.Equal(EventLifecycle.Pending, evt.Lifecycle(now));
        Assert.False(evt.IsFinished(now));
    }

    [Fact]
    public void Lifecycle_AfterPendingDelay_WithWinner_Finished()
    {
        var evt = WithSchedule("2026-06-30", "20:00", winnerMovieId: "m1");
        var now = new DateTimeOffset(2026, 6, 30, 20, 0, 0, TimeSpan.Zero);

        Assert.Equal(EventLifecycle.Finished, evt.Lifecycle(now));
        Assert.True(evt.IsFinished(now));
    }

    [Fact]
    public void Lifecycle_WinnerChosenBeforePendingDelay_StaysLive()
    {
        var evt = WithSchedule("2026-06-30", "20:00", winnerMovieId: "m1");
        var now = new DateTimeOffset(2026, 6, 30, 19, 0, 0, TimeSpan.Zero);

        Assert.Equal(EventLifecycle.Live, evt.Lifecycle(now));
    }

    [Fact]
    public void Lifecycle_PastAutoCloseDelay_NoWinner_FinishedByGuardRail()
    {
        var evt = WithSchedule("2026-06-30", "20:00");
        var pendingAt = new DateTimeOffset(2026, 6, 30, 20, 0, 0, TimeSpan.Zero);
        var now = pendingAt.AddDays(7).AddMinutes(1);

        Assert.Equal(EventLifecycle.Finished, evt.Lifecycle(now));
    }

    [Fact]
    public void Lifecycle_JustBeforeAutoCloseDelay_NoWinner_StillPending()
    {
        var evt = WithSchedule("2026-06-30", "20:00");
        var pendingAt = new DateTimeOffset(2026, 6, 30, 20, 0, 0, TimeSpan.Zero);
        var now = pendingAt.AddDays(7).AddMinutes(-1);

        Assert.Equal(EventLifecycle.Pending, evt.Lifecycle(now));
    }

    [Fact]
    public void Lifecycle_ParisWinterOffset_IsOneHour()
    {
        var evt = WithSchedule("2026-01-15", "20:00");
        var winterStartUtc = new DateTimeOffset(2026, 1, 15, 19, 0, 0, TimeSpan.Zero);
        var justBefore = winterStartUtc.AddMinutes(-1);
        var justAfter = winterStartUtc;

        Assert.Equal(EventLifecycle.Upcoming, evt.Lifecycle(justBefore));
        Assert.Equal(EventLifecycle.Live, evt.Lifecycle(justAfter));
    }
}
