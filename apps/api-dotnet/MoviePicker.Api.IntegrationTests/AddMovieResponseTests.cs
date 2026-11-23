using System.Net.Http.Json;
using System.Text.Json;
using MoviePicker.Api.Tests.Builders;
using Xunit;

namespace MoviePicker.Api.IntegrationTests;

public sealed class AddMovieResponseTests : IClassFixture<MoviePickerApplicationFactory>
{
    private static readonly int[] ScienceFiction = [878];

    private readonly MoviePickerApplicationFactory _factory;

    public AddMovieResponseTests(MoviePickerApplicationFactory factory) => _factory = factory;

    [Fact]
    public async Task PostMovie_RespondsWithTheMovieExactlyAsTheEventListThenShowsIt()
    {
        var client = await IntegrationTestAuth.NewRegisteredClientAsync(_factory, "Proposeuse");
        var createRes = await client.PostAsJsonAsync(
            "/api/v1/events",
            new { title = "Soirée réponse", date = TestDates.Upcoming, time = "20:00" });
        createRes.EnsureSuccessStatusCode();
        var created = await createRes.Content.ReadFromJsonAsync<JsonElement>();
        var slug = created.GetProperty("slug").GetString()!;
        var participantId = created.GetProperty("creatorParticipant").GetProperty("_id").GetString()!;

        var postRes = await client.PostAsJsonAsync($"/api/v1/events/{slug}/movies", new
        {
            tmdbId = 27205,
            title = "Inception",
            year = "2010",
            posterPath = "https://image.tmdb.org/t/p/w154/abc.jpg",
            genreIds = ScienceFiction,
            participantId
        });
        postRes.EnsureSuccessStatusCode();
        var posted = await postRes.Content.ReadFromJsonAsync<JsonElement>();

        var listed = await client.GetFromJsonAsync<JsonElement>($"/api/v1/events/{slug}/movies?participantId={participantId}");
        var listedMovie = Assert.Single(listed.EnumerateArray().ToList());

        Assert.Equal(listedMovie.GetRawText(), posted.GetRawText());
        Assert.Equal(0, posted.GetProperty("score").GetInt32());
        Assert.Equal(JsonValueKind.Null, posted.GetProperty("myVote").ValueKind);
        Assert.Equal(120, posted.GetProperty("runtimeMinutes").GetInt32());
        Assert.Equal(JsonValueKind.Null, posted.GetProperty("posterPath").ValueKind);
    }
}
