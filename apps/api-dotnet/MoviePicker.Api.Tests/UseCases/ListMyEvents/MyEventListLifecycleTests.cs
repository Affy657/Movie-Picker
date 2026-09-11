using MoviePicker.Api.Application.UseCases.ListMyEvents;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Tests.Builders;
using Xunit;

namespace MoviePicker.Api.Tests.UseCases.ListMyEvents;

public sealed class MyEventListLifecycleTests
{
    private static Event Base(string date = "2030-06-01", string time = "20:00", string? winnerMovieId = null) => new()
    {
        Id = "e1",
        Title = "S",
        Date = date,
        Time = time,
        Slug = "s",
        HostToken = "h",
        Winners = TestWinners.Won(winnerMovieId),
        CreatedAt = DateTimeOffset.Parse("2026-01-01T00:00:00Z"),
        UpdatedAt = DateTimeOffset.Parse("2026-01-02T00:00:00Z")
    };

    [Fact]
    public void Compute_BeforeScheduled_IsUpcoming()
    {
        var e = Base();
        var now = DateTimeOffset.Parse("2026-05-01T12:00:00Z");
        Assert.Equal(MyEventListLifecycle.Upcoming, MyEventListLifecycle.Compute(e, now));
    }

    [Fact]
    public void Compute_AfterStart_BeforePendingDelay_IsLive()
    {
        var e = Base();
        var summerStartUtc = DateTimeOffset.Parse("2030-06-01T18:00:00Z");
        var now = summerStartUtc.AddHours(1);
        Assert.Equal(MyEventListLifecycle.Live, MyEventListLifecycle.Compute(e, now));
    }

    [Fact]
    public void Compute_AfterPendingDelay_WithoutWinner_IsPending()
    {
        var e = Base();
        var now = DateTimeOffset.Parse("2030-06-02T00:00:00Z");
        Assert.Equal(MyEventListLifecycle.Pending, MyEventListLifecycle.Compute(e, now));
    }

    [Fact]
    public void Compute_PastAutoCloseDelay_WithoutWinner_IsFinished()
    {
        var e = Base();
        var pendingAt = DateTimeOffset.Parse("2030-06-01T20:00:00Z");
        var now = pendingAt.AddDays(7).AddMinutes(1);
        Assert.Equal(MyEventListLifecycle.Finished, MyEventListLifecycle.Compute(e, now));
    }

    [Fact]
    public void Compute_WinnerSet_BeforeStart_IsUpcoming()
    {
        var e = Base("2050-01-01", "20:00", winnerMovieId: "m1");
        var now = DateTimeOffset.Parse("2030-01-01T12:00:00Z");
        Assert.Equal(MyEventListLifecycle.Upcoming, MyEventListLifecycle.Compute(e, now));
    }

    [Fact]
    public void Compute_WinnerSet_BeforePendingDelay_IsLive()
    {
        var e = Base(winnerMovieId: "m1");
        var now = DateTimeOffset.Parse("2030-06-01T19:00:00Z");
        Assert.Equal(MyEventListLifecycle.Live, MyEventListLifecycle.Compute(e, now));
    }

    [Fact]
    public void Compute_WinnerSet_AfterPendingDelay_IsFinished()
    {
        var e = Base(winnerMovieId: "m1");
        var now = DateTimeOffset.Parse("2030-06-01T20:00:00Z");
        Assert.Equal(MyEventListLifecycle.Finished, MyEventListLifecycle.Compute(e, now));
    }

    [Fact]
    public void Compute_ClosedAt_IsFinished()
    {
        var b = Base();
        var e = new Event
        {
            Id = b.Id,
            Title = b.Title,
            Date = b.Date,
            Time = b.Time,
            Slug = b.Slug,
            HostToken = b.HostToken,
            CreatedAt = b.CreatedAt,
            UpdatedAt = b.UpdatedAt,
            ClosedAt = DateTimeOffset.Parse("2030-05-15T10:00:00Z")
        };
        var now = DateTimeOffset.Parse("2030-05-01T12:00:00Z");
        Assert.Equal(MyEventListLifecycle.Finished, MyEventListLifecycle.Compute(e, now));
    }

    [Fact]
    public void Compute_InvalidDateTime_IsUpcoming()
    {
        var b = Base();
        var e = new Event
        {
            Id = b.Id,
            Title = b.Title,
            Date = "not-a-date",
            Time = "xx",
            Slug = b.Slug,
            HostToken = b.HostToken,
            CreatedAt = b.CreatedAt,
            UpdatedAt = b.UpdatedAt
        };
        var now = DateTimeOffset.Parse("2026-01-01T12:00:00Z");
        Assert.Equal(MyEventListLifecycle.Upcoming, MyEventListLifecycle.Compute(e, now));
    }
}
