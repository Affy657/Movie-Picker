using System.Text.Json;
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

    private static readonly string[] collection = new[] { "a", "b" };

    private static readonly JsonSerializerOptions SharedCasesJson = new() { PropertyNameCaseInsensitive = true };

    private sealed record SharedWeightCase(string Mode, int[] Scores, int[] Weights);

    private sealed record SharedWeightCases(SharedWeightCase[] Cases);

    private sealed class FixedRandom(int value) : Random
    {
        public int? LastMaxValue { get; private set; }

        public override int Next(int maxValue)
        {
            LastMaxValue = maxValue;
            return value;
        }
    }

    public static TheoryData<string, int[], int[]> SharedWheelWeights()
    {
        var path = Path.Combine(AppContext.BaseDirectory, "Domain", "wheel-slice-weights.json");
        var shared = JsonSerializer.Deserialize<SharedWeightCases>(File.ReadAllText(path), SharedCasesJson)!;
        var data = new TheoryData<string, int[], int[]>();
        foreach (var weightCase in shared.Cases)
            data.Add(weightCase.Mode, weightCase.Scores, weightCase.Weights);
        return data;
    }

    [Theory]
    [MemberData(nameof(SharedWheelWeights))]
    public void Pick_GivesEachMovieTheShareTheWheelDraws(string mode, int[] scores, int[] weights)
    {
        var movies = scores.Select((_, index) => M($"m{index}", $"Movie {index}")).ToArray();
        var scoreOf = movies
            .Select((movie, index) => (movie.Id, Score: scores[index]))
            .ToDictionary(entry => entry.Id, entry => entry.Score, StringComparer.Ordinal);
        var wheelMode = Enum.Parse<WheelMode>(mode, ignoreCase: true);
        var total = weights.Sum();
        var picks = new int[movies.Length];

        for (var roll = 0; roll < total; roll++)
        {
            var random = new FixedRandom(roll);
            var picked = WheelWinnerPicker.Pick(movies, id => scoreOf[id], wheelMode, random);
            picks[Array.IndexOf(movies, picked)]++;
            Assert.Equal(wheelMode == WheelMode.StrictRandom ? movies.Length : total, random.LastMaxValue);
        }

        Assert.Equal(weights, picks);
    }

    [Fact]
    public void Pick_StrictRandom_UsesRandom()
    {
        var movies = new[] { M("a", "A"), M("b", "B") };
        var random = new Random(42);
        var w = WheelWinnerPicker.Pick(movies, _ => 0, WheelMode.StrictRandom, random);
        Assert.Contains(w.Id, collection);
    }

    [Fact]
    public void Pick_Weighted_EqualScores_StillReturnsOneOfTheMovies()
    {
        var movies = new[] { M("a", "A"), M("b", "B") };
        var w = WheelWinnerPicker.Pick(movies, _ => 0, WheelMode.WeightedByVotes, new Random(123));
        Assert.Contains(w.Id, collection);
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

    [Fact]
    public void Pick_StrictRandom_ExcludesPreviousWinner_WhenOtherCandidatesExist()
    {
        var movies = new[] { M("a", "A"), M("b", "B"), M("c", "C") };
        var random = new Random(7);

        for (var i = 0; i < 50; i++)
        {
            var w = WheelWinnerPicker.Pick(movies, _ => 0, WheelMode.StrictRandom, random, excludedMovieIds: ["a"]);
            Assert.NotEqual("a", w.Id);
        }
    }

    [Fact]
    public void Pick_Weighted_ExcludesPreviousWinner_WhenOtherCandidatesExist()
    {
        var movies = new[] { M("a", "A"), M("b", "B"), M("c", "C") };
        var random = new Random(11);

        for (var i = 0; i < 50; i++)
        {
            var w = WheelWinnerPicker.Pick(
                movies,
                id => id == "a" ? 100 : 0,
                WheelMode.WeightedByVotes,
                random,
                excludedMovieIds: ["a"]);
            Assert.NotEqual("a", w.Id);
        }
    }

    [Fact]
    public void Pick_EveryCandidateAlreadyWon_Throws()
    {
        var movies = new[] { M("only", "Only") };

        Assert.Throws<InvalidOperationException>(() =>
            WheelWinnerPicker.Pick(
                movies,
                _ => 0,
                WheelMode.StrictRandom,
                new Random(0),
                excludedMovieIds: ["only"]));
    }

    [Fact]
    public void Pick_ExcludesEveryPreviousWinner_NotOnlyTheLast()
    {
        var movies = new[] { M("a", "A"), M("b", "B"), M("c", "C") };
        var random = new Random(13);

        for (var i = 0; i < 50; i++)
        {
            var w = WheelWinnerPicker.Pick(
                movies,
                _ => 0,
                WheelMode.StrictRandom,
                random,
                excludedMovieIds: ["a", "b"]);
            Assert.Equal("c", w.Id);
        }
    }

    [Fact]
    public void Pick_Weighted_ExcludesEveryPreviousWinner_EvenTheBestScored()
    {
        var movies = new[] { M("a", "A"), M("b", "B"), M("c", "C") };
        var random = new Random(17);

        for (var i = 0; i < 50; i++)
        {
            var w = WheelWinnerPicker.Pick(
                movies,
                id => id == "c" ? 0 : 100,
                WheelMode.WeightedByVotes,
                random,
                excludedMovieIds: ["a", "b"]);
            Assert.Equal("c", w.Id);
        }
    }

    [Fact]
    public void Pick_IgnoresBlankIdsInTheExclusionList()
    {
        var movies = new[] { M("a", "A") };

        var w = WheelWinnerPicker.Pick(
            movies,
            _ => 0,
            WheelMode.StrictRandom,
            new Random(0),
            excludedMovieIds: ["", "   "]);

        Assert.Equal("a", w.Id);
    }

    [Fact]
    public void Pick_NeverPicksMovieExcludedFromWheel()
    {
        var movies = new[] { M("a", "A") with { ExcludedFromWheel = true }, M("b", "B"), M("c", "C") };
        var random = new Random(3);

        for (var i = 0; i < 50; i++)
        {
            var w = WheelWinnerPicker.Pick(movies, _ => 0, WheelMode.StrictRandom, random);
            Assert.NotEqual("a", w.Id);
        }
    }

    [Fact]
    public void Pick_Weighted_NeverPicksMovieExcludedFromWheel_EvenWithHighestScore()
    {
        var movies = new[] { M("a", "A") with { ExcludedFromWheel = true }, M("b", "B"), M("c", "C") };
        var random = new Random(5);

        for (var i = 0; i < 50; i++)
        {
            var w = WheelWinnerPicker.Pick(movies, id => id == "a" ? 100 : 0, WheelMode.WeightedByVotes, random);
            Assert.NotEqual("a", w.Id);
        }
    }

    [Fact]
    public void Pick_LastEligibleMovieAlreadyWon_Throws()
    {
        var movies = new[] { M("a", "A") with { ExcludedFromWheel = true }, M("b", "B") };

        Assert.Throws<InvalidOperationException>(() =>
            WheelWinnerPicker.Pick(
                movies,
                _ => 0,
                WheelMode.StrictRandom,
                new Random(0),
                excludedMovieIds: ["b"]));
    }

    [Fact]
    public void Pick_ReturnsOnlyEligibleMovie_WhenAllOthersAreExcluded()
    {
        var movies = new[] { M("a", "A") with { ExcludedFromWheel = true }, M("b", "B") };
        var w = WheelWinnerPicker.Pick(movies, _ => 0, WheelMode.StrictRandom, new Random(0));
        Assert.Equal("b", w.Id);
    }

    [Fact]
    public void Pick_AllMoviesExcluded_Throws()
    {
        var movies = new[] { M("a", "A") with { ExcludedFromWheel = true }, M("b", "B") with { ExcludedFromWheel = true } };
        Assert.Throws<InvalidOperationException>(() =>
            WheelWinnerPicker.Pick(movies, _ => 0, WheelMode.StrictRandom, new Random(0)));
    }
}
