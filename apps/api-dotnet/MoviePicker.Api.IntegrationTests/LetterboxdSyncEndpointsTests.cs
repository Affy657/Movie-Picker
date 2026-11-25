using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Domain.Entities;
using Xunit;

namespace MoviePicker.Api.IntegrationTests;

public sealed class LetterboxdSyncEndpointsTests : IClassFixture<MoviePickerApplicationFactory>, IDisposable
{
    private const string StubFilm = "Film E2E Stub";
    private const int StubFilmId = 999_001;
    private const string OtherStubFilm = "Autre film test";
    private const int OtherStubFilmId = 999_002;

    private readonly WebApplicationFactory<Program> _host;
    private readonly FakeLetterboxd _letterboxd = new();

    public LetterboxdSyncEndpointsTests(MoviePickerApplicationFactory factory)
    {
        _host = factory.WithWebHostBuilder(builder => builder.ConfigureTestServices(services =>
        {
            services.RemoveAll<ILetterboxdWatchlistClient>();
            services.AddSingleton<ILetterboxdWatchlistClient>(_letterboxd);
        }));
    }

    public void Dispose() => _host.Dispose();

    private sealed class FakeLetterboxd : ILetterboxdWatchlistClient
    {
        public LetterboxdFilmsSnapshot Watchlist { get; set; } = new([], true);

        public LetterboxdFilmsSnapshot Watched { get; set; } = new([], true);

        public int Reads { get; private set; }

        public Task<LetterboxdFilmsSnapshot> GetWatchlistAsync(string username, CancellationToken ct = default)
        {
            Reads++;
            return Task.FromResult(Watchlist);
        }

        public Task<LetterboxdFilmsSnapshot> GetWatchedFilmsAsync(string username, CancellationToken ct = default)
        {
            Reads++;
            return Task.FromResult(Watched);
        }
    }

    private async Task<(HttpClient Client, string UserId)> ConnectedUserAsync()
    {
        var client = _host.CreateClient();
        var registered = await client.PostAsJsonAsync(
            "/api/v1/auth/register",
            new RegisterRequest { Email = $"u{Guid.NewGuid():N}@test.local", Password = "abcd1234", DisplayName = "Cinéphile" });
        registered.EnsureSuccessStatusCode();
        IntegrationTestAuth.ApplySessionCookie(client, registered);
        var me = await PatchMeAsync(client, new { letterboxdUsername = "cinephile" });
        return (client, me.GetProperty("userId").GetString()!);
    }

    private static async Task<JsonElement> BodyAsync(HttpResponseMessage response)
    {
        Assert.True(response.IsSuccessStatusCode, await response.Content.ReadAsStringAsync());
        return JsonElement.Parse(await response.Content.ReadAsStringAsync());
    }

    private static async Task<JsonElement> PatchMeAsync(HttpClient client, object patch) =>
        await BodyAsync(await client.PatchAsJsonAsync("/api/v1/auth/me", patch));

    private static async Task<JsonElement> MeAsync(HttpClient client) =>
        await BodyAsync(await client.GetAsync("/api/v1/auth/me"));

    private static async Task<JsonElement> SyncAsync(HttpClient client) =>
        await BodyAsync(await client.PostAsync("/api/v1/letterboxd/sync?force=true", null));

    private static async Task<JsonElement> WatchedStatusAsync(HttpClient client, int tmdbId) =>
        await BodyAsync(await client.GetAsync($"/api/v1/watched/{tmdbId}"));

    private static async Task<Dictionary<int, bool>> ToWatchAsync(HttpClient client) =>
        (await BodyAsync(await client.GetAsync("/api/v1/watchlist")))
            .GetProperty("items")
            .EnumerateArray()
            .ToDictionary(item => item.GetProperty("tmdbId").GetInt32(), item => item.GetProperty("onLetterboxd").GetBoolean());

    private Task AllowAnotherSyncAsync(string userId) => BackdateSyncAsync(userId, null);

    private async Task BackdateSyncAsync(string userId, string? watchedError)
    {
        var twoHoursAgo = DateTimeOffset.UtcNow.AddHours(-2);
        using var scope = _host.Services.CreateScope();
        await scope.ServiceProvider.GetRequiredService<IUserRepository>()
            .SetLetterboxdSyncStatusAsync(
                userId,
                twoHoursAgo,
                watchedError,
                new Dictionary<LetterboxdImportTarget, LetterboxdListSync>
                {
                    [LetterboxdImportTarget.Watchlist] = new(twoHoursAgo, null),
                    [LetterboxdImportTarget.Watched] = new(twoHoursAgo, watchedError)
                });
    }

    [Fact]
    public async Task Sync_ImportsTheWatchedFilms_FlagsTheTitlesToWatch_AndCountsWhatCameFromLetterboxd()
    {
        var (client, _) = await ConnectedUserAsync();
        (await client.PostAsJsonAsync("/api/v1/watchlist", new { tmdbId = 603, title = "Matrix", year = "1999" })).EnsureSuccessStatusCode();
        (await client.PostAsJsonAsync("/api/v1/watchlist", new { tmdbId = OtherStubFilmId, title = OtherStubFilm, year = "2023" })).EnsureSuccessStatusCode();
        _letterboxd.Watchlist = new([new LetterboxdFilm("film-e2e-stub", StubFilm, "2024")], true);
        _letterboxd.Watched = new(
            [
                new LetterboxdFilm("autre-film-test", OtherStubFilm, "2023", Rating: 8, WatchedOn: new DateOnly(2026, 11, 1)),
                new LetterboxdFilm("titre-ambigu", "Titre ambigu", "2020", Rating: 5)
            ],
            true);

        var report = await SyncAsync(client);

        var lists = report.GetProperty("lists").EnumerateArray().ToList();
        Assert.Equal(
            [("watchlist", 1, 1, 1, 0), ("watched", 1, 0, 2, 1)],
            lists.Select(list => (
                list.GetProperty("target").GetString(),
                list.GetProperty("added").GetInt32(),
                list.GetProperty("removed").GetInt32(),
                list.GetProperty("totalOnLetterboxd").GetInt32(),
                list.GetProperty("pendingChoices").GetArrayLength())));
        var choice = Assert.Single(lists[1].GetProperty("pendingChoices").EnumerateArray());
        Assert.Equal(("watched", 5), (choice.GetProperty("target").GetString(), choice.GetProperty("rating").GetInt32()));
        Assert.Equal(
            (1, 1, 1),
            (report.GetProperty("watchedAdded").GetInt32(), report.GetProperty("removed").GetInt32(),
                report.GetProperty("watchedPendingChoices").GetArrayLength()));

        var status = await WatchedStatusAsync(client, OtherStubFilmId);
        Assert.Equal(("elsewhere", 8), (status.GetProperty("status").GetString(), status.GetProperty("rating").GetInt32()));
        Assert.Equal(new DateTimeOffset(2026, 11, 1, 12, 0, 0, TimeSpan.Zero), status.GetProperty("watchedAt").GetDateTimeOffset());
        Assert.Equal(new Dictionary<int, bool> { [603] = false, [StubFilmId] = true }, await ToWatchAsync(client));

        var me = await MeAsync(client);
        Assert.Equal(
            (true, true, 1, 1, 1),
            (me.GetProperty("letterboxdSyncWatchlist").GetBoolean(), me.GetProperty("letterboxdSyncWatched").GetBoolean(),
                me.GetProperty("letterboxdWatchlistCount").GetInt32(), me.GetProperty("letterboxdWatchedCount").GetInt32(),
                me.GetProperty("letterboxdPendingReconciliationCount").GetInt32()));
    }

    [Fact]
    public async Task Confirm_AWatchedChoice_AddsItToFilmsVus_AndClearsThePendingCount()
    {
        var (client, _) = await ConnectedUserAsync();
        _letterboxd.Watched = new([new LetterboxdFilm("titre-ambigu", "Titre ambigu", "2020", Rating: 5)], true);
        await SyncAsync(client);

        var confirmed = await BodyAsync(await client.PostAsJsonAsync("/api/v1/letterboxd/confirm", new
        {
            selections = Array.Empty<object>(),
            watchedSelections = new[]
            {
                new { tmdbId = OtherStubFilmId, mediaType = "movie", title = OtherStubFilm, year = "2023", letterboxdSlug = "titre-ambigu", rating = 5 }
            },
            remainingUnresolvedCount = 0
        }));

        Assert.Equal((1, 0, 0), (confirmed.GetProperty("watchedAdded").GetInt32(), confirmed.GetProperty("added").GetInt32(), confirmed.GetProperty("pendingReconciliationCount").GetInt32()));
        Assert.Equal(5, (await WatchedStatusAsync(client, OtherStubFilmId)).GetProperty("rating").GetInt32());
        Assert.Equal(1, (await MeAsync(client)).GetProperty("letterboxdWatchedCount").GetInt32());
    }

    [Fact]
    public async Task Confirm_AWatchedChoiceRatedOutOfRange_IsRejected()
    {
        var (client, _) = await ConnectedUserAsync();

        var response = await client.PostAsJsonAsync("/api/v1/letterboxd/confirm", new
        {
            selections = Array.Empty<object>(),
            watchedSelections = new[] { new { tmdbId = OtherStubFilmId, title = OtherStubFilm, rating = 11 } }
        });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Sync_KeepsARatingGivenInMoviePicker_AndOnlyRemovesWhatLetterboxdBrought()
    {
        var (client, userId) = await ConnectedUserAsync();
        (await client.PostAsJsonAsync("/api/v1/watched", new { tmdbId = OtherStubFilmId, title = OtherStubFilm, year = "2023", rating = 9 })).EnsureSuccessStatusCode();
        _letterboxd.Watched = new(
            [
                new LetterboxdFilm("autre-film-test", OtherStubFilm, "2023", Rating: 2),
                new LetterboxdFilm("film-e2e-stub", StubFilm, "2024", Rating: 6)
            ],
            true);

        await SyncAsync(client);

        Assert.Equal(9, (await WatchedStatusAsync(client, OtherStubFilmId)).GetProperty("rating").GetInt32());
        Assert.Equal(6, (await WatchedStatusAsync(client, StubFilmId)).GetProperty("rating").GetInt32());
        Assert.Equal(1, (await MeAsync(client)).GetProperty("letterboxdWatchedCount").GetInt32());

        (await client.PutAsJsonAsync($"/api/v1/watched/{StubFilmId}/rating", new { value = 10 })).EnsureSuccessStatusCode();
        _letterboxd.Watched = new([new LetterboxdFilm("film-e2e-stub", StubFilm, "2024", Rating: 3)], true);
        await AllowAnotherSyncAsync(userId);
        await SyncAsync(client);

        Assert.Equal(10, (await WatchedStatusAsync(client, StubFilmId)).GetProperty("rating").GetInt32());

        _letterboxd.Watched = new([], true);
        await AllowAnotherSyncAsync(userId);
        var report = await SyncAsync(client);

        Assert.Equal(1, report.GetProperty("watchedRemoved").GetInt32());
        Assert.Equal("none", (await WatchedStatusAsync(client, StubFilmId)).GetProperty("status").GetString());
        Assert.Equal(9, (await WatchedStatusAsync(client, OtherStubFilmId)).GetProperty("rating").GetInt32());
    }

    [Fact]
    public async Task Sync_WithBothListsSwitchedOff_ReadsNothingAndKeepsWhatWasImported()
    {
        var (client, userId) = await ConnectedUserAsync();
        _letterboxd.Watched = new([new LetterboxdFilm("film-e2e-stub", StubFilm, "2024")], true);
        await SyncAsync(client);
        var readsBefore = _letterboxd.Reads;

        var me = await PatchMeAsync(client, new { letterboxdSyncWatchlist = false, letterboxdSyncWatched = false });
        await AllowAnotherSyncAsync(userId);
        var report = await SyncAsync(client);

        Assert.Equal((false, false), (me.GetProperty("letterboxdSyncWatchlist").GetBoolean(), me.GetProperty("letterboxdSyncWatched").GetBoolean()));
        Assert.True(report.GetProperty("skipped").GetBoolean());
        Assert.Equal(readsBefore, _letterboxd.Reads);
        Assert.Equal("elsewhere", (await WatchedStatusAsync(client, StubFilmId)).GetProperty("status").GetString());
        Assert.Equal(1, (await MeAsync(client)).GetProperty("letterboxdWatchedCount").GetInt32());
    }

    [Fact]
    public async Task Sync_UnreadableWatchedFilms_StillSyncsTheWatchlist_AndRecordsTheWatchedError()
    {
        var (client, userId) = await ConnectedUserAsync();
        _letterboxd.Watched = new([new LetterboxdFilm("autre-film-test", OtherStubFilm, "2023")], true);
        await SyncAsync(client);
        _letterboxd.Watchlist = new([new LetterboxdFilm("film-e2e-stub", StubFilm, "2024")], true);
        _letterboxd.Watched = LetterboxdFilmsSnapshot.Failed();
        await AllowAnotherSyncAsync(userId);

        var report = await SyncAsync(client);

        Assert.Equal(("letterboxd_watched_incomplete", 1), (report.GetProperty("error").GetString(), report.GetProperty("added").GetInt32()));
        Assert.Equal(new Dictionary<int, bool> { [StubFilmId] = true }, await ToWatchAsync(client));
        Assert.Equal("elsewhere", (await WatchedStatusAsync(client, OtherStubFilmId)).GetProperty("status").GetString());
        var me = await MeAsync(client);
        Assert.Equal("letterboxd_watched_incomplete", me.GetProperty("letterboxdLastSyncError").GetString());
        Assert.True(me.GetProperty("letterboxdLastSyncAt").GetDateTimeOffset() > DateTimeOffset.UtcNow.AddMinutes(-5));
    }

    [Fact]
    public async Task Sync_WatchedFilmsThatFailedAlone_AreRetriedWithoutRereadingTheWatchlist()
    {
        var (client, userId) = await ConnectedUserAsync();
        _letterboxd.Watched = LetterboxdFilmsSnapshot.Failed();
        await SyncAsync(client);
        await BackdateSyncAsync(userId, "letterboxd_watched_incomplete");
        _letterboxd.Watched = new([new LetterboxdFilm("film-e2e-stub", StubFilm, "2024", Rating: 7)], true);
        var readsBefore = _letterboxd.Reads;

        var report = await BodyAsync(await client.PostAsync("/api/v1/letterboxd/sync?force=false", null));

        var list = Assert.Single(report.GetProperty("lists").EnumerateArray());
        Assert.Equal(("watched", 1, false), (list.GetProperty("target").GetString(), list.GetProperty("added").GetInt32(), list.GetProperty("incomplete").GetBoolean()));
        Assert.Equal(readsBefore + 1, _letterboxd.Reads);
        Assert.Equal(JsonValueKind.Null, (await MeAsync(client)).GetProperty("letterboxdLastSyncError").ValueKind);
    }

    [Fact]
    public async Task Sync_UnreadableWatchlist_StillSyncsTheWatchedFilms_AndRecordsTheWatchlistError()
    {
        var (client, _) = await ConnectedUserAsync();
        _letterboxd.Watchlist = LetterboxdFilmsSnapshot.Failed();
        _letterboxd.Watched = new([new LetterboxdFilm("film-e2e-stub", StubFilm, "2024", Rating: 7)], true);

        var report = await SyncAsync(client);

        Assert.Equal(("letterboxd_watchlist_incomplete", 1), (report.GetProperty("error").GetString(), report.GetProperty("watchedAdded").GetInt32()));
        Assert.Equal(7, (await WatchedStatusAsync(client, StubFilmId)).GetProperty("rating").GetInt32());
        Assert.Equal("letterboxd_watchlist_incomplete", (await MeAsync(client)).GetProperty("letterboxdLastSyncError").GetString());
    }

    [Fact]
    public async Task Sync_BothListsUnreadable_AnswersTheWatchlistReasonAndChangesNothing()
    {
        var (client, _) = await ConnectedUserAsync();
        _letterboxd.Watchlist = LetterboxdFilmsSnapshot.Failed();
        _letterboxd.Watched = LetterboxdFilmsSnapshot.Failed();

        var response = await client.PostAsync("/api/v1/letterboxd/sync?force=true", null);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal("letterboxd_watchlist_incomplete", JsonElement.Parse(await response.Content.ReadAsStringAsync()).GetProperty("reason").GetString());
        Assert.Equal("letterboxd_watchlist_incomplete", (await MeAsync(client)).GetProperty("letterboxdLastSyncError").GetString());
    }
}
