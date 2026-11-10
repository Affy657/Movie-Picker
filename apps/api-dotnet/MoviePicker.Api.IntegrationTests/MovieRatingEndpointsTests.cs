using System.Globalization;
using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.Extensions.DependencyInjection;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Domain;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Tests.Builders;
using Xunit;

namespace MoviePicker.Api.IntegrationTests;

public sealed class MovieRatingEndpointsTests : IClassFixture<MoviePickerApplicationFactory>
{
    private readonly MoviePickerApplicationFactory _factory;

    public MovieRatingEndpointsTests(MoviePickerApplicationFactory factory) => _factory = factory;

    private sealed record Night(string Slug, string HostParticipantId, string WinnerMovieId, string OtherMovieId);

    private static async Task<(string Slug, string ParticipantId)> CreateEventAsync(HttpClient client, string title)
    {
        var create = await client.PostAsJsonAsync("/api/v1/events", new { title, date = TestDates.Upcoming, time = "20:00" });
        Assert.Equal(HttpStatusCode.Created, create.StatusCode);
        var json = await create.Content.ReadFromJsonAsync<JsonElement>();
        return (json.GetProperty("slug").GetString()!, json.GetProperty("creatorParticipant").GetProperty("_id").GetString()!);
    }

    private static async Task<string> AddMovieAsync(HttpClient client, string slug, string participantId, int tmdbId, string title)
    {
        var res = await client.PostAsJsonAsync(
            $"/api/v1/events/{slug}/movies",
            new { tmdbId, title, year = "2020", posterPath = (string?)null, participantId });
        res.EnsureSuccessStatusCode();
        var json = await res.Content.ReadFromJsonAsync<JsonElement>();
        return json.GetProperty("_id").GetString()!;
    }

    private static async Task<string> JoinAsync(HttpClient client, string slug, string pseudo)
    {
        var res = await client.PostAsJsonAsync($"/api/v1/events/{slug}/join", new { pseudo });
        Assert.True(res.StatusCode is HttpStatusCode.Created or HttpStatusCode.OK, $"join returned {(int)res.StatusCode}");
        var json = await res.Content.ReadFromJsonAsync<JsonElement>();
        return json.TryGetProperty("_id", out var id)
            ? id.GetString()!
            : json.GetProperty("participant").GetProperty("_id").GetString()!;
    }

    private static async Task<Night> FinishedNightAsync(HttpClient host, string title, HttpClient? guest = null, string guestPseudo = "Bob")
    {
        var (slug, hostParticipantId) = await CreateEventAsync(host, title);
        var winner = await AddMovieAsync(host, slug, hostParticipantId, 603, "The Matrix");
        var other = await AddMovieAsync(host, slug, hostParticipantId, 27205, "Inception");
        if (guest is not null)
            await JoinAsync(guest, slug, guestPseudo);
        (await host.PostAsJsonAsync($"/api/v1/events/{slug}/winner", new { movieId = winner })).EnsureSuccessStatusCode();
        (await host.PostAsJsonAsync($"/api/v1/events/{slug}/close", new { })).EnsureSuccessStatusCode();
        return new Night(slug, hostParticipantId, winner, other);
    }

    private static async Task<JsonElement> MovieAsync(HttpClient client, string slug, string movieId)
    {
        var res = await client.GetAsync($"/api/v1/events/{slug}/movies");
        res.EnsureSuccessStatusCode();
        var list = await res.Content.ReadFromJsonAsync<JsonElement>();
        return list.EnumerateArray().Single(m => m.GetProperty("_id").GetString() == movieId);
    }

    private static Task<HttpResponseMessage> RateAsync(HttpClient client, string slug, string movieId, string participantId, int value) =>
        client.PutAsJsonAsync($"/api/v1/events/{slug}/movies/{movieId}/rating", new { participantId, value });

    private static async Task<JsonElement> MyFinishedEventAsync(HttpClient client, string slug)
    {
        var res = await client.GetAsync("/api/v1/events/mine?scope=finished");
        res.EnsureSuccessStatusCode();
        var list = await res.Content.ReadFromJsonAsync<JsonElement>();
        return list.GetProperty("events").EnumerateArray().Single(e => e.GetProperty("slug").GetString() == slug);
    }

    private async Task<string> StartTheNightAsync(string slug)
    {
        using var scope = _factory.Services.CreateScope();
        var events = scope.ServiceProvider.GetRequiredService<IEventRepository>();
        var evt = await events.GetByIdOrSlugAsync(slug);
        var startedAt = TimeZoneInfo.ConvertTime(DateTimeOffset.UtcNow.AddMinutes(-30), EventSchedule.ParisTimeZone);
        await events.UpdateAsync(evt! with
        {
            Date = startedAt.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture),
            Time = startedAt.ToString("HH:mm", CultureInfo.InvariantCulture)
        });
        return evt.Id;
    }

    private async Task<Event> ReadEventAsync(string slug)
    {
        using var scope = _factory.Services.CreateScope();
        var events = scope.ServiceProvider.GetRequiredService<IEventRepository>();
        return (await events.GetByIdOrSlugAsync(slug))!;
    }

    private async Task<IReadOnlyList<MovieRating>> StoredRatingsAsync(string eventId)
    {
        using var scope = _factory.Services.CreateScope();
        var ratings = scope.ServiceProvider.GetRequiredService<IMovieRatingRepository>();
        return await ratings.ListByEventIdAsync(eventId);
    }

    private static Task<HttpResponseMessage> CancelTheDrawAsync(HttpClient host, string slug, string movieId, string cancellation) =>
        cancellation == "reset-wheel"
            ? host.DeleteAsync($"/api/v1/events/{slug}/wheel")
            : host.DeleteAsync($"/api/v1/events/{slug}/winners/{movieId}");

    private static Task<HttpResponseMessage> DrawAsync(HttpClient host, string slug, string movieId) =>
        host.PostAsJsonAsync($"/api/v1/events/{slug}/winner", new { movieId });

    private static async Task<IReadOnlyList<int>> VisibleRatingsAsync(HttpClient client, string slug, string movieId) =>
        (await MovieAsync(client, slug, movieId)).GetProperty("ratings").EnumerateArray()
            .Select(r => r.GetProperty("value").GetInt32())
            .Order()
            .ToList();

    [Theory]
    [InlineData("reset-wheel")]
    [InlineData("remove-winner")]
    public async Task RemovingAParticipant_AfterTheDrawIsCancelled_PurgesTheirRatingsAndBumpsWriteSeq(string cancellation)
    {
        var host = await IntegrationTestAuth.NewRegisteredClientAsync(_factory);
        var guest = await IntegrationTestAuth.NewRegisteredClientAsync(_factory);
        var (slug, hostParticipantId) = await CreateEventAsync(host, "Soirée annulée");
        var movieId = await AddMovieAsync(host, slug, hostParticipantId, 603, "The Matrix");
        var guestParticipantId = await JoinAsync(guest, slug, "Bob");
        (await DrawAsync(host, slug, movieId)).EnsureSuccessStatusCode();
        var eventId = await StartTheNightAsync(slug);
        (await RateAsync(host, slug, movieId, hostParticipantId, 8)).EnsureSuccessStatusCode();
        (await RateAsync(guest, slug, movieId, guestParticipantId, 2)).EnsureSuccessStatusCode();

        (await CancelTheDrawAsync(host, slug, movieId, cancellation)).EnsureSuccessStatusCode();
        var beforeRemoval = await ReadEventAsync(slug);
        (await host.DeleteAsync($"/api/v1/events/{slug}/participants/{guestParticipantId}")).EnsureSuccessStatusCode();

        Assert.True((await ReadEventAsync(slug)).WriteSeq > beforeRemoval.WriteSeq);
        Assert.Equal(hostParticipantId, Assert.Single(await StoredRatingsAsync(eventId)).ParticipantId);

        var rejoinedParticipantId = await JoinAsync(guest, slug, "Bob");
        (await DrawAsync(host, slug, movieId)).EnsureSuccessStatusCode();
        (await RateAsync(guest, slug, movieId, rejoinedParticipantId, 4)).EnsureSuccessStatusCode();
        Assert.Equal([4, 8], await VisibleRatingsAsync(host, slug, movieId));
    }

    [Fact]
    public async Task RemovingAParticipant_PurgesEveryRatingOfTheMoviesTheyProposed()
    {
        var host = await IntegrationTestAuth.NewRegisteredClientAsync(_factory);
        var guest = await IntegrationTestAuth.NewRegisteredClientAsync(_factory);
        var (slug, hostParticipantId) = await CreateEventAsync(host, "Proposition retirée");
        var guestParticipantId = await JoinAsync(guest, slug, "Bob");
        var movieId = await AddMovieAsync(guest, slug, guestParticipantId, 603, "The Matrix");
        (await DrawAsync(host, slug, movieId)).EnsureSuccessStatusCode();
        var eventId = await StartTheNightAsync(slug);
        (await RateAsync(host, slug, movieId, hostParticipantId, 8)).EnsureSuccessStatusCode();

        (await CancelTheDrawAsync(host, slug, movieId, "reset-wheel")).EnsureSuccessStatusCode();
        (await host.DeleteAsync($"/api/v1/events/{slug}/participants/{guestParticipantId}")).EnsureSuccessStatusCode();

        Assert.Empty(await StoredRatingsAsync(eventId));
    }

    [Theory]
    [InlineData("reset-wheel")]
    [InlineData("remove-winner")]
    public async Task DeletingAMovie_AfterTheDrawIsCancelled_PurgesItsRatingsAndBumpsWriteSeq(string cancellation)
    {
        var host = await IntegrationTestAuth.NewRegisteredClientAsync(_factory);
        var (slug, participantId) = await CreateEventAsync(host, "Film retiré");
        (await host.PatchAsJsonAsync($"/api/v1/events/{slug}/config", new { winnerCount = 2 })).EnsureSuccessStatusCode();
        var deletedMovie = await AddMovieAsync(host, slug, participantId, 603, "The Matrix");
        var keptMovie = await AddMovieAsync(host, slug, participantId, 27205, "Inception");
        (await DrawAsync(host, slug, deletedMovie)).EnsureSuccessStatusCode();
        (await DrawAsync(host, slug, keptMovie)).EnsureSuccessStatusCode();
        var eventId = await StartTheNightAsync(slug);
        (await RateAsync(host, slug, deletedMovie, participantId, 8)).EnsureSuccessStatusCode();
        (await RateAsync(host, slug, keptMovie, participantId, 3)).EnsureSuccessStatusCode();

        (await CancelTheDrawAsync(host, slug, deletedMovie, cancellation)).EnsureSuccessStatusCode();
        if (cancellation == "remove-winner")
            (await CancelTheDrawAsync(host, slug, keptMovie, cancellation)).EnsureSuccessStatusCode();
        var beforeDeletion = await ReadEventAsync(slug);
        var delete = new HttpRequestMessage(HttpMethod.Delete, $"/api/v1/events/{slug}/movies/{deletedMovie}")
        {
            Content = JsonContent.Create(new { participantId })
        };
        (await host.SendAsync(delete)).EnsureSuccessStatusCode();

        Assert.True((await ReadEventAsync(slug)).WriteSeq > beforeDeletion.WriteSeq);
        Assert.Equal(keptMovie, Assert.Single(await StoredRatingsAsync(eventId)).MovieId);
    }

    [Fact]
    public async Task ListMine_TellsEachViewerTheGroupAverageTheirOwnRatingAndWhatIsLeftToRate()
    {
        var host = await IntegrationTestAuth.NewRegisteredClientAsync(_factory);
        var guest = await IntegrationTestAuth.NewRegisteredClientAsync(_factory);
        var night = await FinishedNightAsync(host, "Soirée à noter", guest);

        var beforeAnyRating = await MyFinishedEventAsync(guest, night.Slug);
        Assert.Equal(JsonValueKind.Null, beforeAnyRating.GetProperty("averageRating").ValueKind);
        Assert.True(beforeAnyRating.GetProperty("hasWinnerToRate").GetBoolean());

        (await RateAsync(host, night.Slug, night.WinnerMovieId, night.HostParticipantId, 8)).EnsureSuccessStatusCode();

        var forHost = await MyFinishedEventAsync(host, night.Slug);
        Assert.Equal(8, forHost.GetProperty("averageRating").GetDouble());
        Assert.Equal(8, forHost.GetProperty("myRating").GetDouble());
        Assert.False(forHost.GetProperty("hasWinnerToRate").GetBoolean());

        var forGuest = await MyFinishedEventAsync(guest, night.Slug);
        Assert.Equal(8, forGuest.GetProperty("averageRating").GetDouble());
        Assert.Equal(JsonValueKind.Null, forGuest.GetProperty("myRating").ValueKind);
        Assert.True(forGuest.GetProperty("hasWinnerToRate").GetBoolean());
    }

    [Fact]
    public async Task Rate_ThenRateAgain_KeepsOneRatingPerParticipantAndExposesItOnTheMovie()
    {
        var host = await IntegrationTestAuth.NewRegisteredClientAsync(_factory);
        var night = await FinishedNightAsync(host, "Soirée notée");

        var first = await RateAsync(host, night.Slug, night.WinnerMovieId, night.HostParticipantId, 7);
        Assert.Equal(HttpStatusCode.OK, first.StatusCode);
        var firstBody = await first.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal(7, firstBody.GetProperty("value").GetInt32());

        var second = await RateAsync(host, night.Slug, night.WinnerMovieId, night.HostParticipantId, 9);
        Assert.Equal(HttpStatusCode.OK, second.StatusCode);

        var movie = await MovieAsync(host, night.Slug, night.WinnerMovieId);
        var ratings = movie.GetProperty("ratings").EnumerateArray().ToList();
        var rating = Assert.Single(ratings);
        Assert.Equal(night.HostParticipantId, rating.GetProperty("participantId").GetString());
        Assert.Equal(9, rating.GetProperty("value").GetInt32());
        Assert.Empty((await MovieAsync(host, night.Slug, night.OtherMovieId)).GetProperty("ratings").EnumerateArray());
    }

    [Fact]
    public async Task DeleteRating_RemovesIt_ThenASecondDeleteIs404()
    {
        var host = await IntegrationTestAuth.NewRegisteredClientAsync(_factory);
        var night = await FinishedNightAsync(host, "Soirée effacée");
        (await RateAsync(host, night.Slug, night.WinnerMovieId, night.HostParticipantId, 5)).EnsureSuccessStatusCode();

        var request = new HttpRequestMessage(HttpMethod.Delete, $"/api/v1/events/{night.Slug}/movies/{night.WinnerMovieId}/rating")
        {
            Content = JsonContent.Create(new { participantId = night.HostParticipantId })
        };
        var deleted = await host.SendAsync(request);
        Assert.Equal(HttpStatusCode.NoContent, deleted.StatusCode);
        Assert.Empty((await MovieAsync(host, night.Slug, night.WinnerMovieId)).GetProperty("ratings").EnumerateArray());

        var again = await host.SendAsync(new HttpRequestMessage(HttpMethod.Delete, $"/api/v1/events/{night.Slug}/movies/{night.WinnerMovieId}/rating")
        {
            Content = JsonContent.Create(new { participantId = night.HostParticipantId })
        });
        Assert.Equal(HttpStatusCode.NotFound, again.StatusCode);
    }

    [Fact]
    public async Task Rate_BeforeTheNightStarts_Is409()
    {
        var host = await IntegrationTestAuth.NewRegisteredClientAsync(_factory);
        var (slug, participantId) = await CreateEventAsync(host, "Soirée à venir");
        var movieId = await AddMovieAsync(host, slug, participantId, 603, "The Matrix");
        (await host.PostAsJsonAsync($"/api/v1/events/{slug}/winner", new { movieId })).EnsureSuccessStatusCode();

        var res = await RateAsync(host, slug, movieId, participantId, 8);

        Assert.Equal(HttpStatusCode.Conflict, res.StatusCode);
        var body = await res.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("rating_only_once_started", body.GetProperty("reason").GetString());
    }

    [Fact]
    public async Task Rate_AMovieThatWasNotChosen_Is409()
    {
        var host = await IntegrationTestAuth.NewRegisteredClientAsync(_factory);
        var night = await FinishedNightAsync(host, "Soirée non choisie");

        var res = await RateAsync(host, night.Slug, night.OtherMovieId, night.HostParticipantId, 8);

        Assert.Equal(HttpStatusCode.Conflict, res.StatusCode);
        var body = await res.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("rating_only_chosen_movie", body.GetProperty("reason").GetString());
    }

    [Fact]
    public async Task Rate_ForSomeoneElsesParticipation_Is403()
    {
        var host = await IntegrationTestAuth.NewRegisteredClientAsync(_factory);
        var guest = await IntegrationTestAuth.NewRegisteredClientAsync(_factory);
        var night = await FinishedNightAsync(host, "Soirée usurpée", guest);

        var res = await RateAsync(guest, night.Slug, night.WinnerMovieId, night.HostParticipantId, 8);

        Assert.Equal(HttpStatusCode.Forbidden, res.StatusCode);
        var body = await res.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("rating_own_participation_only", body.GetProperty("reason").GetString());
    }

    [Theory]
    [InlineData(0)]
    [InlineData(11)]
    public async Task Rate_OutOfRange_Is400(int value)
    {
        var host = await IntegrationTestAuth.NewRegisteredClientAsync(_factory);
        var night = await FinishedNightAsync(host, "Soirée hors bornes");

        var res = await RateAsync(host, night.Slug, night.WinnerMovieId, night.HostParticipantId, value);

        Assert.Equal(HttpStatusCode.BadRequest, res.StatusCode);
    }

    [Fact]
    public async Task EveryParticipantRating_IsVisibleToAnAnonymousReader()
    {
        var host = await IntegrationTestAuth.NewRegisteredClientAsync(_factory);
        var guest = await IntegrationTestAuth.NewRegisteredClientAsync(_factory);
        var night = await FinishedNightAsync(host, "Soirée publique", guest, "Chloé");
        var detail = await (await guest.GetAsync($"/api/v1/events/slug/{night.Slug}")).Content.ReadFromJsonAsync<JsonElement>();
        var guestParticipantId = detail.GetProperty("myParticipant").GetProperty("_id").GetString()!;
        (await RateAsync(host, night.Slug, night.WinnerMovieId, night.HostParticipantId, 8)).EnsureSuccessStatusCode();
        (await RateAsync(guest, night.Slug, night.WinnerMovieId, guestParticipantId, 6)).EnsureSuccessStatusCode();

        var anonymous = _factory.CreateClient();
        var movie = await MovieAsync(anonymous, night.Slug, night.WinnerMovieId);

        var values = movie.GetProperty("ratings").EnumerateArray()
            .ToDictionary(r => r.GetProperty("participantId").GetString()!, r => r.GetProperty("value").GetInt32());
        Assert.Equal(2, values.Count);
        Assert.Equal(8, values[night.HostParticipantId]);
        Assert.Equal(6, values[guestParticipantId]);
    }
}
