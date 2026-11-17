using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.MovieLists;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Domain.Exceptions;
using Xunit;
using static MoviePicker.Api.Tests.UseCases.MovieLists.MovieListTestKit;

namespace MoviePicker.Api.Tests.UseCases.MovieLists;

public sealed class AddMovieListItemHandlerTests
{
    private static readonly int[] DetailGenres = [28, 878];
    private static readonly int[] SearchResultGenres = [878, 0, 28, 878];
    private static readonly int[] SanitizedSearchResultGenres = [878, 28];

    private readonly MovieListTestKit _kit = new();

    private static TmdbMovieDetails MatrixDetails(int? runtime = 136, double? vote = 8.2, string? poster = null) =>
        new(603, "Matrix", null, null, null, [], runtime, [], DetailGenres, "1999-03-31", VoteAverage: vote, PosterUrl: poster);

    private async Task<MovieList> StoredAsync(string listId) => (await _kit.Lists.GetAsync(Owner, listId))!;

    [Fact]
    public async Task HandleAsync_NewTitle_IsCreated_AppendedLast_AndBumpsUpdatedAt()
    {
        var list = await _kit.CreateAsync("Films cultes", firstItem: Title(680));
        _kit.Clock.Advance(TimeSpan.FromMinutes(3));

        var added = await _kit.AddAsync(list.Id, Title(603, Poster(603), title: "  Matrix "));

        Assert.True(added.Created);
        Assert.Equal(603, added.Item.TmdbId);
        Assert.Equal("Matrix", added.Item.Title);
        Assert.Equal(Poster(603), added.Item.PosterPath);
        Assert.Equal(_kit.Clock.Now, added.Item.CreatedAt);
        var stored = await StoredAsync(list.Id);
        Assert.Equal([680, 603], stored.Items.Select(item => item.TmdbId));
        Assert.Equal(_kit.Clock.Now, stored.UpdatedAt);
    }

    [Fact]
    public async Task HandleAsync_SubMillisecondClock_StoresDatesAtTheDatabasePrecision()
    {
        var list = await _kit.CreateAsync("Films cultes");
        _kit.Clock.Advance(TimeSpan.FromTicks(1_234_567));
        var expected = new DateTimeOffset(_kit.Clock.Now.Ticks - (_kit.Clock.Now.Ticks % TimeSpan.TicksPerMillisecond), TimeSpan.Zero);

        var added = await _kit.AddAsync(list.Id, Title(603));

        Assert.Equal(expected, added.Item.CreatedAt);
        var stored = await StoredAsync(list.Id);
        Assert.Equal(expected, stored.Items.Single().AddedAt);
        Assert.Equal(expected, stored.UpdatedAt);
    }

    [Fact]
    public async Task HandleAsync_TitleAlreadyInTheList_ReturnsTheExistingOne_WithoutDuplicateNorUpdate()
    {
        var list = await _kit.CreateAsync("Films cultes", firstItem: Title(603, Poster(603), title: "Matrix"));
        _kit.Clock.Advance(TimeSpan.FromMinutes(3));

        var again = await _kit.AddAsync(list.Id, Title(603, title: "Matrix (doublon)"));

        Assert.False(again.Created);
        Assert.Equal("Matrix", again.Item.Title);
        Assert.Equal(Start, again.Item.CreatedAt);
        var stored = await StoredAsync(list.Id);
        Assert.Single(stored.Items);
        Assert.Equal(Start, stored.UpdatedAt);
        _kit.Tmdb.Verify(
            t => t.GetDetailsAsync(It.IsAny<int>(), It.IsAny<MovieMediaType>(), It.IsAny<CancellationToken>()),
            Times.Once);
    }

    [Fact]
    public async Task HandleAsync_SameIdAsASeries_IsADistinctTitle()
    {
        var list = await _kit.CreateAsync("Mélange", firstItem: Title(1920));

        var added = await _kit.AddAsync(list.Id, Title(1920, mediaType: MovieMediaType.Tv));

        Assert.True(added.Created);
        Assert.Equal(2, (await StoredAsync(list.Id)).Items.Count);
    }

    [Fact]
    public async Task HandleAsync_ListHoldingFiveHundredTitles_IsFull_ButStillAnswersForATitleItHolds()
    {
        var full = await _kit.Lists.AddAsync(new MovieList
        {
            OwnerId = Owner,
            Name = "Pleine",
            Items = [.. Enumerable.Range(1, MovieList.MaxItems).Select(id => new MovieListItem { TmdbId = id, Title = $"Film {id}" })],
            CreatedAt = Start,
            UpdatedAt = Start
        });

        var ex = await Assert.ThrowsAsync<ConflictException>(() => _kit.AddAsync(full.Id, Title(MovieList.MaxItems + 1)));
        var held = await _kit.AddAsync(full.Id, Title(42));

        Assert.Equal(ErrorCodes.ListFull, ex.Reason);
        Assert.False(held.Created);
        Assert.Equal(MovieList.MaxItems, (await StoredAsync(full.Id)).Items.Count);
    }

    [Fact]
    public async Task HandleAsync_FirstItemCountsTowardsTheLimit()
    {
        var list = await _kit.CreateAsync("Presque pleine", firstItem: Title(1));
        for (var id = 2; id <= MovieList.MaxItems; id++)
            await _kit.AddAsync(list.Id, Title(id));

        var ex = await Assert.ThrowsAsync<ConflictException>(() => _kit.AddAsync(list.Id, Title(MovieList.MaxItems + 1)));

        Assert.Equal(ErrorCodes.ListFull, ex.Reason);
    }

    [Fact]
    public async Task HandleAsync_SomeoneElsesList_IsNotFound()
    {
        var foreign = await _kit.CreateAsync("Films cultes", owner: Stranger);

        var ex = await Assert.ThrowsAsync<NotFoundException>(() => _kit.AddAsync(foreign.Id, Title(603)));

        Assert.Equal(ErrorCodes.ListNotFound, ex.Reason);
        Assert.Empty((await _kit.Lists.GetAsync(Stranger, foreign.Id))!.Items);
    }

    [Fact]
    public async Task HandleAsync_TakesTheMissingFactsGenresAndPosterFromTmdb()
    {
        _kit.Tmdb
            .Setup(t => t.GetDetailsAsync(603, MovieMediaType.Movie, It.IsAny<CancellationToken>()))
            .ReturnsAsync(MatrixDetails(poster: Poster(603)));
        var list = await _kit.CreateAsync("Films cultes");

        var added = await _kit.AddAsync(list.Id, Title(603, genreIds: SearchResultGenres, runtimeMinutes: 0));

        Assert.Equal(136, added.Item.RuntimeMinutes);
        Assert.Equal(8.2, added.Item.VoteAverage);
        Assert.Equal(DetailGenres, added.Item.GenreIds);
        Assert.Equal(Poster(603), added.Item.PosterPath);
    }

    [Fact]
    public async Task HandleAsync_PrefersTheTmdbFacts_ButKeepsThePosterOfTheRequest()
    {
        _kit.Tmdb
            .Setup(t => t.GetDetailsAsync(603, MovieMediaType.Movie, It.IsAny<CancellationToken>()))
            .ReturnsAsync(MatrixDetails(runtime: 150, vote: 7.0, poster: Poster(999)));
        var list = await _kit.CreateAsync("Films cultes");

        var added = await _kit.AddAsync(list.Id, Title(603, Poster(603), runtimeMinutes: 136, voteAverage: 8.3));

        Assert.Equal(150, added.Item.RuntimeMinutes);
        Assert.Equal(7.0, added.Item.VoteAverage);
        Assert.Equal(Poster(603), added.Item.PosterPath);
    }

    [Fact]
    public async Task HandleAsync_StoresTheTitleYearRatingAndRuntimeOfTmdb_NotThoseTheClientSent()
    {
        _kit.Tmdb
            .Setup(t => t.GetDetailsAsync(550, MovieMediaType.Movie, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new TmdbMovieDetails(550, "Fight Club", null, null, null, [], 139, [], [18], "1999-10-15", VoteAverage: 8.4));
        var list = await _kit.CreateAsync("Films cultes");
        var forged = new AddWatchlistItemRequest { TmdbId = 550, Title = "Faux titre", Year = "1066", RuntimeMinutes = 1, VoteAverage = 0.5 };

        var added = await _kit.AddAsync(list.Id, forged);

        var stored = (await StoredAsync(list.Id)).Items.Single();
        Assert.Equal(("Fight Club", "1999", (double?)8.4, (int?)139), (stored.Title, stored.Year, stored.VoteAverage, stored.RuntimeMinutes));
        Assert.Equal("Fight Club", added.Item.Title);
    }

    [Fact]
    public async Task HandleAsync_TmdbWithoutReleaseDateNorFacts_FallsBackOnTheRequest()
    {
        _kit.Tmdb
            .Setup(t => t.GetDetailsAsync(550, MovieMediaType.Movie, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new TmdbMovieDetails(550, " ", null, null, null, [], null, [], [18], null));
        var list = await _kit.CreateAsync("Films cultes");

        var added = await _kit.AddAsync(list.Id, Title(550, title: " Fight Club ", runtimeMinutes: 139, voteAverage: 8.4));

        Assert.Equal(("Fight Club", "1999", (double?)8.4, (int?)139), (added.Item.Title, added.Item.Year, added.Item.VoteAverage, added.Item.RuntimeMinutes));
    }

    [Fact]
    public async Task HandleAsync_TmdbDown_KeepsTheTitleYearAndFactsOfTheRequest()
    {
        _kit.Tmdb
            .Setup(t => t.GetDetailsAsync(It.IsAny<int>(), It.IsAny<MovieMediaType>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new HttpRequestException("TMDB unavailable"));
        var list = await _kit.CreateAsync("Films cultes");

        var added = await _kit.AddAsync(list.Id, Title(550, title: "Fight Club", runtimeMinutes: 139, voteAverage: 8.4));

        Assert.Equal(("Fight Club", "1999", (double?)8.4, (int?)139), (added.Item.Title, added.Item.Year, added.Item.VoteAverage, added.Item.RuntimeMinutes));
    }

    [Fact]
    public async Task HandleAsync_TmdbDown_KeepsTheSearchResultGenres()
    {
        _kit.Tmdb
            .Setup(t => t.GetDetailsAsync(It.IsAny<int>(), It.IsAny<MovieMediaType>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new HttpRequestException("TMDB unavailable"));
        var list = await _kit.CreateAsync("Films cultes");

        var added = await _kit.AddAsync(list.Id, Title(603, genreIds: SearchResultGenres));

        Assert.True(added.Created);
        Assert.Equal(SanitizedSearchResultGenres, added.Item.GenreIds);
        Assert.Null(added.Item.PosterPath);
    }

    [Theory]
    [InlineData("https://collect.attacker.example/pixel.png")]
    [InlineData("http://image.tmdb.org/t/p/w500/a.jpg")]
    public async Task HandleAsync_PosterOutsideTmdb_IsRefused(string posterPath)
    {
        var list = await _kit.CreateAsync("Films cultes");

        var ex = await Assert.ThrowsAsync<BadRequestException>(() => _kit.AddAsync(list.Id, Title(603, posterPath)));

        Assert.Equal(ErrorCodes.InvalidPosterPath, ex.Reason);
        Assert.Empty((await StoredAsync(list.Id)).Items);
    }

    [Fact]
    public async Task HandleAsync_TitleAddedConcurrently_ReturnsTheOneThatWon()
    {
        var empty = new MovieList { Id = "l1", OwnerId = Owner, Name = "Films cultes" };
        var winner = new MovieListItem { TmdbId = 603, Title = "Matrix", AddedAt = Start.AddSeconds(-1) };
        var lists = new Mock<IMovieListRepository>();
        lists.SetupSequence(r => r.GetAsync(Owner, "l1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(empty)
            .ReturnsAsync(empty with { Items = [winner] });
        lists.Setup(r => r.AddItemAsync(Owner, "l1", It.IsAny<MovieListItem>(), MovieList.MaxItems, It.IsAny<CancellationToken>()))
            .ReturnsAsync(false);

        var added = await new AddMovieListItemHandler(lists.Object, _kit.Items, _kit.History, _kit.Users, _kit.Clock).HandleAsync(Owner, "l1", Title(603));

        Assert.False(added.Created);
        Assert.Equal(winner.AddedAt, added.Item.CreatedAt);
    }

    [Fact]
    public async Task HandleAsync_ListChangedUnderneathWithoutTheTitle_AsksToRetry()
    {
        var empty = new MovieList { Id = "l1", OwnerId = Owner, Name = "Films cultes" };
        var lists = new Mock<IMovieListRepository>();
        lists.Setup(r => r.GetAsync(Owner, "l1", It.IsAny<CancellationToken>())).ReturnsAsync(empty);
        lists.Setup(r => r.AddItemAsync(Owner, "l1", It.IsAny<MovieListItem>(), MovieList.MaxItems, It.IsAny<CancellationToken>()))
            .ReturnsAsync(false);
        var handler = new AddMovieListItemHandler(lists.Object, _kit.Items, _kit.History, _kit.Users, _kit.Clock);

        var ex = await Assert.ThrowsAsync<ConflictException>(() => handler.HandleAsync(Owner, "l1", Title(603)));

        Assert.Equal(ErrorCodes.ConcurrentUpdate, ex.Reason);
    }

    [Fact]
    public async Task Factory_UsesTheGivenDateAsTheAdditionDate()
    {
        var factory = new MovieListItemFactory(_kit.Posters.Object, _kit.Tmdb.Object, NullLogger<MovieListItemFactory>.Instance);

        var item = await factory.CreateAsync(Title(603), Start.AddDays(2));

        Assert.Equal(Start.AddDays(2), item.AddedAt);
        Assert.Equal(MovieMediaType.Movie, item.MediaType);
        Assert.Equal("1999", item.Year);
    }
}

public sealed class RemoveMovieListItemHandlerTests
{
    private readonly MovieListTestKit _kit = new();

    private Task RemoveAsync(string listId, int tmdbId, MovieMediaType mediaType = MovieMediaType.Movie, string owner = Owner) =>
        _kit.RemoveItemHandler().HandleAsync(owner, listId, new MovieListTitle(tmdbId, mediaType));

    [Fact]
    public async Task HandleAsync_RemovesTheTitle_AndBumpsUpdatedAt()
    {
        var list = await _kit.CreateAsync("Films cultes", firstItem: Title(603));
        await _kit.AddAsync(list.Id, Title(680));
        _kit.Clock.Advance(TimeSpan.FromMinutes(7));

        await RemoveAsync(list.Id, 603);

        var stored = (await _kit.Lists.GetAsync(Owner, list.Id))!;
        Assert.Equal([680], stored.Items.Select(item => item.TmdbId));
        Assert.Equal(_kit.Clock.Now, stored.UpdatedAt);
    }

    [Fact]
    public async Task HandleAsync_TitleNotInTheList_ChangesNothing()
    {
        var list = await _kit.CreateAsync("Films cultes", firstItem: Title(603));
        _kit.Clock.Advance(TimeSpan.FromMinutes(7));

        await RemoveAsync(list.Id, 603, MovieMediaType.Tv);
        await RemoveAsync(list.Id, 680);

        var stored = (await _kit.Lists.GetAsync(Owner, list.Id))!;
        Assert.Single(stored.Items);
        Assert.Equal(Start, stored.UpdatedAt);
    }

    [Fact]
    public async Task HandleAsync_SomeoneElsesList_IsNotFound_AndKeepsItsTitles()
    {
        var foreign = await _kit.CreateAsync("Films cultes", owner: Stranger, firstItem: Title(603));

        var ex = await Assert.ThrowsAsync<NotFoundException>(() => RemoveAsync(foreign.Id, 603));

        Assert.Equal(ErrorCodes.ListNotFound, ex.Reason);
        Assert.Single((await _kit.Lists.GetAsync(Stranger, foreign.Id))!.Items);
    }

    [Fact]
    public async Task HandleAsync_UnknownList_IsNotFound()
    {
        var ex = await Assert.ThrowsAsync<NotFoundException>(() => RemoveAsync("missing", 603));

        Assert.Equal(ErrorCodes.ListNotFound, ex.Reason);
    }
}
