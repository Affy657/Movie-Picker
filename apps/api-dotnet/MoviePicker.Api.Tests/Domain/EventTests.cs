using MoviePicker.Api.Domain.Entities;
using Xunit;

namespace MoviePicker.Api.Tests.Domain;

public sealed class EventTests
{
    private static readonly DateTimeOffset Now = new(2026, 6, 30, 12, 0, 0, TimeSpan.Zero);

    [Fact]
    public void IsFinished_ClosedAtSet_AlwaysTrue()
    {
        var evt = new Event { ClosedAt = new DateTimeOffset(2000, 1, 1, 0, 0, 0, TimeSpan.Zero) };

        Assert.True(evt.IsFinished(Now));
    }

    [Fact]
    public void IsFinished_EndDateInPast_True()
    {
        var evt = new Event { Config = new EventConfig { EndDate = Now.AddHours(-1) } };

        Assert.True(evt.IsFinished(Now));
    }

    [Fact]
    public void IsFinished_EndDateInFuture_False()
    {
        var evt = new Event { Config = new EventConfig { EndDate = Now.AddHours(1) } };

        Assert.False(evt.IsFinished(Now));
    }

    [Fact]
    public void IsFinished_FromDateTime_PastEvent_True()
    {
        var evt = new Event { Date = "2020-01-01", Time = "20:00" };

        Assert.True(evt.IsFinished(Now));
    }

    [Fact]
    public void IsFinished_FromDateTime_FutureEvent_False()
    {
        var evt = new Event { Date = "2099-01-01", Time = "20:00" };

        Assert.False(evt.IsFinished(Now));
    }

    [Fact]
    public void IsFinished_UnparseableDate_False()
    {
        var evt = new Event { Date = string.Empty, Time = string.Empty };

        Assert.False(evt.IsFinished(Now));
    }

    [Fact]
    public void IsFinished_EndDateTakesPrecedenceOverDateTime()
    {
        var evt = new Event
        {
            Date = "2099-01-01",
            Time = "20:00",
            Config = new EventConfig { EndDate = Now.AddHours(-1) }
        };

        Assert.True(evt.IsFinished(Now));
    }
}
