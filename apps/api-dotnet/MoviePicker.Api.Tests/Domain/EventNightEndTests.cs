using MoviePicker.Api.Domain;
using MoviePicker.Api.Domain.Entities;
using Xunit;

namespace MoviePicker.Api.Tests.Domain;

public sealed class EventNightEndTests
{
    private static readonly DateTimeOffset SummerStartUtc = new(2026, 6, 30, 18, 0, 0, TimeSpan.Zero);

    private static EventWinner Drawn(string movieId, int? runtimeMinutes, DateTimeOffset? pickedAt = null) => new()
    {
        MovieId = movieId,
        Method = WinnerPickMethod.Wheel,
        PickedAt = pickedAt ?? SummerStartUtc.AddDays(-1),
        RuntimeMinutes = runtimeMinutes
    };

    private static Event Night(params EventWinner[] winners) => new()
    {
        Date = "2026-06-30",
        Time = "20:00",
        Winners = winners
    };

    [Theory]
    [InlineData(null, 120)]
    [InlineData(95, 120)]
    [InlineData(120, 120)]
    [InlineData(169, 169)]
    [InlineData(5000, 720)]
    public void NightLength_IsTheLongestFilmButNeverUnderTheTwoHoursOfANightNorOverTheLongestNight(
        int? longestRuntimeMinutes, int expectedMinutes)
    {
        Assert.Equal(TimeSpan.FromMinutes(expectedMinutes), EventSchedule.NightLength(longestRuntimeMinutes));
    }

    [Fact]
    public void Lifecycle_FilmLongerThanTwoHours_StaysLiveUntilTheFilmIsOver()
    {
        var interstellar = Night(Drawn("m1", 169));

        Assert.Equal(EventLifecycle.Live, interstellar.Lifecycle(SummerStartUtc.AddHours(2)));
        Assert.Equal(EventLifecycle.Live, interstellar.Lifecycle(SummerStartUtc.AddMinutes(168)));
        Assert.Equal(EventLifecycle.Finished, interstellar.Lifecycle(SummerStartUtc.AddMinutes(169)));
    }

    [Fact]
    public void Lifecycle_ShortFilm_EndsAfterTheTwoHoursOfANight()
    {
        var shortFilm = Night(Drawn("m1", 85));

        Assert.Equal(EventLifecycle.Live, shortFilm.Lifecycle(SummerStartUtc.AddMinutes(119)));
        Assert.Equal(EventLifecycle.Finished, shortFilm.Lifecycle(SummerStartUtc.AddHours(2)));
    }

    [Fact]
    public void Lifecycle_TwoFilmsDrawn_EndsWithTheLongestOne()
    {
        var night = Night(Drawn("m1", 100), Drawn("m2", 150)) with { Config = new EventConfig { WinnerCount = 2 } };

        Assert.Equal(EventLifecycle.Live, night.Lifecycle(SummerStartUtc.AddMinutes(149)));
        Assert.Equal(EventLifecycle.Finished, night.Lifecycle(SummerStartUtc.AddMinutes(150)));
    }

    [Fact]
    public void Lifecycle_LongFilmDrawnFirstOfTwo_GoesPendingOnlyOnceTheFilmIsOver()
    {
        var night = Night(Drawn("m1", 169)) with { Config = new EventConfig { WinnerCount = 2 } };

        Assert.Equal(EventLifecycle.Live, night.Lifecycle(SummerStartUtc.AddMinutes(168)));
        Assert.Equal(EventLifecycle.Pending, night.Lifecycle(SummerStartUtc.AddMinutes(169)));
    }

    [Fact]
    public void Lifecycle_NoFilmDrawn_StillGoesPendingAfterTwoHours()
    {
        Assert.Equal(EventLifecycle.Pending, Night().Lifecycle(SummerStartUtc.AddHours(2)));
    }

    [Fact]
    public void TryGetEndUtc_FilmDrawnBeforeTheNight_EndsWithTheFilm()
    {
        Assert.True(Night(Drawn("m1", 169)).TryGetEndUtc(out var end));
        Assert.Equal(SummerStartUtc.AddMinutes(169), end);
    }

    [Fact]
    public void TryGetEndUtc_FilmDrawnDaysAfterTheNight_EndsWhenItWasDrawn()
    {
        var drawnFourDaysLater = SummerStartUtc.AddDays(4);

        Assert.True(Night(Drawn("m1", 120, drawnFourDaysLater)).TryGetEndUtc(out var end));
        Assert.Equal(drawnFourDaysLater, end);
    }

    [Fact]
    public void TryGetEndUtc_ClosedByTheHostBeforeTheFilmIsOver_EndsWhenClosed()
    {
        var closedAt = SummerStartUtc.AddMinutes(90);
        var night = Night(Drawn("m1", 169)) with { ClosedAt = closedAt };

        Assert.True(night.TryGetEndUtc(out var end));
        Assert.Equal(closedAt, end);
    }

    [Fact]
    public void TryGetEndUtc_ClosedLongAfterTheFilm_KeepsTheEndOfTheFilm()
    {
        var night = Night(Drawn("m1", 169)) with { ClosedAt = SummerStartUtc.AddDays(2) };

        Assert.True(night.TryGetEndUtc(out var end));
        Assert.Equal(SummerStartUtc.AddMinutes(169), end);
    }

    [Fact]
    public void TryGetEndUtc_UnreadableDate_HasNoEnd()
    {
        var night = Night(Drawn("m1", 120)) with { Date = "not-a-date" };

        Assert.False(night.TryGetEndUtc(out _));
    }

    [Fact]
    public void IsRatingPromptDue_WhileTheFilmIsStillPlaying_False()
    {
        var interstellar = Night(Drawn("m1", 169));

        Assert.False(interstellar.IsRatingPromptDue(SummerStartUtc.AddHours(2).AddMinutes(30), promptedAt: null));
    }

    [Fact]
    public void IsRatingPromptDue_OnceTheFilmIsOver_True()
    {
        var interstellar = Night(Drawn("m1", 169));

        Assert.True(interstellar.IsRatingPromptDue(SummerStartUtc.AddMinutes(169), promptedAt: null));
    }

    [Fact]
    public void IsRatingPromptDue_UntilTheCatchUpWindowCloses()
    {
        var night = Night(Drawn("m1", 120));
        var end = SummerStartUtc.AddHours(2);

        Assert.True(night.IsRatingPromptDue(end + EventSchedule.RatingCatchUpWindow - TimeSpan.FromMinutes(1), promptedAt: null));
        Assert.False(night.IsRatingPromptDue(end + EventSchedule.RatingCatchUpWindow, promptedAt: null));
    }

    [Fact]
    public void IsRatingPromptDue_AlreadyPromptedSinceTheEnd_False()
    {
        var night = Night(Drawn("m1", 120));
        var end = SummerStartUtc.AddHours(2);

        Assert.False(night.IsRatingPromptDue(end.AddDays(1), promptedAt: end.AddMinutes(5)));
    }

    [Fact]
    public void IsRatingPromptDue_PromptedForAnEarlierEnd_TrueAgainOnceANewFilmIsDrawn()
    {
        var firstEnd = SummerStartUtc.AddHours(2);
        var lateDraw = SummerStartUtc.AddDays(3);
        var night = Night(Drawn("m1", 120), Drawn("m2", 120, lateDraw)) with { Config = new EventConfig { WinnerCount = 2 } };

        Assert.True(night.IsRatingPromptDue(lateDraw.AddMinutes(1), promptedAt: firstEnd.AddMinutes(5)));
    }

    [Fact]
    public void IsRatingPromptDue_NoFilmDrawn_False()
    {
        Assert.False(Night().IsRatingPromptDue(SummerStartUtc.AddDays(1), promptedAt: null));
    }

    [Fact]
    public void IsRatingPromptDue_ClosedByTheHostBeforeTheEnd_TrueRightAway()
    {
        var closedAt = SummerStartUtc.AddMinutes(90);
        var night = Night(Drawn("m1", 169)) with { ClosedAt = closedAt };

        Assert.True(night.IsRatingPromptDue(closedAt.AddMinutes(1), promptedAt: null));
    }

    [Theory]
    [InlineData(-1, false)]
    [InlineData(0, true)]
    [InlineData(6, true)]
    [InlineData(7, false)]
    public void HasEndedWithinTheCatchUpWindow_FollowsTheSameEndAndWindowAsThePrompt(int daysAfterTheEnd, bool expected)
    {
        var night = Night(Drawn("m1", 169));
        var end = SummerStartUtc.AddMinutes(169);
        var now = daysAfterTheEnd < 0 ? end.AddMinutes(-1) : end.AddDays(daysAfterTheEnd);

        Assert.Equal(expected, night.HasEndedWithinTheCatchUpWindow(now));
    }
}
