using MoviePicker.Api.Application.UseCases.ListMyEvents;
using MoviePicker.Api.Domain.Entities;
using Xunit;

namespace MoviePicker.Api.Tests.UseCases.ListMyEvents;

public sealed class MyEventListLifecycleTests
{
    private static Event Base(string date = "2030-06-01", string time = "20:00") => new()
    {
        Id = "e1",
        Title = "S",
        Date = date,
        Time = time,
        Slug = "s",
        HostToken = "h",
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
    public void Compute_AfterScheduled_WithEndDateInFuture_IsLive()
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
            Config = new EventConfig { EndDate = DateTimeOffset.Parse("2031-01-01T00:00:00Z") }
        };
        var now = DateTimeOffset.Parse("2030-06-01T21:00:00Z");
        Assert.Equal(MyEventListLifecycle.Live, MyEventListLifecycle.Compute(e, now));
    }

    [Fact]
    public void Compute_AfterScheduled_WithoutConfigEndDate_IsFinishedByDomainTime()
    {
        var e = Base();
        var now = DateTimeOffset.Parse("2030-06-01T21:00:00Z");
        Assert.Equal(MyEventListLifecycle.Finished, MyEventListLifecycle.Compute(e, now));
    }

    [Fact]
    public void Compute_IsFinishedByNextDay_IsFinished()
    {
        var e = Base();
        var now = DateTimeOffset.Parse("2030-06-02T00:00:00Z");
        Assert.Equal(MyEventListLifecycle.Finished, MyEventListLifecycle.Compute(e, now));
    }

    [Fact]
    public void Compute_WinnerSet_IsFinishedEvenIfDateFuture()
    {
        var b = Base("2050-01-01", "20:00");
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
            WinnerMovieId = "m1"
        };
        var now = DateTimeOffset.Parse("2030-01-01T12:00:00Z");
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
    public void Compute_InvalidDateTime_IsFinished()
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
        Assert.Equal(MyEventListLifecycle.Finished, MyEventListLifecycle.Compute(e, now));
    }
}
