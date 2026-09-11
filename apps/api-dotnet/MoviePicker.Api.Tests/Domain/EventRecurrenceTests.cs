using MoviePicker.Api.Domain;
using Xunit;

namespace MoviePicker.Api.Tests.Domain;

public sealed class EventRecurrenceTests
{
    private static readonly DateOnly FarPast = new(2000, 1, 1);

    [Fact]
    public void NextDate_Weekly_AddsSevenDays()
    {
        var next = EventRecurrence.NextDate(new DateOnly(2026, 9, 9), RecurrenceFrequency.Weekly, FarPast);

        Assert.Equal(new DateOnly(2026, 9, 16), next);
    }

    [Fact]
    public void NextDate_Biweekly_AddsFourteenDays()
    {
        var next = EventRecurrence.NextDate(new DateOnly(2026, 9, 9), RecurrenceFrequency.Biweekly, FarPast);

        Assert.Equal(new DateOnly(2026, 9, 23), next);
    }

    [Fact]
    public void NextDate_Monthly_KeepsDayOfMonth()
    {
        var next = EventRecurrence.NextDate(new DateOnly(2026, 9, 9), RecurrenceFrequency.Monthly, FarPast);

        Assert.Equal(new DateOnly(2026, 10, 9), next);
    }

    [Fact]
    public void NextDate_MonthlyOnThirtyFirst_ClampsToLastDayOfShorterMonth()
    {
        var next = EventRecurrence.NextDate(new DateOnly(2026, 1, 31), RecurrenceFrequency.Monthly, FarPast);

        Assert.Equal(new DateOnly(2026, 2, 28), next);
    }

    [Fact]
    public void NextDate_MonthlyCatchingUpPastShorterMonth_DoesNotDriftAwayFromAnchorDay()
    {
        var next = EventRecurrence.NextDate(
            new DateOnly(2026, 1, 31),
            RecurrenceFrequency.Monthly,
            new DateOnly(2026, 3, 1));

        Assert.Equal(new DateOnly(2026, 3, 31), next);
    }

    [Fact]
    public void NextDate_SeriesLeftDormant_SkipsForwardToTheFirstFutureOccurrence()
    {
        var next = EventRecurrence.NextDate(
            new DateOnly(2026, 1, 5),
            RecurrenceFrequency.Weekly,
            new DateOnly(2026, 2, 1));

        Assert.Equal(new DateOnly(2026, 2, 2), next);
    }

    [Fact]
    public void NextDate_CandidateFallingExactlyOnTheBoundaryDay_IsSkipped()
    {
        var next = EventRecurrence.NextDate(
            new DateOnly(2026, 9, 9),
            RecurrenceFrequency.Weekly,
            new DateOnly(2026, 9, 16));

        Assert.Equal(new DateOnly(2026, 9, 23), next);
    }

    [Fact]
    public void NextDate_SeriesDormantBeyondTheCatchUpLimit_ReturnsNull()
    {
        var next = EventRecurrence.NextDate(
            new DateOnly(2020, 1, 1),
            RecurrenceFrequency.Weekly,
            new DateOnly(2026, 9, 9));

        Assert.Null(next);
    }
}
