using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using MoviePicker.Api.Application.Caching;
using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.GetMovieShowcase;
using MoviePicker.Api.Application.UseCases.PublicLists;
using MoviePicker.Api.Application.UseCases.SavedLists;
using MoviePicker.Api.Application.UseCases.UserMovies;
using MoviePicker.Api.Configuration;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Domain.Exceptions;
using MoviePicker.Api.Infrastructure.Persistence.InMemory;
using MoviePicker.Api.Tests.UseCases.MovieLists;

namespace MoviePicker.Api.Tests.UseCases.SavedLists;

internal sealed class SavedListTestKit
{
    public const string Owner = MovieListTestKit.Owner;
    public const string Stranger = MovieListTestKit.Stranger;
    public const int HarryPotter = 1241;
    public const string HarryPotterName = "Harry Potter - Saga";
    public const string Frissons = "frissons";

    public static readonly DateTimeOffset Start = MovieListTestKit.Start;

    private readonly MemoryCache _cache = new(new MemoryCacheOptions());

    public SavedListTestKit()
    {
        MovieLists.Posters
            .Setup(p => p.ToPublicPosterPath(It.IsAny<string?>()))
            .Returns((string? path) => path is null ? null : PublicPoster(path));
        Showcase
            .Setup(s => s.HandleAsync(It.IsAny<MovieShowcaseQuery>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(Errors.ShowcaseUnavailable());
        Tmdb
            .Setup(t => t.GetCollectionAsync(It.IsAny<int>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((TmdbCollectionSummary?)null);
        WatchedReads
            .Setup(w => w.ListTitlesByOwnerAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .Returns((string ownerId, CancellationToken ct) => MovieLists.Watching.Watched.ListTitlesByOwnerAsync(ownerId, ct));
    }

    public MovieListTestKit MovieLists { get; } = new();

    public InMemorySavedListRepository Saved { get; } = new();

    public Mock<IGetMovieShowcaseHandler> Showcase { get; } = new();

    public Mock<ITmdbMovieSearch> Tmdb => MovieLists.Tmdb;

    public Mock<IWatchedTitleRepository> WatchedReads { get; } = new();

    public MoviePickerOptions Options { get; } = new() { TmdbApiKey = "test-key" };

    public SteppingClock Clock => MovieLists.Clock;

    public WatchedHistoryReader History
    {
        get
        {
            var watching = MovieLists.Watching;
            return new(watching.Participants, watching.Events, watching.Movies, watching.Ratings, WatchedReads.Object, Clock);
        }
    }

    public ListSourceReader Reader(PublicListReader? publicLists = null, ILogger<ListSourceReader>? logger = null) => new(
        Showcase.Object,
        Tmdb.Object,
        MovieLists.Posters.Object,
        new SharedCacheReadThrough(_cache, Mock.Of<ISharedCache>(), new SingleFlight()),
        Microsoft.Extensions.Options.Options.Create(Options),
        publicLists ?? PublicLists(),
        Saved,
        logger ?? NullLogger<ListSourceReader>.Instance);

    public PublicListReader PublicLists() => new(MovieLists.Lists, MovieLists.Users);

    public ListPublicListsHandler ListPublicHandler() => new(MovieLists.Users, MovieLists.Lists, History);

    public GetPublicListHandler GetPublicHandler() => new(PublicLists(), History);

    public CopyPublicListHandler CopyPublicHandler() => new(PublicLists(), MovieLists.Lists, History, MovieLists.Users, Clock);

    public ListSavedListsHandler ListHandler() => new(Saved, Reader(), History);

    public SaveListHandler SaveHandler() => new(Saved, Reader(), History, Clock);

    public GetSavedListHandler GetHandler() => new(Saved, Reader(), History);

    public UnsaveListHandler UnsaveHandler() => new(Saved);

    public CopySavedListHandler CopyHandler() => new(Saved, MovieLists.Lists, Reader(), History, MovieLists.Users, Clock);

    public void SagaHas(int collectionId, string name, params MovieShowcaseItemResponse[] films)
    {
        Tmdb
            .Setup(t => t.GetCollectionAsync(collectionId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new TmdbCollectionSummary(collectionId, name, null, null, films.Length, []));
        SagaFilmsAre(collectionId, films);
    }

    public void SagaFilmsAre(int collectionId, params MovieShowcaseItemResponse[] films) =>
        Showcase
            .Setup(s => s.HandleAsync(
                It.Is<MovieShowcaseQuery>(q => q.Section == MovieShowcaseSections.Collection && q.CollectionId == collectionId),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(new MovieShowcaseListResponse { Section = MovieShowcaseSections.Collection, Items = films });

    public void ThemeHas(string theme, params MovieShowcaseItemResponse[] films) =>
        Showcase
            .Setup(s => s.HandleAsync(
                It.Is<MovieShowcaseQuery>(q => q.Section == MovieShowcaseSections.Theme && q.Theme == theme),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(new MovieShowcaseListResponse { Section = MovieShowcaseSections.Theme, Theme = theme, Items = films });

    public void SagaFails(int collectionId, Exception failure) =>
        Showcase
            .Setup(s => s.HandleAsync(
                It.Is<MovieShowcaseQuery>(q => q.Section == MovieShowcaseSections.Collection && q.CollectionId == collectionId),
                It.IsAny<CancellationToken>()))
            .ThrowsAsync(failure);

    public void VerifySourceReads(Times times) =>
        Showcase.Verify(s => s.HandleAsync(It.IsAny<MovieShowcaseQuery>(), It.IsAny<CancellationToken>()), times);

    public async Task<SavedListSummaryResponse> SaveAsync(ListSourceType type, string sourceId, string owner = Owner) =>
        (await SaveHandler().HandleAsync(owner, Request(type, sourceId))).Summary;

    public Task<SavedListSummaryResponse> SaveSagaAsync(string owner = Owner) =>
        SaveAsync(ListSourceType.TmdbCollection, HarryPotter.ToString(System.Globalization.CultureInfo.InvariantCulture), owner);

    public Task<SavedList> SavedSagaAsync(string fallbackName, string owner = Owner) =>
        Saved.AddIfAbsentAsync(new SavedList
        {
            OwnerId = owner,
            SourceType = ListSourceType.TmdbCollection,
            SourceId = "1241",
            Name = fallbackName,
            CreatedAt = Start
        });

    public Task<WatchedTitle> WatchElsewhereAsync(int tmdbId, string owner = Owner) =>
        MovieLists.WatchElsewhereAsync(tmdbId, owner: owner);

    public static SaveListRequest Request(ListSourceType type, string sourceId) =>
        new() { SourceType = TypeName(type), SourceId = sourceId };

    public static string TypeName(ListSourceType type) => ListSourceNames.Of(type);

    public static MovieShowcaseItemResponse Film(
        int tmdbId,
        string? posterPath = null,
        MovieMediaType mediaType = MovieMediaType.Movie) => new()
        {
            Id = tmdbId,
            MediaType = mediaType,
            Title = $"Film {tmdbId}",
            Year = "2001",
            PosterPath = posterPath,
            VoteAverage = 7.5,
            RuntimeMinutes = 152,
            GenreIds = [12, 14]
        };

    public static string TmdbPoster(int tmdbId) => $"https://image.tmdb.org/t/p/w500/poster-{tmdbId}.jpg";

    public static string PublicPoster(string path) => $"/public{path}";

    public static MovieShowcaseItemResponse[] HarryPotterFilms() =>
    [
        Film(671, TmdbPoster(671)),
        Film(672),
        Film(673, TmdbPoster(673)),
        Film(674, TmdbPoster(674)),
        Film(675, TmdbPoster(675))
    ];
}
