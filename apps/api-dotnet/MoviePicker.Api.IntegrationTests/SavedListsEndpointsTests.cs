using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.DependencyInjection;
using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Domain.Exceptions;
using Xunit;

namespace MoviePicker.Api.IntegrationTests;

public sealed class SavedListsEndpointsTests : IClassFixture<MoviePickerApplicationFactory>
{
    private const string Route = "/api/v1/saved-lists";

    private const string UnknownObjectId = "0123456789abcdef01234567";

    private const string StubSagaName = "Saga stub 1241";

    private static readonly int[] StubSagaFilms = [731_241, 731_242, 731_243, 731_244];

    private static readonly JsonSerializerOptions Json = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        PropertyNameCaseInsensitive = true,
        Converters = { new JsonStringEnumConverter(JsonNamingPolicy.CamelCase) }
    };

    private readonly MoviePickerApplicationFactory _factory;

    public SavedListsEndpointsTests(MoviePickerApplicationFactory factory) => _factory = factory;

    private Task<HttpClient> NewUserAsync(string displayName) =>
        IntegrationTestAuth.NewRegisteredClientAsync(_factory, displayName);

    private static Task<HttpResponseMessage> PostSaveAsync(HttpClient client, string sourceType, string sourceId) =>
        client.PostAsJsonAsync(Route, new { sourceType, sourceId });

    private static async Task<SavedListSummaryResponse> SaveAsync(HttpClient client, string sourceType, string sourceId)
    {
        var response = await PostSaveAsync(client, sourceType, sourceId);
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        return (await response.Content.ReadFromJsonAsync<SavedListSummaryResponse>(Json))!;
    }

    private static Task<SavedListSummaryResponse> SaveSagaAsync(HttpClient client) =>
        SaveAsync(client, "tmdbCollection", "1241");

    private static async Task<IReadOnlyList<SavedListSummaryResponse>> ListAsync(HttpClient client, string query = "")
    {
        var lists = await client.GetFromJsonAsync<SavedListsResponse>(Route + query, Json);
        return lists!.Items;
    }

    private static async Task<string?> ReasonOfAsync(HttpResponseMessage response) =>
        JsonElement.Parse(await response.Content.ReadAsStringAsync()).GetProperty("reason").GetString();

    private static async Task<string> UserIdOfAsync(HttpClient client) =>
        (await client.GetFromJsonAsync<UserProfileResponse>("/api/v1/auth/me", Json))!.UserId;

    private static async Task MarkWatchedAsync(HttpClient client, int tmdbId)
    {
        var response = await client.PostAsJsonAsync("/api/v1/watched", new { tmdbId, mediaType = "movie", title = $"Film {tmdbId}", year = "2001" });
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    private async Task<SavedList> SavedDirectlyAsync(string ownerId, ListSourceType type, string sourceId, string name)
    {
        using var scope = _factory.Services.CreateScope();
        return await scope.ServiceProvider.GetRequiredService<ISavedListRepository>().AddIfAbsentAsync(new SavedList
        {
            OwnerId = ownerId,
            SourceType = type,
            SourceId = sourceId,
            Name = name,
            CreatedAt = DateTimeOffset.UtcNow
        });
    }

    [Theory]
    [InlineData("GET", Route)]
    [InlineData("POST", Route)]
    [InlineData("GET", Route + "/" + UnknownObjectId)]
    [InlineData("DELETE", Route + "/" + UnknownObjectId)]
    [InlineData("POST", Route + "/" + UnknownObjectId + "/copy")]
    public async Task EveryRoute_WithoutASession_IsUnauthorized(string method, string path)
    {
        using var request = new HttpRequestMessage(new HttpMethod(method), path)
        {
            Content = JsonContent.Create(new { sourceType = "tmdbCollection", sourceId = "1241", name = "Ma saga" })
        };

        var response = await _factory.CreateClient().SendAsync(request);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Save_ASaga_AnswersItsSummaryInCamelCase_ThenTheSameSaveOnceSaved()
    {
        var client = await NewUserAsync("SavedSaga");

        var first = await PostSaveAsync(client, "tmdbCollection", " 1241 ");
        var again = await PostSaveAsync(client, "TMDBCOLLECTION", "1241");

        Assert.Equal(HttpStatusCode.Created, first.StatusCode);
        Assert.Equal(HttpStatusCode.OK, again.StatusCode);
        var body = JsonElement.Parse(await first.Content.ReadAsStringAsync());
        Assert.False(string.IsNullOrEmpty(body.GetProperty("id").GetString()));
        Assert.Equal("tmdbCollection", body.GetProperty("sourceType").GetString());
        Assert.Equal("1241", body.GetProperty("sourceId").GetString());
        Assert.Equal(StubSagaName, body.GetProperty("name").GetString());
        Assert.Equal(StubSagaFilms.Length, body.GetProperty("itemCount").GetInt32());
        Assert.Equal(0, body.GetProperty("posterPaths").GetArrayLength());
        Assert.Equal(0, body.GetProperty("watchedCount").GetInt32());
        Assert.False(body.GetProperty("unavailable").GetBoolean());
        Assert.True(body.TryGetProperty("createdAt", out _));
        var second = JsonElement.Parse(await again.Content.ReadAsStringAsync());
        Assert.Equal(body.GetProperty("id").GetString(), second.GetProperty("id").GetString());
        Assert.Single(await ListAsync(client));
    }

    [Theory]
    [InlineData("trending", "1241", HttpStatusCode.BadRequest, ErrorCodes.ListSourceNotSavable)]
    [InlineData("tmdbCollection", "harry-potter", HttpStatusCode.BadRequest, ErrorCodes.ListSourceNotSavable)]
    [InlineData("explorerTheme", "theme-retire", HttpStatusCode.NotFound, ErrorCodes.ListSourceNotFound)]
    [InlineData("", "1241", HttpStatusCode.BadRequest, ErrorCodes.ValidationFailed)]
    public async Task Save_ASourceThatCannotBeSaved_IsRefusedWithItsCode(
        string sourceType,
        string sourceId,
        HttpStatusCode expectedStatus,
        string expectedReason)
    {
        var client = await NewUserAsync("SavedRefused");

        var response = await PostSaveAsync(client, sourceType, sourceId);

        Assert.Equal(expectedStatus, response.StatusCode);
        Assert.Equal(expectedReason, await ReasonOfAsync(response));
        Assert.Empty(await ListAsync(client));
    }

    [Fact]
    public async Task List_AnswersTheSavedListsNewestFirst_WithTheWatchedProgress_AndFiltersOnASource()
    {
        var client = await NewUserAsync("SavedList");
        await SaveSagaAsync(client);
        await SaveAsync(client, "explorerTheme", "frissons");
        await MarkWatchedAsync(client, StubSagaFilms[0]);
        var stranger = await NewUserAsync("SavedListStranger");
        await SaveSagaAsync(stranger);

        var lists = await ListAsync(client);
        var filtered = await ListAsync(client, "?sourceType=tmdbCollection&sourceId=1241");
        var notSaved = await ListAsync(client, "?sourceType=tmdbCollection&sourceId=10");
        var refused = await client.GetAsync(Route + "?sourceType=trending&sourceId=1241");

        Assert.Equal(
            [(ListSourceType.ExplorerTheme, "frissons", "frissons"), (ListSourceType.TmdbCollection, "1241", StubSagaName)],
            lists.Select(list => (list.SourceType, list.SourceId, list.Name)));
        Assert.Equal(1, lists[1].WatchedCount);
        Assert.True(lists[0].ItemCount > 0);
        Assert.Equal("1241", Assert.Single(filtered).SourceId);
        Assert.Empty(notSaved);
        Assert.Equal(HttpStatusCode.BadRequest, refused.StatusCode);
        Assert.Equal(ErrorCodes.ListSourceNotSavable, await ReasonOfAsync(refused));
    }

    [Fact]
    public async Task Get_AnswersTheFilmsInTheSourceOrder_FlaggingTheWatchedOnes()
    {
        var client = await NewUserAsync("SavedGet");
        var saved = await SaveSagaAsync(client);
        await MarkWatchedAsync(client, StubSagaFilms[1]);

        var detail = await client.GetFromJsonAsync<SavedListResponse>($"{Route}/{saved.Id}", Json);

        Assert.Equal((saved.Id, StubSagaName, StubSagaFilms.Length, 1, false), (detail!.Id, detail.Name, detail.ItemCount, detail.WatchedCount, detail.Unavailable));
        Assert.Equal(StubSagaFilms, detail.Items.Select(item => item.TmdbId));
        Assert.Equal([false, true, false, false], detail.Items.Select(item => item.IsWatched));
        Assert.All(detail.Items, item => Assert.Equal(MovieMediaType.Movie, item.MediaType));
    }

    [Theory]
    [InlineData(UnknownObjectId)]
    [InlineData("not-an-id")]
    public async Task UnknownSavedList_IsNotFoundOnGetAndCopy_AndDeleteStaysANoOp(string savedListId)
    {
        var client = await NewUserAsync("SavedUnknown");

        var read = await client.GetAsync($"{Route}/{savedListId}");
        var copy = await client.PostAsJsonAsync($"{Route}/{savedListId}/copy", new { name = "Ma saga" });
        var delete = await client.DeleteAsync($"{Route}/{savedListId}");

        Assert.Equal(HttpStatusCode.NotFound, read.StatusCode);
        Assert.Equal(ErrorCodes.SavedListNotFound, await ReasonOfAsync(read));
        Assert.Equal(HttpStatusCode.NotFound, copy.StatusCode);
        Assert.Equal(ErrorCodes.SavedListNotFound, await ReasonOfAsync(copy));
        Assert.Equal(HttpStatusCode.NoContent, delete.StatusCode);
    }

    [Fact]
    public async Task SomeoneElsesSavedList_IsNotFound_AndStaysSaved()
    {
        var owner = await NewUserAsync("SavedOwner");
        var saved = await SaveSagaAsync(owner);
        var stranger = await NewUserAsync("SavedStranger");

        var read = await stranger.GetAsync($"{Route}/{saved.Id}");
        var copy = await stranger.PostAsJsonAsync($"{Route}/{saved.Id}/copy", new { name = "Volée" });
        var delete = await stranger.DeleteAsync($"{Route}/{saved.Id}");

        Assert.Equal(HttpStatusCode.NotFound, read.StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, copy.StatusCode);
        Assert.Equal(HttpStatusCode.NoContent, delete.StatusCode);
        Assert.Single(await ListAsync(owner));
        Assert.Empty((await stranger.GetFromJsonAsync<MovieListsResponse>("/api/v1/lists", Json))!.Items);
    }

    [Fact]
    public async Task Delete_ForgetsTheSavedList_AndAgainIsNoContent()
    {
        var client = await NewUserAsync("SavedDelete");
        var saved = await SaveSagaAsync(client);

        var removed = await client.DeleteAsync($"{Route}/{saved.Id}");
        var again = await client.DeleteAsync($"{Route}/{saved.Id}");

        Assert.Equal(HttpStatusCode.NoContent, removed.StatusCode);
        Assert.Equal(HttpStatusCode.NoContent, again.StatusCode);
        Assert.Empty(await ListAsync(client));
    }

    [Fact]
    public async Task Copy_CreatesAnEditableListHoldingTheFilmsOfTheSource_UnderTheRulesOfCreatedLists()
    {
        var client = await NewUserAsync("SavedCopy");
        var saved = await SaveSagaAsync(client);
        await MarkWatchedAsync(client, StubSagaFilms[2]);

        var response = await client.PostAsJsonAsync($"{Route}/{saved.Id}/copy", new { name = "  Ma saga  " });
        var sameName = await client.PostAsJsonAsync($"{Route}/{saved.Id}/copy", new { name = "ma SAGA" });
        var blank = await client.PostAsJsonAsync($"{Route}/{saved.Id}/copy", new { name = "  " });

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var copy = (await response.Content.ReadFromJsonAsync<MovieListResponse>(Json))!;
        Assert.Equal("Ma saga", copy.Name);
        Assert.Equal(StubSagaFilms, copy.Items.Select(item => item.TmdbId));
        Assert.Equal([false, false, true, false], copy.Items.Select(item => item.IsWatched));
        var stored = await client.GetFromJsonAsync<MovieListResponse>($"/api/v1/lists/{copy.Id}", Json);
        Assert.Equal(StubSagaFilms, stored!.Items.Select(item => item.TmdbId));
        var removed = await client.DeleteAsync($"/api/v1/lists/{copy.Id}/items/{StubSagaFilms[0]}");
        Assert.Equal(HttpStatusCode.NoContent, removed.StatusCode);
        Assert.Equal(HttpStatusCode.Conflict, sameName.StatusCode);
        Assert.Equal(ErrorCodes.ListNameTaken, await ReasonOfAsync(sameName));
        Assert.Equal(HttpStatusCode.BadRequest, blank.StatusCode);
        Assert.Equal(ErrorCodes.ValidationFailed, await ReasonOfAsync(blank));
        Assert.Single(await ListAsync(client));
    }

    [Fact]
    public async Task ASourceThatDisappeared_IsListedAsUnavailable_UnderItsSavedName_AndCannotBeCopied()
    {
        var client = await NewUserAsync("SavedGone");
        await SaveSagaAsync(client);
        var gone = await SavedDirectlyAsync(await UserIdOfAsync(client), ListSourceType.ExplorerTheme, "theme-retire", "Ancien thème");

        var lists = await ListAsync(client);
        var detail = await client.GetFromJsonAsync<SavedListResponse>($"{Route}/{gone.Id}", Json);
        var copy = await client.PostAsJsonAsync($"{Route}/{gone.Id}/copy", new { name = "Copie" });

        var listed = lists.Single(list => list.Id == gone.Id);
        Assert.Equal(("Ancien thème", true, 0), (listed.Name, listed.Unavailable, listed.ItemCount));
        Assert.False(lists.Single(list => list.Id != gone.Id).Unavailable);
        Assert.Equal(("Ancien thème", true), (detail!.Name, detail.Unavailable));
        Assert.Empty(detail.Items);
        Assert.Equal(HttpStatusCode.ServiceUnavailable, copy.StatusCode);
        Assert.Equal(ErrorCodes.ListSourceUnavailable, await ReasonOfAsync(copy));
    }

    [Fact]
    public async Task PersonalDataExport_IncludesTheSavedLists()
    {
        var client = await NewUserAsync("SavedExport");
        await SaveSagaAsync(client);

        var export = JsonElement.Parse(await client.GetStringAsync("/api/v1/auth/me/export"));

        var saved = Assert.Single(export.GetProperty("savedLists").EnumerateArray().ToList());
        Assert.Equal("tmdbCollection", saved.GetProperty("sourceType").GetString());
        Assert.Equal("1241", saved.GetProperty("sourceId").GetString());
        Assert.Equal(StubSagaName, saved.GetProperty("name").GetString());
        Assert.True(saved.TryGetProperty("createdAt", out _));
    }
}
