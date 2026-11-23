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
            new InMemorySharedCache(),
            new SingleFlight(),
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

    private const int CreditIdBase = 5000;
    private const string NoPeopleJson = """{"results":[]}""";
    private const string NoCreditsJson = """{"cast":[]}""";
    private const string FuzzyTitle = "Titre approchant";

    private static readonly string[] DuneTitlesByResemblance =
        ["Dune", "Dune : Deuxième partie", "Anatomie d'une chute", "La Revanche d'une blonde"];

    private static string TitleResults(params string[] titles) =>
        "{\"results\":["
        + string.Join(",", titles.Select((title, index) =>
            $$"""{"id":{{100 + index}},"title":"{{title}}","release_date":"2000-01-01"}"""))
        + "]}";

    private static string CastCredits(int count) =>
        "{\"cast\":["
        + string.Join(",", Enumerable.Range(1, count).Select(index =>
            $$"""{"id":{{CreditIdBase + index}},"media_type":"movie","title":"Filmographie {{index}}","release_date":"2010-01-01","popularity":{{100 - index}}}"""))
        + "]}";

    private static string Person(string name) =>
        $$"""{"results":[{"id":77,"name":"{{name}}","popularity":25}]}""";

    private static string[] FuzzyTitles(int count) =>
        Enumerable.Range(1, count).Select(index => $"Titre {index}").ToArray();

    private static bool IsCredit(TmdbSearchItem item) => item.Id > CreditIdBase;

    [Theory]
    [InlineData("rocky", "Rocky", "Rocky Carroll")]
    [InlineData("amelie", "Le Fabuleux Destin d'Amélie Poulain", "Amélie Lens")]
    [InlineData("leon", "Léon", "Leon Lai")]
    [InlineData("MATILDA", "Matilda", "Matilda Lawler")]
    public async Task SearchAsync_TitleNamedLikeAPerson_LeadsBeforeTheNamesakeCredits(
        string query,
        string expectedFirst,
        string personName)
    {
        var titles = TitleResults(FuzzyTitle, expectedFirst);
        var sut = CreateSut(CreateHttpClient(RouteBy(titles, Person(personName), CastCredits(20)).Object));

        var result = await sut.SearchAsync(query, false);

        Assert.Equal(expectedFirst, result[0].Title);
        Assert.Contains(result, item => item.Title == FuzzyTitle);
    }

    [Fact]
    public async Task SearchAsync_PersonFoundByFirstName_KeepsHalfThePlacesForTitles()
    {
        var titles = TitleResults(FuzzyTitles(15));
        var sut = CreateSut(CreateHttpClient(RouteBy(titles, Person("Rocky Carroll"), CastCredits(20)).Object));

        var result = await sut.SearchAsync("rocky", false);

        Assert.Equal(20, result.Count);
        Assert.Equal(10, result.Count(IsCredit));
        Assert.All(result.Take(10), item => Assert.True(IsCredit(item)));
    }

    [Fact]
    public async Task SearchAsync_PersonFoundBySurname_KeepsTheWholeFilmographyFirst()
    {
        var titles = TitleResults(FuzzyTitles(15));
        var sut = CreateSut(CreateHttpClient(RouteBy(titles, Person("Christopher Nolan"), CastCredits(12)).Object));

        var result = await sut.SearchAsync("nolan", false);

        Assert.Equal(20, result.Count);
        Assert.All(result.Take(12), item => Assert.True(IsCredit(item)));
        Assert.All(result.Skip(12), item => Assert.False(IsCredit(item)));
    }

    [Fact]
    public async Task SearchAsync_TitlesWithoutTheWord_FallBehindTitlesThatContainIt()
    {
        var titles = TitleResults("Anatomie d'une chute", "Dune", "La Revanche d'une blonde", "Dune : Deuxième partie");
        var sut = CreateSut(CreateHttpClient(RouteBy(titles, NoPeopleJson, NoCreditsJson).Object));

        var result = await sut.SearchAsync("dune", false);

        Assert.Equal(DuneTitlesByResemblance, result.Select(item => item.Title));
    }

    [Fact]
    public async Task SearchAsync_OriginalTitleEqualToTheQuery_Leads()
    {
        var titles = """
            {"results":[
              {"id":1,"title":"Titre approchant","release_date":"2001-01-01"},
              {"id":2,"title":"Ça","original_title":"It","release_date":"2017-09-06"}
            ]}
            """;
        var sut = CreateSut(CreateHttpClient(RouteBy(titles, NoPeopleJson, NoCreditsJson).Object));

        var result = await sut.SearchAsync("it", false);

        Assert.Equal("Ça", result[0].Title);
    }

    [Fact]
    public async Task SearchTitlesAsync_RanksTitlesByResemblance()
    {
        var titles = TitleResults("Anatomie d'une chute", "Dune");
        var sut = CreateSut(CreateHttpClient(RouteBy(titles, NoPeopleJson, NoCreditsJson).Object));

        var result = await sut.SearchTitlesAsync("Dune", false);

        Assert.Equal("Dune", result[0].Title);
    }

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

    [Fact]
    public async Task SearchTitlesAsync_NamesakeOfAPerson_ReturnsTitleMatchesOnly()
    {
        var people = """
            {"results":[{"id":21684,"name":"Bong Joon-ho","popularity":12.5}]}
            """;
        var credits = """
            {"cast":[{"id":496243,"media_type":"movie","title":"Parasite","release_date":"2019-05-30","popularity":50}]}
            """;
        var handler = RouteBy(TitleMatchesJson, people, credits);
        var sut = CreateSut(CreateHttpClient(handler.Object));

        var result = await sut.SearchTitlesAsync("Bong Joon-ho", false);

        Assert.Equal(FuzzyTitleOnly, result.Select(item => item.Title));
        handler.Protected().Verify(
            "SendAsync",
            Times.Once(),
            ItExpr.Is<HttpRequestMessage>(request =>
                request.RequestUri!.ToString().Contains("/search/movie", StringComparison.Ordinal)),
            ItExpr.IsAny<CancellationToken>());
        handler.Protected().Verify(
            "SendAsync",
            Times.Once(),
            ItExpr.IsAny<HttpRequestMessage>(),
            ItExpr.IsAny<CancellationToken>());
    }

    [Fact]
    public async Task SearchTitlesAsync_KeepsTheYearWindow()
    {
        var titles = """
            {"results":[
              {"id":1,"media_type":"movie","title":"Jackie","release_date":"2016-12-02"},
              {"id":2,"media_type":"movie","title":"Jackie Brown","release_date":"1997-12-25"}
            ]}
            """;
        var sut = CreateSut(CreateHttpClient(RouteBy(titles, """{"results":[]}""", """{"cast":[]}""").Object));

        var result = await sut.SearchTitlesAsync("Jackie", true, yearFrom: 2015, yearTo: 2017);

        Assert.Equal(1, Assert.Single(result).Id);
    }
}
