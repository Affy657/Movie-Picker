using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using MoviePicker.Api.IntegrationTests.Helpers;
using Xunit;

namespace MoviePicker.Api.IntegrationTests;

public sealed class NightRecapEndpointsTests : IClassFixture<MoviePickerApplicationFactory>
{
    private readonly MoviePickerApplicationFactory _factory;

    public NightRecapEndpointsTests(MoviePickerApplicationFactory factory) => _factory = factory;

    private static async Task<(string Slug, string RecapSlug)> CreateNightWithAWinnerAsync(HttpClient host)
    {
        var create = await host.PostAsJsonAsync("/api/v1/events", new { title = "Soirée du vendredi", date = "2035-06-01", time = "20:00" });
        Assert.Equal(HttpStatusCode.Created, create.StatusCode);
        var created = await create.Content.ReadFromJsonAsync<JsonElement>();
        var slug = created.GetProperty("slug").GetString()!;
        var participantId = created.GetProperty("creatorParticipant").GetProperty("_id").GetString()!;
        var movie = await host.PostAsJsonAsync(
            $"/api/v1/events/{slug}/movies",
            new { tmdbId = 949, title = "Heat", year = "1995", posterPath = (string?)null, participantId });
        movie.EnsureSuccessStatusCode();
        var movieId = (await movie.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("_id").GetString()!;
        (await host.PostAsJsonAsync($"/api/v1/events/{slug}/winner", new { movieId })).EnsureSuccessStatusCode();
        var detail = await host.GetFromJsonAsync<JsonElement>($"/api/v1/events/slug/{slug}");
        return (slug, detail.GetProperty("recapSlug").GetString()!);
    }

    [Fact]
    public async Task Recap_ReadByAVisitor_ShowsTheNightButNotItsLink()
    {
        var host = await IntegrationTestAuth.NewRegisteredClientAsync(_factory);
        var (slug, recapSlug) = await CreateNightWithAWinnerAsync(host);

        var recap = await _factory.CreateClient().GetFromJsonAsync<JsonElement>($"/api/v1/recaps/{recapSlug}");

        Assert.NotEqual(slug, recapSlug);
        Assert.Equal("Soirée du vendredi", recap.GetProperty("title").GetString());
        Assert.Equal(JsonValueKind.Null, recap.GetProperty("eventSlug").ValueKind);
        Assert.Equal("Heat", recap.GetProperty("winnerMovies")[0].GetProperty("title").GetString());
        Assert.DoesNotContain(slug, recap.GetRawText(), StringComparison.Ordinal);
    }

    [Fact]
    public async Task Recap_ReadByTheHost_GivesTheLinkOfTheNight()
    {
        var host = await IntegrationTestAuth.NewRegisteredClientAsync(_factory);
        var (slug, recapSlug) = await CreateNightWithAWinnerAsync(host);

        var recap = await host.GetFromJsonAsync<JsonElement>($"/api/v1/recaps/{recapSlug}");

        Assert.Equal(slug, recap.GetProperty("eventSlug").GetString());
    }

    [Fact]
    public async Task Recap_TheLinkOfTheNight_DoesNotOpenTheRecap()
    {
        var host = await IntegrationTestAuth.NewRegisteredClientAsync(_factory);
        var (slug, _) = await CreateNightWithAWinnerAsync(host);

        var res = await _factory.CreateClient().GetAsync($"/api/v1/recaps/{slug}");

        Assert.Equal(HttpStatusCode.NotFound, res.StatusCode);
    }
}
