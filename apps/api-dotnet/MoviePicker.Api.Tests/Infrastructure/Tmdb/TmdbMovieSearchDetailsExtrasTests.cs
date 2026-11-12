using System.Net;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Moq;
using Moq.Protected;
using MoviePicker.Api.Application.Caching;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Configuration;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Infrastructure.Persistence.InMemory;
using MoviePicker.Api.Infrastructure.Tmdb;
using Xunit;

namespace MoviePicker.Api.Tests.Infrastructure.Tmdb;

public sealed class TmdbMovieSearchDetailsExtrasTests
{
    private static readonly string GeneratedCast = string.Join(
        ",",
        Enumerable.Range(3, 20).Select(i =>
            $$"""{"id":{{i}},"name":"Actor {{i}}","character":"Role {{i}}","profile_path":"/actor-{{i}}.jpg","order":{{i - 1}}}"""));

    private static readonly string InceptionJson = $$"""
        {
          "id": 27205,
          "title": "Inception",
          "original_title": "Inception (original)",
          "original_language": "en",
          "overview": "Un voleur qui explore les rêves.",
          "runtime": 148,
          "release_date": "2010-07-15",
          "budget": 160000000,
          "vote_average": 8.4,
          "vote_count": 37112,
          "poster_path": "/inception.jpg",
          "backdrop_path": "/inception-wide.jpg",
          "belongs_to_collection": { "id": 1241, "name": "Inception, la saga", "poster_path": "/saga.jpg" },
          "production_countries": [
            { "iso_3166_1": "GB", "name": "United Kingdom" },
            { "iso_3166_1": "US", "name": "United States of America" }
          ],
          "origin_country": ["CA"],
          "genres": [{ "id": 28, "name": "Action" }],
          "credits": {
            "cast": [
              { "id": 1, "name": "Leonardo DiCaprio", "character": "Cobb", "profile_path": "/leo.jpg", "order": 0 },
              { "id": 2, "name": "Elliot Page", "character": "", "profile_path": null, "order": 1 },
              {{GeneratedCast}}
            ],
            "crew": [
              { "id": 900, "job": "Editor", "name": "Lee Smith" },
              { "id": 525, "job": "Director", "name": "Christopher Nolan" },
              { "id": 526, "job": "Director", "name": "Second Unit Director" },
              { "id": 525, "job": "Screenplay", "name": "Christopher Nolan" },
              { "id": 600, "job": "Novel", "name": "Writer Two" },
              { "id": 525, "job": "Writer", "name": "Christopher Nolan" },
              { "id": 601, "job": "Story", "name": "Writer Three" },
              { "id": 602, "job": "Author", "name": "Writer Four" },
              { "id": 603, "job": "Screenplay", "name": "Writer Five" },
              { "id": 700, "job": "Original Music Composer", "name": "Hans Zimmer" },
              { "id": 701, "job": "Music", "name": "Composer Two" },
              { "id": 702, "job": "Music", "name": "Composer Three" },
              { "id": 703, "job": "Original Music Composer", "name": "Composer Four" },
              { "id": 800, "job": "Director of Photography", "name": "Wally Pfister" }
            ]
          },
          "videos": {
            "results": [
              { "site": "YouTube", "key": "featurette-en", "name": "Making of", "type": "Featurette", "iso_639_1": "en" },
              { "site": "YouTube", "key": "clip-fr", "name": "Extrait", "type": "Clip", "iso_639_1": "fr" },
              { "site": "YouTube", "key": "teaser-en", "name": "Teaser", "type": "Teaser", "iso_639_1": "en" },
              { "site": "YouTube", "key": "trailer-en", "name": "Official Trailer", "type": "Trailer", "iso_639_1": "en" },
              { "site": "Vimeo", "key": "vimeo-trailer", "name": "Vimeo", "type": "Trailer", "iso_639_1": "fr" },
              { "site": "YouTube", "key": "behind", "name": "Coulisses", "type": "Behind the Scenes", "iso_639_1": "fr" },
              { "site": "YouTube", "key": "trailer-fr", "name": "Bande-annonce VF", "type": "Trailer", "iso_639_1": "fr" },
              { "site": "YouTube", "key": "teaser-fr", "name": "Teaser VF", "type": "Teaser", "iso_639_1": "fr" },
              { "site": "YouTube", "key": "trailer-none", "name": "Trailer", "type": "Trailer", "iso_639_1": null },
              { "site": "YouTube", "key": "", "name": "Sans clé", "type": "Trailer", "iso_639_1": "fr" }
            ]
          },
          "release_dates": {
            "results": [
              { "iso_3166_1": "US", "release_dates": [{ "certification": "PG-13", "type": 3 }] },
              { "iso_3166_1": "FR", "release_dates": [
                { "certification": "", "type": 1 },
                { "certification": "U", "type": 4 },
                { "certification": "12", "type": 3 }
              ] }
            ]
          }
        }
        """;

    private const string SeriesJson = """
        {
          "id": 1399,
          "name": "Game of Thrones",
          "original_name": "Game of Thrones (original)",
          "original_language": "en",
          "first_air_date": "2011-04-17",
          "vote_count": 25000,
          "budget": 50000000,
          "belongs_to_collection": { "id": 1, "name": "Ignored" },
          "origin_country": ["US", "GB"],
          "production_countries": [{ "iso_3166_1": "MT" }],
          "created_by": [
            { "id": 9813, "name": "David Benioff" },
            { "id": 228068, "name": "D. B. Weiss" }
          ],
          "credits": {
            "cast": [{ "id": 22970, "name": "Peter Dinklage", "character": "Tyrion Lannister", "profile_path": "/peter.jpg" }],
            "crew": [{ "id": 10, "job": "Original Music Composer", "name": "Ramin Djawadi" }]
          },
          "content_ratings": {
            "results": [
              { "iso_3166_1": "US", "rating": "TV-MA" },
              { "iso_3166_1": "FR", "rating": "16" }
            ]
          }
        }
        """;

    private static readonly string[] InceptionCountries = ["GB", "US"];
    private static readonly string[] SeriesCountries = ["US", "GB"];
    private static readonly string[] RankedVideoKeys = ["trailer-fr", "trailer-en", "trailer-none", "teaser-fr", "teaser-en", "clip-fr"];

    private static HttpClient CreateHttpClient(HttpMessageHandler handler) =>
        new(handler) { BaseAddress = new Uri("https://api.themoviedb.org") };

    private static TmdbMovieSearch CreateSut(HttpClient client) =>
        new(
            client,
            Options.Create(new MoviePickerOptions { TmdbApiKey = "key", TmdbEnrichmentCacheHours = 1 }),
            new MemoryCache(new MemoryCacheOptions()),
            new InMemorySharedCache(),
            new SingleFlight(),
            NullLogger<TmdbMovieSearch>.Instance);

    private static Mock<HttpMessageHandler> Answering(string json, List<string>? requestedUrls = null)
    {
        var mock = new Mock<HttpMessageHandler>();
        mock.Protected()
            .Setup<Task<HttpResponseMessage>>("SendAsync", ItExpr.IsAny<HttpRequestMessage>(), ItExpr.IsAny<CancellationToken>())
            .Returns<HttpRequestMessage, CancellationToken>((request, _) =>
            {
                requestedUrls?.Add(request.RequestUri!.ToString());
                return Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK) { Content = new StringContent(json) });
            });
        return mock;
    }

    private static async Task<TmdbMovieDetailsExtras> ExtrasOfAsync(string json, MovieMediaType mediaType)
    {
        var details = await CreateSut(CreateHttpClient(Answering(json).Object)).GetDetailsAsync(42, mediaType);
        Assert.NotNull(details);
        Assert.NotNull(details!.Extras);
        return details.Extras!;
    }

    [Fact]
    public async Task GetDetailsAsync_Film_ReadsTheFactsOfTheFilmPage()
    {
        var extras = await ExtrasOfAsync(InceptionJson, MovieMediaType.Movie);

        Assert.Equal("Inception (original)", extras.OriginalTitle);
        Assert.Equal("en", extras.OriginalLanguage);
        Assert.Equal(InceptionCountries, extras.ProductionCountries);
        Assert.Equal(160_000_000L, extras.Budget);
        Assert.Equal(37_112, extras.VoteCount);
        Assert.Equal(new TmdbCollectionReference(1_241, "Inception, la saga"), extras.Collection);
        Assert.Equal(525, extras.DirectorId);
    }

    [Fact]
    public async Task GetDetailsAsync_Film_PrefersTheFrenchTheatricalCertification()
    {
        var extras = await ExtrasOfAsync(InceptionJson, MovieMediaType.Movie);

        Assert.Equal("12", extras.Certification);
    }

    [Fact]
    public async Task GetDetailsAsync_FrenchReleaseWithoutTheatricalRating_TakesTheFirstRatedOne()
    {
        var json = """
            {"id":1,"title":"T","release_dates":{"results":[{"iso_3166_1":"FR","release_dates":[
              {"certification":"","type":3},{"certification":"16","type":4},{"certification":"18","type":5}
            ]}]}}
            """;

        var extras = await ExtrasOfAsync(json, MovieMediaType.Movie);

        Assert.Equal("16", extras.Certification);
    }

    [Fact]
    public async Task GetDetailsAsync_Film_KeepsTheTopTwentyCastMembersWithTheirPortrait()
    {
        var extras = await ExtrasOfAsync(InceptionJson, MovieMediaType.Movie);

        Assert.Equal(20, extras.CastMembers.Count);
        Assert.Equal(
            new TmdbCastMember("Leonardo DiCaprio", "Cobb", "https://image.tmdb.org/t/p/w185/leo.jpg"),
            extras.CastMembers[0]);
        Assert.Equal(new TmdbCastMember("Elliot Page", null, null), extras.CastMembers[1]);
        Assert.Equal("Actor 20", extras.CastMembers[^1].Name);
    }

    [Fact]
    public async Task GetDetailsAsync_Film_GroupsTheCrewUnderStableJobKeys()
    {
        var extras = await ExtrasOfAsync(InceptionJson, MovieMediaType.Movie);

        Assert.Equal(
            [
                new TmdbCrewCredit(TmdbCrewJobs.Director, "Christopher Nolan"),
                new TmdbCrewCredit(TmdbCrewJobs.Director, "Second Unit Director"),
                new TmdbCrewCredit(TmdbCrewJobs.Writer, "Christopher Nolan"),
                new TmdbCrewCredit(TmdbCrewJobs.Writer, "Writer Two"),
                new TmdbCrewCredit(TmdbCrewJobs.Writer, "Writer Three"),
                new TmdbCrewCredit(TmdbCrewJobs.Writer, "Writer Four"),
                new TmdbCrewCredit(TmdbCrewJobs.Composer, "Hans Zimmer"),
                new TmdbCrewCredit(TmdbCrewJobs.Composer, "Composer Two"),
                new TmdbCrewCredit(TmdbCrewJobs.Composer, "Composer Three"),
                new TmdbCrewCredit(TmdbCrewJobs.Photography, "Wally Pfister"),
            ],
            extras.Crew);
    }

    [Fact]
    public async Task GetDetailsAsync_Film_RanksItsYouTubeVideosTrailersFirstThenFrench()
    {
        var extras = await ExtrasOfAsync(InceptionJson, MovieMediaType.Movie);

        Assert.Equal(RankedVideoKeys, extras.Videos.Select(video => video.Key));
        Assert.Equal(new TmdbVideo("trailer-fr", "Bande-annonce VF", "Trailer", "fr"), extras.Videos[0]);
        Assert.Null(extras.Videos[2].Language);
    }

    [Fact]
    public async Task GetDetailsAsync_Film_StillServesTheFieldsTheModalReads()
    {
        var details = await CreateSut(CreateHttpClient(Answering(InceptionJson).Object)).GetDetailsAsync(27_205, MovieMediaType.Movie);

        Assert.Equal("Christopher Nolan", details!.Director);
        Assert.Equal(8, details.Cast.Count);
        Assert.Equal("https://www.youtube.com/watch?v=trailer-fr", details.TrailerUrl);
    }

    [Fact]
    public async Task GetDetailsAsync_FilmWithoutTheseFacts_AnswersEmptyListsAndNulls()
    {
        var json = """
            {"id":2,"title":"T","budget":0,"belongs_to_collection":null,"original_title":"",
             "release_dates":{"results":[{"iso_3166_1":"FR","release_dates":[{"certification":" ","type":3}]}]}}
            """;

        var extras = await ExtrasOfAsync(json, MovieMediaType.Movie);

        Assert.Null(extras.OriginalTitle);
        Assert.Null(extras.OriginalLanguage);
        Assert.Empty(extras.ProductionCountries);
        Assert.Null(extras.Budget);
        Assert.Null(extras.VoteCount);
        Assert.Null(extras.Certification);
        Assert.Null(extras.Collection);
        Assert.Null(extras.DirectorId);
        Assert.Empty(extras.CastMembers);
        Assert.Empty(extras.Crew);
        Assert.Empty(extras.Videos);
    }

    [Fact]
    public async Task GetDetailsAsync_Series_ReadsOriginCountriesFrenchRatingAndCreators()
    {
        var extras = await ExtrasOfAsync(SeriesJson, MovieMediaType.Tv);

        Assert.Equal("Game of Thrones (original)", extras.OriginalTitle);
        Assert.Equal(SeriesCountries, extras.ProductionCountries);
        Assert.Equal(25_000, extras.VoteCount);
        Assert.Equal("16", extras.Certification);
        Assert.Null(extras.Budget);
        Assert.Null(extras.Collection);
        Assert.Null(extras.DirectorId);
        Assert.Equal(
            new TmdbCastMember("Peter Dinklage", "Tyrion Lannister", "https://image.tmdb.org/t/p/w185/peter.jpg"),
            Assert.Single(extras.CastMembers));
        Assert.Equal(
            [
                new TmdbCrewCredit(TmdbCrewJobs.Creator, "David Benioff"),
                new TmdbCrewCredit(TmdbCrewJobs.Creator, "D. B. Weiss"),
                new TmdbCrewCredit(TmdbCrewJobs.Composer, "Ramin Djawadi"),
            ],
            extras.Crew);
    }

    [Theory]
    [InlineData(MovieMediaType.Movie, "/3/movie/42", "credits,videos,release_dates")]
    [InlineData(MovieMediaType.Tv, "/3/tv/42", "credits,videos,content_ratings")]
    public async Task GetDetailsAsync_AsksTmdbForTheFrenchRatingOfThatMediaType(
        MovieMediaType mediaType,
        string path,
        string appended)
    {
        var requested = new List<string>();
        var sut = CreateSut(CreateHttpClient(Answering("""{"id":42,"title":"T","name":"T"}""", requested).Object));

        await sut.GetDetailsAsync(42, mediaType);

        var url = new Uri(Assert.Single(requested));
        Assert.Equal(path, url.AbsolutePath);
        Assert.Equal(appended, System.Web.HttpUtility.ParseQueryString(url.Query)["append_to_response"]);
    }

    [Fact]
    public async Task GetDetailsAsync_SecondCall_ServesTheExtrasFromTheCache()
    {
        var requested = new List<string>();
        var sut = CreateSut(CreateHttpClient(Answering(InceptionJson, requested).Object));

        await sut.GetDetailsAsync(27_205, MovieMediaType.Movie);
        var cached = await sut.GetDetailsAsync(27_205, MovieMediaType.Movie);

        Assert.Single(requested);
        Assert.Equal(525, cached!.Extras!.DirectorId);
    }
}
