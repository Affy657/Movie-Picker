using MoviePicker.Api.Domain;
using MoviePicker.Api.Domain.Entities;
using Xunit;

namespace MoviePicker.Api.Tests.Domain;

public sealed class WheelWinnerPickerTests
{
    private static Movie M(string id, string title) => new()
    {
        Id = id,
        EventId = "e1",
        ParticipantId = "p1",
        TmdbId = 1,
        Title = title,
        Year = "2020",
        CreatedAt = DateTimeOffset.UtcNow,
        UpdatedAt = DateTimeOffset.UtcNow
    };

    [Fact]
    public void Pick_StrictRandom_UsesRandom()
    {
        var movies = new[] { M("a", "A"), M("b", "B") };
        var random = new Random(42);
        var w = WheelWinnerPicker.Pick(movies, _ => 0, WheelMode.StrictRandom, random);
        Assert.Contains(w.Id, new[] { "a", "b" });
    }

    [Fact]
    public void Pick_Weighted_EqualScores_StillReturnsOneOfTheMovies()
    {
        var movies = new[] { M("a", "A"), M("b", "B") };
        var w = WheelWinnerPicker.Pick(movies, _ => 0, WheelMode.WeightedByVotes, new Random(123));
        Assert.Contains(w.Id, new[] { "a", "b" });
    }

    [Fact]
    public void Pick_Weighted_FavorsHigherScore()
    {
        var movies = new[] { M("low", "L"), M("high", "H") };
        var random = new Random(0);
        var picked = new Dictionary<string, int>(StringComparer.Ordinal);
        for (var i = 0; i < 200; i++)
        {
            var w = WheelWinnerPicker.Pick(
                movies,
                id => id == "high" ? 10 : 0,
                WheelMode.WeightedByVotes,
                random);
            picked[w.Id] = picked.GetValueOrDefault(w.Id) + 1;
        }

        Assert.True(picked.GetValueOrDefault("high") > picked.GetValueOrDefault("low"));
    }
}
