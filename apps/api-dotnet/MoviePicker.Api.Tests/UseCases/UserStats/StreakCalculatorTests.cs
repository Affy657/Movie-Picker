using System.Globalization;
using MoviePicker.Api.Application.UseCases.UserStats;
using MoviePicker.Api.Domain.Entities;
using Xunit;

namespace MoviePicker.Api.Tests.UseCases.UserStats;

public sealed class StreakCalculatorTests
{
    private static readonly DateTimeOffset Now = new(2026, 6, 15, 0, 0, 0, TimeSpan.Zero);

    private static Event Evt(string date) => new() { Id = date, Date = date };

    private static string WeeksAgo(int n) =>
        Now.UtcDateTime.Date.AddDays(-7 * n).ToString("yyyy-MM-dd", CultureInfo.InvariantCulture);

    [Fact]
    public void NoQualifyingEvents_ReturnsZero()
    {
        var (current, best) = GetUserStatsHandler.ComputeStreaks(Array.Empty<Event>(), Now);

        Assert.Equal(0, current);
        Assert.Equal(0, best);
    }

    [Fact]
    public void SingleEventThisWeek_ReturnsOne()
    {
        var events = new[] { Evt(WeeksAgo(0)) };

        var (current, best) = GetUserStatsHandler.ComputeStreaks(events, Now);

        Assert.Equal(1, current);
        Assert.Equal(1, best);
    }

    [Fact]
    public void ThreeConsecutiveWeeksIncludingCurrent_ReturnsThree()
    {
        var events = new[] { Evt(WeeksAgo(0)), Evt(WeeksAgo(1)), Evt(WeeksAgo(2)) };

        var (current, best) = GetUserStatsHandler.ComputeStreaks(events, Now);

        Assert.Equal(3, current);
        Assert.Equal(3, best);
    }

    [Fact]
    public void CurrentWeekEmptyButPreviousThreeConsecutive_DoesNotBreakStreak()
    {
        var events = new[] { Evt(WeeksAgo(1)), Evt(WeeksAgo(2)), Evt(WeeksAgo(3)) };

        var (current, best) = GetUserStatsHandler.ComputeStreaks(events, Now);

        Assert.Equal(3, current);
        Assert.Equal(3, best);
    }

    [Fact]
    public void CurrentAndLastWeekEmpty_ResetsToZeroButKeepsBestStreak()
    {
        var events = new[]
        {
            Evt(WeeksAgo(2)), Evt(WeeksAgo(3)), Evt(WeeksAgo(4)), Evt(WeeksAgo(5)), Evt(WeeksAgo(6)),
        };

        var (current, best) = GetUserStatsHandler.ComputeStreaks(events, Now);

        Assert.Equal(0, current);
        Assert.Equal(5, best);
    }

    [Fact]
    public void TwoSoireesSameIsoWeek_CountAsOneWeek()
    {
        var monday = Now.UtcDateTime.Date;
        var events = new[] { Evt(monday.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture)), Evt(monday.AddDays(2).ToString("yyyy-MM-dd", CultureInfo.InvariantCulture)) };

        var (current, best) = GetUserStatsHandler.ComputeStreaks(events, Now);

        Assert.Equal(1, current);
        Assert.Equal(1, best);
    }

    [Fact]
    public void NonContiguousRuns_BestIsLongestRunNotNecessarilyCurrent()
    {
        var events = new[]
        {
            Evt(WeeksAgo(0)), Evt(WeeksAgo(1)), Evt(WeeksAgo(2)),
            Evt(WeeksAgo(10)), Evt(WeeksAgo(11)), Evt(WeeksAgo(12)), Evt(WeeksAgo(13)),
            Evt(WeeksAgo(20)), Evt(WeeksAgo(21)),
        };

        var (current, best) = GetUserStatsHandler.ComputeStreaks(events, Now);

        Assert.Equal(3, current);
        Assert.Equal(4, best);
    }

    [Fact]
    public void WeekSpanningYearBoundary_MergesIntoSingleWeek()
    {
        var yearBoundaryMonday = new DateTimeOffset(2019, 12, 30, 0, 0, 0, TimeSpan.Zero);
        var events = new[] { Evt("2019-12-30"), Evt("2020-01-05") };

        var (current, best) = GetUserStatsHandler.ComputeStreaks(events, yearBoundaryMonday);

        Assert.Equal(1, current);
        Assert.Equal(1, best);
    }
}
