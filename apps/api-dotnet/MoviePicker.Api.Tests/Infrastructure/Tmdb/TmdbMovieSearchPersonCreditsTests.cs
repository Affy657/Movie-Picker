using System.Net;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Moq;
using Moq.Protected;
using MoviePicker.Api.Configuration;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Infrastructure.Tmdb;
using Xunit;

namespace MoviePicker.Api.Tests.Infrastructure.Tmdb;

public sealed class TmdbMovieSearchPersonCreditsTests
{
    private static readonly string[] ParasiteSnowpiercerAndFuzzyTitles = ["Parasite", "Snowpiercer", "Titre approchant"];
    private static readonly string[] InceptionThenFuzzyTitles = ["Inception", "Titre approchant"];
    private static readonly string[] FuzzyThenInceptionTitles = ["Titre approchant", "Inception"];
    private static readonly string[] FuzzyTitleOnly = ["Titre approchant"];

    private const string TitleMatchesJson = """
        {"results":[{"id":900,"title":"Titre approchant","release_date":"2001-01-01"}]}
        """;

    private static HttpClient CreateHttpClient(HttpMessageHandler handler) =>
        new(handler) { BaseAddress = new Uri("https://api.themoviedb.org") };

    private static TmdbMovieSearch CreateSut(HttpClient client) =>
        new(
            client,
            Options.Create(new MoviePickerOptions { TmdbApiKey = "key" }),
            new MemoryCache(new MemoryCacheOptions()),
            NullLogger<TmdbMovieSearch>.Instance);

    private static HttpResponseMessage Json(string body) =>
        new(HttpStatusCode.OK) { Content = new StringContent(body) };

    private static Mock<HttpMessageHandler> Handler(Func<HttpRequestMessage, HttpResponseMessage> route)
    {
        var mock = new Mock<HttpMessageHandler>();
        mock.Protected()
            .Setup<Task<HttpResponseMessage>>("SendAsync", ItExpr.IsAny<HttpRequestMessage>(), ItExpr.IsAny<CancellationToken>())
            .Returns<HttpRequestMessage, CancellationToken>((req, _) => Task.FromResult(route(req)));
        return mock;
    }

    private static Mock<HttpMessageHandler> RouteBy(string titles, string people, string credits) =>
        Handler(request =>
        {
            var url = request.RequestUri?.ToString() ?? "";
            if (url.Contains("/search/person", StringComparison.Ordinal))
                return Json(people);
            if (url.Contains("/combined_credits", StringComparison.Ordinal))
                return Json(credits);
            return Json(titles);
        });

    [Fact]
    public async Task SearchAsync_ExactFullName_PutsPersonCreditsBeforeTitleMatches()
    {
        var people = """
            {"results":[{"id":21684,"name":"Bong Joon-ho","popularity":12.5}]}
            """;
        var credits = """
            {
              "cast":[{"id":496243,"media_type":"movie","title":"Parasite","release_date":"2019-05-30","popularity":50}],
              "crew":[{"id":110415,"media_type":"movie","title":"Snowpiercer","release_date":"2013-08-01","popularity":30,"job":"Director"}]
            }
            """;
        var sut = CreateSut(CreateHttpClient(RouteBy(TitleMatchesJson, people, credits).Object));

        var result = await sut.SearchAsync("Bong Joon-ho", false);

        Assert.Equal(ParasiteSnowpiercerAndFuzzyTitles, result.Select(item => item.Title));
    }

    [Fact]
    public async Task SearchAsync_SurnameOnly_PutsPersonCreditsBeforeTitleMatches()
    {
        var people = """
            {"results":[{"id":525,"name":"Christopher Nolan","popularity":20}]}
            """;
        var credits = """
            {"cast":[{"id":27205,"media_type":"movie","title":"Inception","release_date":"2010-07-16","popularity":40}]}
            """;
        var sut = CreateSut(CreateHttpClient(RouteBy(TitleMatchesJson, people, credits).Object));

        var result = await sut.SearchAsync("Nolan", false);

        Assert.Equal(InceptionThenFuzzyTitles, result.Select(item => item.Title));
    }

    [Fact]
    public async Task SearchAsync_TruncatedName_AppendsPersonCreditsAfterTitleMatches()
    {
        var people = """
            {"results":[{"id":525,"name":"Christopher Nolan","popularity":20}]}
            """;
        var credits = """
            {"cast":[{"id":27205,"media_type":"movie","title":"Inception","release_date":"2010-07-16","popularity":40}]}
            """;
        var sut = CreateSut(CreateHttpClient(RouteBy(TitleMatchesJson, people, credits).Object));

        var result = await sut.SearchAsync("Christoph", false);

        Assert.Equal(FuzzyThenInceptionTitles, result.Select(item => item.Title));
    }

    [Fact]
    public async Task SearchAsync_CrewCredits_KeepsOnlyDirecting()
    {
        var people = """
            {"results":[{"id":525,"name":"Christopher Nolan","popularity":20}]}
            """;
        var credits = """
            {
              "cast":[],
              "crew":[
                {"id":27205,"media_type":"movie","title":"Inception","release_date":"2010-07-16","popularity":40,"job":"Director"},
                {"id":49026,"media_type":"movie","title":"Produit seulement","release_date":"2012-07-16","popularity":39,"job":"Producer"}
              ]
            }
            """;
        var sut = CreateSut(CreateHttpClient(RouteBy(TitleMatchesJson, people, credits).Object));

        var result = await sut.SearchAsync("Nolan", false);

        Assert.DoesNotContain(result, item => item.Title == "Produit seulement");
        Assert.Contains(result, item => item.Title == "Inception");
    }

    [Fact]
    public async Task SearchAsync_WithoutSeries_DropsSeriesCredits()
    {
        var people = """
            {"results":[{"id":1,"name":"Pedro Pascal","popularity":30}]}
            """;
        var credits = """
            {"cast":[
              {"id":10,"media_type":"movie","title":"Un film","release_date":"2020-01-01","popularity":10},
              {"id":11,"media_type":"tv","name":"Une série","first_air_date":"2021-01-01","popularity":90}
            ]}
            """;
        var sut = CreateSut(CreateHttpClient(RouteBy(TitleMatchesJson, people, credits).Object));

        var result = await sut.SearchAsync("Pedro Pascal", false);

        Assert.All(result, item => Assert.Equal(MovieMediaType.Movie, item.MediaType));
        Assert.DoesNotContain(result, item => item.Title == "Une série");
    }

    [Fact]
    public async Task SearchAsync_AllowSeries_KeepsSeriesCredits()
    {
        var people = """
            {"results":[{"id":1,"name":"Pedro Pascal","popularity":30}]}
            """;
        var credits = """
            {"cast":[
              {"id":11,"media_type":"tv","name":"Une série","first_air_date":"2021-01-01","popularity":90}
            ]}
            """;
        var titles = """
            {"results":[]}
            """;
        var sut = CreateSut(CreateHttpClient(RouteBy(titles, people, credits).Object));

        var result = await sut.SearchAsync("Pedro Pascal", allowSeries: true);

        Assert.Contains(result, item => item.MediaType == MovieMediaType.Tv && item.Title == "Une série");
    }

    [Fact]
    public async Task SearchAsync_PersonLookupFails_KeepsTitleMatches()
    {
        var handler = Handler(request =>
            (request.RequestUri?.ToString() ?? "").Contains("/search/person", StringComparison.Ordinal)
                ? new HttpResponseMessage(HttpStatusCode.InternalServerError) { Content = new StringContent("boom") }
                : Json(TitleMatchesJson));
        var sut = CreateSut(CreateHttpClient(handler.Object));

        var result = await sut.SearchAsync("Bong Joon-ho", false);

        Assert.Equal(FuzzyTitleOnly, result.Select(item => item.Title));
    }

    [Fact]
    public async Task SearchAsync_ObscureNamesake_SkipsCredits()
    {
        var people = """
            {"results":[{"id":7,"name":"Nea Dune","popularity":0.41}]}
            """;
        var credits = """
            {"cast":[{"id":42,"media_type":"movie","title":"Hors sujet","release_date":"2020-01-01","popularity":99}]}
            """;
        var sut = CreateSut(CreateHttpClient(RouteBy(TitleMatchesJson, people, credits).Object));

        var result = await sut.SearchAsync("Dune", false);

        Assert.Equal(FuzzyTitleOnly, result.Select(item => item.Title));
    }

    [Fact]
    public async Task SearchAsync_NameWithoutMatch_SkipsCredits()
    {
        var people = """
            {"results":[{"id":7,"name":"Autre personne","popularity":80}]}
            """;
        var credits = """
            {"cast":[{"id":42,"media_type":"movie","title":"Hors sujet","release_date":"2020-01-01","popularity":99}]}
            """;
        var sut = CreateSut(CreateHttpClient(RouteBy(TitleMatchesJson, people, credits).Object));

        var result = await sut.SearchAsync("Bong Joon-ho", false);

        Assert.Equal(FuzzyTitleOnly, result.Select(item => item.Title));
    }

    [Fact]
    public async Task SearchAsync_ShortQuery_DoesNotCallPersonSearch()
    {
        var handler = RouteBy(TitleMatchesJson, """{"results":[]}""", """{"cast":[]}""");
        var sut = CreateSut(CreateHttpClient(handler.Object));

        await sut.SearchAsync("ab", false);

        handler.Protected().Verify(
            "SendAsync",
            Times.Never(),
            ItExpr.Is<HttpRequestMessage>(request =>
                request.RequestUri!.ToString().Contains("/search/person", StringComparison.Ordinal)),
            ItExpr.IsAny<CancellationToken>());
    }
}
