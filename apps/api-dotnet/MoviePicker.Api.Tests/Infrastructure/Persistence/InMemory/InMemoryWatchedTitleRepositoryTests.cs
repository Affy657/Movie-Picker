using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Infrastructure.Persistence.InMemory;
using Xunit;

namespace MoviePicker.Api.Tests.Infrastructure.Persistence.InMemory;

public sealed class InMemoryWatchedTitleRepositoryTests
{
    private static readonly DateTimeOffset Now = new(2026, 11, 13, 20, 0, 0, TimeSpan.Zero);

    private readonly InMemoryWatchedTitleRepository _sut = new();

    private static WatchedTitle Watched(
        int tmdbId,
        string owner = "u1",
        MovieMediaType mediaType = MovieMediaType.Movie,
        DateTimeOffset? watchedAt = null,
        int? rating = null) => new()
        {
            OwnerId = owner,
            TmdbId = tmdbId,
            MediaType = mediaType,
            Title = $"Film {tmdbId}",
            Year = "1999",
            GenreIds = [18],
            WatchedAt = watchedAt ?? Now,
            Rating = rating,
            CreatedAt = watchedAt ?? Now,
            UpdatedAt = watchedAt ?? Now
        };

    [Fact]
    public async Task AddIfAbsentAsync_StoresTheTitleUnderAFreshId()
    {
        var stored = await _sut.AddIfAbsentAsync(Watched(603, rating: 8));

        Assert.False(string.IsNullOrEmpty(stored.Id));
        Assert.Equal(stored, await _sut.GetAsync("u1", 603, MovieMediaType.Movie));
        Assert.Equal(8, stored.Rating);
    }

    [Fact]
    public async Task AddIfAbsentAsync_TheSameTitleAgain_KeepsTheFirstEntry()
    {
        var first = await _sut.AddIfAbsentAsync(Watched(603));

        var again = await _sut.AddIfAbsentAsync(Watched(603, watchedAt: Now.AddDays(1), rating: 3));

        Assert.Equal(first, again);
        Assert.Single(await _sut.ListByOwnerAsync("u1"));
    }

    [Fact]
    public async Task EachOwnerAndMediaType_HasItsOwnEntry()
    {
        await _sut.AddIfAbsentAsync(Watched(1920));
        await _sut.AddIfAbsentAsync(Watched(1920, mediaType: MovieMediaType.Tv));
        await _sut.AddIfAbsentAsync(Watched(1920, owner: "u2"));

        Assert.Equal(2, (await _sut.ListByOwnerAsync("u1")).Count);
        Assert.Single(await _sut.ListByOwnerAsync("u2"));
        Assert.Null(await _sut.GetAsync("u2", 1920, MovieMediaType.Tv));
    }

    [Fact]
    public async Task ListByOwnerAsync_ReturnsTheLatestWatchedFirst()
    {
        await _sut.AddIfAbsentAsync(Watched(1, watchedAt: Now.AddDays(-3)));
        await _sut.AddIfAbsentAsync(Watched(2, watchedAt: Now));
        await _sut.AddIfAbsentAsync(Watched(3, watchedAt: Now.AddDays(-1)));

        var titles = await _sut.ListByOwnerAsync("u1");

        Assert.Equal([2, 3, 1], titles.Select(title => title.TmdbId));
    }

    [Fact]
    public async Task ListTitlesByOwnerAsync_GivesTheTitlesOfThatOwnerOnly()
    {
        await _sut.AddIfAbsentAsync(Watched(1920));
        await _sut.AddIfAbsentAsync(Watched(1920, mediaType: MovieMediaType.Tv));
        await _sut.AddIfAbsentAsync(Watched(603, owner: "u2"));

        var titles = await _sut.ListTitlesByOwnerAsync("u1");

        Assert.Equal(
            [new MovieListTitle(1920, MovieMediaType.Movie), new MovieListTitle(1920, MovieMediaType.Tv)],
            titles.OrderBy(title => title.MediaType));
        Assert.Empty(await _sut.ListTitlesByOwnerAsync("nobody"));
    }

    [Fact]
    public async Task SetRatingAsync_SetsThenClearsTheRating_AndKeepsTheDate()
    {
        await _sut.AddIfAbsentAsync(Watched(603));

        var rated = await _sut.SetRatingAsync("u1", 603, MovieMediaType.Movie, 7, Now.AddHours(1));
        var cleared = await _sut.SetRatingAsync("u1", 603, MovieMediaType.Movie, null, Now.AddHours(2));

        Assert.Equal(7, rated!.Rating);
        Assert.Equal(Now.AddHours(1), rated.UpdatedAt);
        Assert.Null(cleared!.Rating);
        Assert.Equal(Now, cleared.WatchedAt);
        Assert.Null((await _sut.GetAsync("u1", 603, MovieMediaType.Movie))!.Rating);
    }

    [Fact]
    public async Task SetRatingAsync_OnATitleNotWatched_ReturnsNull()
    {
        await _sut.AddIfAbsentAsync(Watched(603, owner: "u2"));

        Assert.Null(await _sut.SetRatingAsync("u1", 603, MovieMediaType.Movie, 7, Now));
        Assert.Null(await _sut.SetRatingAsync("u2", 603, MovieMediaType.Tv, 7, Now));
    }

    [Fact]
    public async Task RemoveAsync_RemovesOnlyThatEntry_ThenReportsNothingRemoved()
    {
        await _sut.AddIfAbsentAsync(Watched(603));
        await _sut.AddIfAbsentAsync(Watched(603, mediaType: MovieMediaType.Tv));

        Assert.True(await _sut.RemoveAsync("u1", 603, MovieMediaType.Movie));
        Assert.False(await _sut.RemoveAsync("u1", 603, MovieMediaType.Movie));
        Assert.Equal(MovieMediaType.Tv, Assert.Single(await _sut.ListByOwnerAsync("u1")).MediaType);
    }

    [Fact]
    public async Task DeleteAllForOwnerAsync_DeletesEveryEntryOfThatOwnerOnly()
    {
        await _sut.AddIfAbsentAsync(Watched(1));
        await _sut.AddIfAbsentAsync(Watched(2));
        await _sut.AddIfAbsentAsync(Watched(1, owner: "u2"));

        Assert.Equal(2, await _sut.DeleteAllForOwnerAsync("u1"));
        Assert.Empty(await _sut.ListByOwnerAsync("u1"));
        Assert.Single(await _sut.ListByOwnerAsync("u2"));
    }

    [Fact]
    public async Task SetRatingAsync_MarksTheRatingAsManual_AndClearingItForgetsWhereItCameFrom()
    {
        await _sut.AddIfAbsentAsync(Watched(603) with
        {
            Origin = WatchedOrigin.Letterboxd,
            Rating = 6,
            RatingOrigin = WatchedOrigin.Letterboxd
        });

        var rated = await _sut.SetRatingAsync("u1", 603, MovieMediaType.Movie, 9, Now);
        var cleared = await _sut.SetRatingAsync("u1", 603, MovieMediaType.Movie, null, Now);

        Assert.Equal((9, WatchedOrigin.Manual, WatchedOrigin.Letterboxd), (rated!.Rating, rated.RatingOrigin, rated.Origin));
        Assert.Equal((null, null), (cleared!.Rating, cleared.RatingOrigin));
    }

    [Theory]
    [InlineData(null, null, 8, true, 8)]
    [InlineData(6, WatchedOrigin.Letterboxd, 8, true, 8)]
    [InlineData(6, WatchedOrigin.Letterboxd, null, true, null)]
    [InlineData(6, WatchedOrigin.Manual, 8, false, 6)]
    [InlineData(6, null, 8, false, 6)]
    public async Task ApplyLetterboxdRatingAsync_ReplacesOnlyALetterboxdRatingOrNone(
        int? current,
        WatchedOrigin? currentOrigin,
        int? fromLetterboxd,
        bool expectedApplied,
        int? expectedRating)
    {
        await _sut.AddIfAbsentAsync(Watched(603, rating: current) with { RatingOrigin = currentOrigin });

        var applied = await _sut.ApplyLetterboxdRatingAsync("u1", 603, MovieMediaType.Movie, fromLetterboxd, Now.AddHours(1));
        var stored = await _sut.GetAsync("u1", 603, MovieMediaType.Movie);

        Assert.Equal(expectedApplied, applied);
        Assert.Equal(expectedRating, stored!.Rating);
        if (expectedApplied)
        {
            Assert.Equal(fromLetterboxd is null ? null : WatchedOrigin.Letterboxd, stored.RatingOrigin);
            Assert.Equal(Now.AddHours(1), stored.UpdatedAt);
        }
    }

    [Fact]
    public async Task LinkLetterboxdAsync_RemembersTheSlugAndKeepsTheOrigin()
    {
        await _sut.AddIfAbsentAsync(Watched(603));

        var linked = await _sut.LinkLetterboxdAsync("u1", 603, MovieMediaType.Movie, "the-matrix");
        var missing = await _sut.LinkLetterboxdAsync("u1", 604, MovieMediaType.Movie, "the-matrix-reloaded");
        var stored = await _sut.GetAsync("u1", 603, MovieMediaType.Movie);

        Assert.True(linked);
        Assert.False(missing);
        Assert.Equal(("the-matrix", WatchedOrigin.Manual), (stored!.LetterboxdSlug, stored.Origin));
    }

    [Fact]
    public async Task RemoveFromLetterboxdAsync_RemovesOnlyTheOwnersEntriesThatCameFromLetterboxd()
    {
        var matrix = await _sut.AddIfAbsentAsync(Watched(603) with { Origin = WatchedOrigin.Letterboxd, LetterboxdSlug = "the-matrix" });
        var akira = await _sut.AddIfAbsentAsync(Watched(149) with { Origin = WatchedOrigin.Letterboxd, LetterboxdSlug = "akira" });
        var pulpFiction = await _sut.AddIfAbsentAsync(Watched(680) with { LetterboxdSlug = "pulp-fiction" });
        var someoneElses = await _sut.AddIfAbsentAsync(Watched(603, owner: "u2") with { Origin = WatchedOrigin.Letterboxd });

        var removed = await _sut.RemoveFromLetterboxdAsync("u1", [matrix.Id, akira.Id, pulpFiction.Id, someoneElses.Id]);

        Assert.Equal(2, removed);
        Assert.Equal(680, Assert.Single(await _sut.ListByOwnerAsync("u1")).TmdbId);
        Assert.Single(await _sut.ListByOwnerAsync("u2"));
        Assert.Equal(0, await _sut.RemoveFromLetterboxdAsync("u1", []));
    }

    [Fact]
    public async Task CountFromLetterboxdAsync_CountsTheOwnersLetterboxdEntriesOnly()
    {
        await _sut.AddIfAbsentAsync(Watched(1) with { Origin = WatchedOrigin.Letterboxd });
        await _sut.AddIfAbsentAsync(Watched(2) with { Origin = WatchedOrigin.Letterboxd });
        await _sut.AddIfAbsentAsync(Watched(3) with { LetterboxdSlug = "three" });
        await _sut.AddIfAbsentAsync(Watched(1, owner: "u2") with { Origin = WatchedOrigin.Letterboxd });

        Assert.Equal(2, await _sut.CountFromLetterboxdAsync("u1"));
    }
}
