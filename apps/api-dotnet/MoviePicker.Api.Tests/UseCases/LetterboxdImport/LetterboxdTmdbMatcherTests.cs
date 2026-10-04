using System.Net;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Moq;
using Moq.Protected;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.LetterboxdImport;
using MoviePicker.Api.Configuration;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Infrastructure.Persistence.InMemory;
using MoviePicker.Api.Infrastructure.Tmdb;
using Xunit;

namespace MoviePicker.Api.Tests.UseCases.LetterboxdImport;

public sealed class LetterboxdTmdbMatcherTests
{
    private const int JackieTmdbId = 376_660;

    private static TmdbSearchItem Item(int id, string title, string? originalTitle = null) =>
        new(id, MovieMediaType.Movie, title, "2004", null, 7.0, originalTitle);

    private static TmdbSearchItem Item(int id, MovieMediaType mediaType, string title, string year) =>
        new(id, mediaType, title, year, null, 7.0, title);

    private static string TmdbMovie(int id, string title, string releaseDate, double popularity) =>
        $$"""{"id":{{id}},"media_type":"movie","title":"{{title}}","original_title":"{{title}}","release_date":"{{releaseDate}}","popularity":{{popularity}}}""";

    private static TmdbMovieSearch TmdbAnswering(string titles, string people, string credits)
    {
        var handler = new Mock<HttpMessageHandler>();
        handler.Protected()
            .Setup<Task<HttpResponseMessage>>("SendAsync", ItExpr.IsAny<HttpRequestMessage>(), ItExpr.IsAny<CancellationToken>())
            .Returns<HttpRequestMessage, CancellationToken>((request, _) =>
            {
                var url = request.RequestUri!.ToString();
                var body = url.Contains("/search/person", StringComparison.Ordinal) ? people
                    : url.Contains("/combined_credits", StringComparison.Ordinal) ? credits
                    : titles;
                return Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK) { Content = new StringContent(body) });
            });
        return new TmdbMovieSearch(
            new HttpClient(handler.Object),
            Options.Create(new MoviePickerOptions { TmdbApiKey = "key" }),
            new MemoryCache(new MemoryCacheOptions()),
            new InMemorySharedCache(),
            NullLogger<TmdbMovieSearch>.Instance);
    }

    [Fact]
    public async Task FindCandidatesAsync_TitleThatIsAlsoAPersonsName_KeepsTheFilm()
    {
        var titles = $$"""{"results":[{{TmdbMovie(JackieTmdbId, "Jackie", "2016-12-02", 12)}}]}""";
        var people = """{"results":[{"id":18897,"name":"Jackie Chan","popularity":40}]}""";
        var filmography = string.Join(",", Enumerable.Range(1, 6)
            .Select(i => TmdbMovie(900 + i, $"Jackie Chan film {i}", "2016-06-01", 60 - i)));
        var credits = $$"""{"cast":[{{filmography}}],"crew":[]}""";

        var candidates = await LetterboxdTmdbMatcher.FindCandidatesAsync(
            TmdbAnswering(titles, people, credits), "Jackie", "2016", CancellationToken.None);

        Assert.Contains(candidates, candidate => candidate.Id == JackieTmdbId);
        Assert.Equal(JackieTmdbId, LetterboxdTmdbMatcher.SelectConfident("Jackie", "2016", candidates)?.Id);
    }

    [Fact]
    public async Task FindCandidatesAsync_ExactTitleRankedBelowFivePartialMatches_KeepsTheFilm()
    {
        var partials = Enumerable.Range(1, 5).Select(i => TmdbMovie(800 + i, $"Jackie {i}", "2016-01-01", 30));
        var titles = $$"""{"results":[{{string.Join(",", partials)}},{{TmdbMovie(JackieTmdbId, "Jackie", "2016-12-02", 12)}}]}""";

        var candidates = await LetterboxdTmdbMatcher.FindCandidatesAsync(
            TmdbAnswering(titles, """{"results":[]}""", """{"cast":[]}"""), "Jackie", "2016", CancellationToken.None);

        Assert.Equal(LetterboxdTmdbMatcher.MaxCandidates, candidates.Count);
        Assert.Equal(JackieTmdbId, candidates[0].Id);
    }

    [Fact]
    public void SelectConfident_SingleCandidateMatchingOriginalTitle_IsConfident()
    {
        var candidates = new[] { Item(5255, "Le Pôle express", "The Polar Express") };

        var chosen = LetterboxdTmdbMatcher.SelectConfident("The Polar Express", "2004", candidates);

        Assert.NotNull(chosen);
        Assert.Equal(5255, chosen.Id);
    }

    [Fact]
    public void SelectConfident_MatchesLocalizedTitleToo()
    {
        var candidates = new[] { Item(1, "Le Pôle express", "Something Else") };

        var chosen = LetterboxdTmdbMatcher.SelectConfident("le pole express", "2004", candidates);

        Assert.NotNull(chosen);
        Assert.Equal(1, chosen.Id);
    }

    [Fact]
    public void SelectConfident_IgnoresCaseAccentsAndPunctuation()
    {
        var candidates = new[] { Item(1, "Titre FR", "Spider-Man: No Way Home") };

        var chosen = LetterboxdTmdbMatcher.SelectConfident("spider man no way home", "2021", candidates);

        Assert.NotNull(chosen);
    }

    [Fact]
    public void SelectConfident_NoCandidateMatchesTitle_IsAmbiguous()
    {
        var candidates = new[]
        {
            Item(1, "Sermons de minuit", "Midnight Mass Something"),
            Item(2, "The Manson Brothers", "The Manson Brothers")
        };

        Assert.Null(LetterboxdTmdbMatcher.SelectConfident("Midnight Mass", "2021", candidates));
    }

    [Fact]
    public void SelectConfident_SeveralCandidatesShareTheTitle_IsAmbiguous()
    {
        var candidates = new[] { Item(1, "Akira", "Akira"), Item(2, "Akira", "Akira") };

        Assert.Null(LetterboxdTmdbMatcher.SelectConfident("Akira", "", candidates));
    }

    [Fact]
    public void SelectConfident_ExactTitleOnlyOnASeries_IsAmbiguous()
    {
        var candidates = new[]
        {
            Item(334511, MovieMediaType.Tv, "Come and See", "1985"),
            Item(25237, MovieMediaType.Movie, "Requiem pour un massacre", "1985"),
            Item(9, MovieMediaType.Movie, "The Story of the Film 'Come and See'", "1985")
        };

        Assert.Null(LetterboxdTmdbMatcher.SelectConfident("Come and See", "1985", candidates));
    }

    [Fact]
    public void SelectConfident_MovieWinsOverSeriesSharingTheTitle()
    {
        var candidates = new[]
        {
            Item(1, MovieMediaType.Tv, "Akira", "1988"),
            Item(2, MovieMediaType.Movie, "Akira", "1988")
        };

        var chosen = LetterboxdTmdbMatcher.SelectConfident("Akira", "1988", candidates);

        Assert.NotNull(chosen);
        Assert.Equal(2, chosen.Id);
    }

    [Fact]
    public void SelectConfident_SeveralMoviesShareTheTitle_TheOnlyOneOfThatYearWins()
    {
        var candidates = new[]
        {
            Item(426063, MovieMediaType.Movie, "Nosferatu", "2024"),
            Item(7, MovieMediaType.Movie, "Nosferatu", "2025")
        };

        var chosen = LetterboxdTmdbMatcher.SelectConfident("Nosferatu", "2024", candidates);

        Assert.NotNull(chosen);
        Assert.Equal(426063, chosen.Id);
    }

    [Theory]
    [InlineData("2023")]
    [InlineData("")]
    public void SelectConfident_SeveralMoviesShareTheTitle_WithoutAYearToDecide_IsAmbiguous(string year)
    {
        var candidates = new[]
        {
            Item(1, MovieMediaType.Movie, "Nosferatu", "2024"),
            Item(2, MovieMediaType.Movie, "Nosferatu", "2025")
        };

        Assert.Null(LetterboxdTmdbMatcher.SelectConfident("Nosferatu", year, candidates));
    }

    [Fact]
    public void SelectConfident_SeveralMoviesShareTitleAndYear_IsAmbiguous()
    {
        var candidates = new[]
        {
            Item(1, MovieMediaType.Movie, "Nosferatu", "2024"),
            Item(2, MovieMediaType.Movie, "Nosferatu", "2024")
        };

        Assert.Null(LetterboxdTmdbMatcher.SelectConfident("Nosferatu", "2024", candidates));
    }

    [Fact]
    public void SelectConfident_NoCandidate_IsAmbiguous()
    {
        Assert.Null(LetterboxdTmdbMatcher.SelectConfident("Akira", "1988", []));
    }

    [Fact]
    public void SelectConfident_BlankLetterboxdTitle_IsAmbiguous()
    {
        Assert.Null(LetterboxdTmdbMatcher.SelectConfident("   ", "1988", [Item(1, "Akira", "Akira")]));
    }
}
