using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Domain.Exceptions;
using Xunit;

namespace MoviePicker.Api.IntegrationTests;

public sealed class MovieListsEndpointsTests : IClassFixture<MoviePickerApplicationFactory>
{
    private const string Route = "/api/v1/lists";

    private const string UnknownObjectId = "0123456789abcdef01234567";

    private const string TmdbPoster = "https://image.tmdb.org/t/p/w500/f89U3ADr1oiB1s9GkdPOEpXUk5H.jpg";

    private const string StubTmdbTitle = "Film E2E Stub";

    private const string StubTmdbYear = "2024";

    private static readonly JsonSerializerOptions Json = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        PropertyNameCaseInsensitive = true,
        Converters = { new JsonStringEnumConverter(JsonNamingPolicy.CamelCase) }
    };

    private readonly MoviePickerApplicationFactory _factory;

    public MovieListsEndpointsTests(MoviePickerApplicationFactory factory) => _factory = factory;

    private Task<HttpClient> NewUserAsync(string displayName) =>
        IntegrationTestAuth.NewRegisteredClientAsync(_factory, displayName);

    private static AddWatchlistItemRequest Title(
        int tmdbId,
        string title,
        MovieMediaType mediaType = MovieMediaType.Movie,
        string? posterPath = null) =>
        new() { TmdbId = tmdbId, MediaType = mediaType, Title = title, Year = "1999", PosterPath = posterPath };

    private static async Task<MovieListSummaryResponse> CreateAsync(
        HttpClient client,
        string name,
        string? description = null,
        AddWatchlistItemRequest? firstItem = null)
    {
        var response = await client.PostAsJsonAsync(
            Route,
            new CreateMovieListRequest { Name = name, Description = description, FirstItem = firstItem },
            Json);
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        return (await response.Content.ReadFromJsonAsync<MovieListSummaryResponse>(Json))!;
    }

    private static async Task<IReadOnlyList<MovieListSummaryResponse>> ListAsync(HttpClient client, string query = "")
    {
        var lists = await client.GetFromJsonAsync<MovieListsResponse>(Route + query, Json);
        return lists!.Items;
    }

    private static async Task<string?> ReasonOfAsync(HttpResponseMessage response) =>
        JsonElement.Parse(await response.Content.ReadAsStringAsync()).GetProperty("reason").GetString();

    [Theory]
    [InlineData("GET", Route)]
    [InlineData("POST", Route)]
    [InlineData("GET", Route + "/" + UnknownObjectId)]
    [InlineData("PATCH", Route + "/" + UnknownObjectId)]
    [InlineData("DELETE", Route + "/" + UnknownObjectId)]
    [InlineData("POST", Route + "/" + UnknownObjectId + "/items")]
    [InlineData("DELETE", Route + "/" + UnknownObjectId + "/items/603")]
    public async Task EveryRoute_WithoutASession_IsUnauthorized(string method, string path)
    {
        using var request = new HttpRequestMessage(new HttpMethod(method), path)
        {
            Content = JsonContent.Create(new CreateMovieListRequest { Name = "Films cultes" }, options: Json)
        };

        var response = await _factory.CreateClient().SendAsync(request);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Create_ReturnsTheSummaryInCamelCase()
    {
        var client = await NewUserAsync("ListsCreate");

        var response = await client.PostAsJsonAsync(
            Route,
            new { name = "  Films cultes ", description = "  Les incontournables " });

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var body = JsonElement.Parse(await response.Content.ReadAsStringAsync());
        Assert.False(string.IsNullOrEmpty(body.GetProperty("id").GetString()));
        Assert.Equal("Films cultes", body.GetProperty("name").GetString());
        Assert.Equal("Les incontournables", body.GetProperty("description").GetString());
        Assert.Equal(0, body.GetProperty("itemCount").GetInt32());
        Assert.Equal(0, body.GetProperty("posterPaths").GetArrayLength());
        Assert.False(body.GetProperty("containsMovie").GetBoolean());
        Assert.Equal(
            body.GetProperty("createdAt").GetDateTimeOffset(),
            body.GetProperty("updatedAt").GetDateTimeOffset());
    }

    [Fact]
    public async Task Create_WithAFirstItem_HoldsIt()
    {
        var client = await NewUserAsync("ListsFirstItem");

        var created = await CreateAsync(client, "Films cultes", firstItem: Title(603, "Matrix", posterPath: TmdbPoster));

        Assert.Equal(1, created.ItemCount);
        Assert.True(created.ContainsMovie);
        var poster = Assert.Single(created.PosterPaths);
        Assert.EndsWith("f89U3ADr1oiB1s9GkdPOEpXUk5H.jpg", poster);
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    public async Task Create_BlankName_IsAValidationError(string name)
    {
        var client = await NewUserAsync("ListsBlank");

        var response = await client.PostAsJsonAsync(Route, new { name });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal(ErrorCodes.ValidationFailed, await ReasonOfAsync(response));
    }

    [Fact]
    public async Task Create_NameBeyondSixtyCharacters_IsAValidationError()
    {
        var client = await NewUserAsync("ListsLongName");

        var response = await client.PostAsJsonAsync(Route, new { name = new string('a', 61) });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal(ErrorCodes.ValidationFailed, await ReasonOfAsync(response));
    }

    [Theory]
    [InlineData("ÉTÉ  2026")]
    [InlineData("À voir")]
    [InlineData(" watchlist ")]
    public async Task Create_TakenOrReservedName_IsAConflict(string name)
    {
        var client = await NewUserAsync("ListsTaken");
        await CreateAsync(client, "Été 2026");

        var response = await client.PostAsJsonAsync(Route, new { name });

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
        Assert.Equal(ErrorCodes.ListNameTaken, await ReasonOfAsync(response));
    }

    [Fact]
    public async Task Create_FiftyFirstList_IsAConflict()
    {
        var client = await NewUserAsync("ListsLimit");
        for (var index = 1; index <= MovieList.MaxPerOwner; index++)
            await CreateAsync(client, $"Liste {index}");

        var response = await client.PostAsJsonAsync(Route, new { name = "Une de trop" });

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
        Assert.Equal(ErrorCodes.ListLimitReached, await ReasonOfAsync(response));
    }

    [Fact]
    public async Task List_ReturnsOnlyTheCallersLists_MostRecentlyUpdatedFirst_WithTheProbedTitleFlagged()
    {
        var owner = await NewUserAsync("ListsOwner");
        var stranger = await NewUserAsync("ListsStranger");
        var cult = await CreateAsync(owner, "Films cultes");
        await CreateAsync(owner, "Séries", firstItem: Title(603, "Matrix (série)", MovieMediaType.Tv));
        await CreateAsync(stranger, "Films de l'autre", firstItem: Title(603, "Matrix"));
        await owner.PostAsJsonAsync($"{Route}/{cult.Id}/items", Title(603, "Matrix"), Json);

        var probed = await ListAsync(owner, "?tmdbId=603");
        var probedSeries = await ListAsync(owner, "?tmdbId=603&mediaType=tv");
        var unprobed = await ListAsync(owner);

        Assert.Equal(["Films cultes", "Séries"], probed.Select(list => list.Name));
        Assert.Equal([true, false], probed.Select(list => list.ContainsMovie));
        Assert.Equal([false, true], probedSeries.Select(list => list.ContainsMovie));
        Assert.All(unprobed, list => Assert.False(list.ContainsMovie));
        Assert.Equal(1, probed[0].ItemCount);
    }

    [Fact]
    public async Task Get_ReturnsTheItemsInInsertionOrder_WithTheWatchlistFields()
    {
        var client = await NewUserAsync("ListsDetail");
        var created = await CreateAsync(client, "Films cultes", "Les incontournables", Title(680, "Pulp Fiction"));
        await client.PostAsJsonAsync($"{Route}/{created.Id}/items", Title(603, "Matrix", posterPath: TmdbPoster), Json);

        var response = await client.GetAsync($"{Route}/{created.Id}");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = JsonElement.Parse(await response.Content.ReadAsStringAsync());
        Assert.Equal(created.Id, body.GetProperty("id").GetString());
        Assert.Equal("Films cultes", body.GetProperty("name").GetString());
        Assert.Equal("Les incontournables", body.GetProperty("description").GetString());
        var items = body.GetProperty("items").EnumerateArray().ToList();
        Assert.Equal([680, 603], items.Select(item => item.GetProperty("tmdbId").GetInt32()));
        var matrix = items[1];
        Assert.Equal(StubTmdbTitle, matrix.GetProperty("title").GetString());
        Assert.Equal("movie", matrix.GetProperty("mediaType").GetString());
        Assert.Equal(StubTmdbYear, matrix.GetProperty("year").GetString());
        Assert.EndsWith("f89U3ADr1oiB1s9GkdPOEpXUk5H.jpg", matrix.GetProperty("posterPath").GetString());
        Assert.Equal(JsonValueKind.Array, matrix.GetProperty("genreIds").ValueKind);
        Assert.True(matrix.TryGetProperty("voteAverage", out _));
        Assert.True(matrix.TryGetProperty("runtimeMinutes", out _));
        Assert.True(matrix.GetProperty("createdAt").GetDateTimeOffset() >= items[0].GetProperty("createdAt").GetDateTimeOffset());
    }

    [Theory]
    [InlineData(UnknownObjectId)]
    [InlineData("nope")]
    public async Task Get_UnknownList_IsNotFound(string listId)
    {
        var client = await NewUserAsync("ListsUnknown");

        var response = await client.GetAsync($"{Route}/{listId}");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        Assert.Equal(ErrorCodes.ListNotFound, await ReasonOfAsync(response));
    }

    [Theory]
    [InlineData(UnknownObjectId)]
    [InlineData("nope")]
    public async Task UnknownList_IsNotFoundOnEveryMutatingRoute(string listId)
    {
        var client = await NewUserAsync("ListsUnknownMutations");
        var listRoute = $"{Route}/{listId}";

        HttpResponseMessage[] responses =
        [
            await client.PatchAsJsonAsync(listRoute, new { name = "Renommée" }),
            await client.PostAsJsonAsync($"{listRoute}/items", Title(603, "Matrix"), Json),
            await client.DeleteAsync($"{listRoute}/items/603"),
            await client.DeleteAsync(listRoute)
        ];

        foreach (var response in responses)
        {
            Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
            Assert.Equal(ErrorCodes.ListNotFound, await ReasonOfAsync(response));
        }
    }

    [Fact]
    public async Task SomeoneElsesList_IsNotFoundOnEveryRoute_AndStaysUntouched()
    {
        var owner = await NewUserAsync("ListsVictim");
        var intruder = await NewUserAsync("ListsIntruder");
        var list = await CreateAsync(owner, "Films cultes", firstItem: Title(603, "Matrix"));
        var listRoute = $"{Route}/{list.Id}";

        HttpResponseMessage[] responses =
        [
            await intruder.GetAsync(listRoute),
            await intruder.PatchAsJsonAsync(listRoute, new { name = "Volée" }),
            await intruder.PostAsJsonAsync($"{listRoute}/items", Title(680, "Pulp Fiction"), Json),
            await intruder.DeleteAsync($"{listRoute}/items/603"),
            await intruder.DeleteAsync(listRoute)
        ];

        Assert.All(responses, response => Assert.Equal(HttpStatusCode.NotFound, response.StatusCode));
        foreach (var response in responses)
            Assert.Equal(ErrorCodes.ListNotFound, await ReasonOfAsync(response));
        var kept = await owner.GetFromJsonAsync<MovieListResponse>(listRoute, Json);
        Assert.Equal("Films cultes", kept!.Name);
        Assert.Equal([603], kept.Items.Select(item => item.TmdbId));
    }

    [Fact]
    public async Task Patch_RenamesTheList_AndRefusesTheNameOfAnother()
    {
        var client = await NewUserAsync("ListsRename");
        await CreateAsync(client, "Halloween");
        var list = await CreateAsync(client, "Films cultes", "Avant");

        var renamed = await client.PatchAsJsonAsync($"{Route}/{list.Id}", new { name = "Classiques", description = "Après" });
        var sameNameOtherCase = await client.PatchAsJsonAsync($"{Route}/{list.Id}", new { name = "CLASSIQUES", description = "Après" });
        var taken = await client.PatchAsJsonAsync($"{Route}/{list.Id}", new { name = "halloween" });

        Assert.Equal(HttpStatusCode.OK, renamed.StatusCode);
        var summary = await renamed.Content.ReadFromJsonAsync<MovieListSummaryResponse>(Json);
        Assert.Equal("Classiques", summary!.Name);
        Assert.Equal("Après", summary.Description);
        Assert.Equal(HttpStatusCode.OK, sameNameOtherCase.StatusCode);
        Assert.Equal(HttpStatusCode.Conflict, taken.StatusCode);
        Assert.Equal(ErrorCodes.ListNameTaken, await ReasonOfAsync(taken));
    }

    [Fact]
    public async Task Delete_RemovesTheList()
    {
        var client = await NewUserAsync("ListsDelete");
        var list = await CreateAsync(client, "Films cultes");

        var deleted = await client.DeleteAsync($"{Route}/{list.Id}");
        var again = await client.DeleteAsync($"{Route}/{list.Id}");

        Assert.Equal(HttpStatusCode.NoContent, deleted.StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, again.StatusCode);
        Assert.Empty(await ListAsync(client));
    }

    [Fact]
    public async Task AddItem_IsCreatedOnce_ThenReturnsTheExistingItem()
    {
        var client = await NewUserAsync("ListsAddItem");
        var list = await CreateAsync(client, "Films cultes");
        var itemsRoute = $"{Route}/{list.Id}/items";

        var first = await client.PostAsJsonAsync(itemsRoute, Title(603, "Matrix"), Json);
        var second = await client.PostAsJsonAsync(itemsRoute, Title(603, "Matrix bis"), Json);

        Assert.Equal(HttpStatusCode.Created, first.StatusCode);
        Assert.Equal(HttpStatusCode.OK, second.StatusCode);
        var created = await first.Content.ReadFromJsonAsync<MovieListItemResponse>(Json);
        var existing = await second.Content.ReadFromJsonAsync<MovieListItemResponse>(Json);
        Assert.Equal(StubTmdbTitle, created!.Title);
        Assert.Equal(StubTmdbTitle, existing!.Title);
        Assert.Equal(created.CreatedAt, existing.CreatedAt);
        var stored = await client.GetFromJsonAsync<MovieListResponse>($"{Route}/{list.Id}", Json);
        Assert.Single(stored!.Items);
    }

    [Fact]
    public async Task AddItem_InvalidTitle_IsAValidationError()
    {
        var client = await NewUserAsync("ListsBadItem");
        var list = await CreateAsync(client, "Films cultes");

        var response = await client.PostAsJsonAsync($"{Route}/{list.Id}/items", new { tmdbId = 0, title = "" });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task AddItem_BeyondFiveHundred_IsAConflict()
    {
        var client = await NewUserAsync("ListsFull");
        var list = await CreateAsync(client, "Pleine", firstItem: Title(1, "Film 1"));
        var itemsRoute = $"{Route}/{list.Id}/items";
        for (var tmdbId = 2; tmdbId <= MovieList.MaxItems; tmdbId++)
            Assert.Equal(HttpStatusCode.Created, (await client.PostAsJsonAsync(itemsRoute, Title(tmdbId, $"Film {tmdbId}"), Json)).StatusCode);

        var response = await client.PostAsJsonAsync(itemsRoute, Title(MovieList.MaxItems + 1, "Un de trop"), Json);

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
        Assert.Equal(ErrorCodes.ListFull, await ReasonOfAsync(response));
    }

    [Fact]
    public async Task PersonalDataExport_IncludesTheListsAndTheirTitles()
    {
        var client = await NewUserAsync("ListsExport");
        await CreateAsync(client, "Films cultes", "Les incontournables", Title(603, "Matrix"));

        var export = JsonElement.Parse(await client.GetStringAsync("/api/v1/auth/me/export"));

        var list = Assert.Single(export.GetProperty("movieLists").EnumerateArray().ToList());
        Assert.Equal("Films cultes", list.GetProperty("name").GetString());
        Assert.Equal("Les incontournables", list.GetProperty("description").GetString());
        var item = Assert.Single(list.GetProperty("items").EnumerateArray().ToList());
        Assert.Equal(603, item.GetProperty("tmdbId").GetInt32());
        Assert.Equal("movie", item.GetProperty("mediaType").GetString());
        Assert.Equal(StubTmdbTitle, item.GetProperty("title").GetString());
        Assert.True(item.TryGetProperty("addedAt", out _));
    }

    [Fact]
    public async Task RemoveItem_IsIdempotent_AndKeepsTheOtherMediaType()
    {
        var client = await NewUserAsync("ListsRemoveItem");
        var list = await CreateAsync(client, "Mélange", firstItem: Title(1920, "Twin Peaks", MovieMediaType.Tv));
        await client.PostAsJsonAsync($"{Route}/{list.Id}/items", Title(1920, "Un film"), Json);

        var removed = await client.DeleteAsync($"{Route}/{list.Id}/items/1920?mediaType=tv");
        var again = await client.DeleteAsync($"{Route}/{list.Id}/items/1920?mediaType=tv");

        Assert.Equal(HttpStatusCode.NoContent, removed.StatusCode);
        Assert.Equal(HttpStatusCode.NoContent, again.StatusCode);
        var stored = await client.GetFromJsonAsync<MovieListResponse>($"{Route}/{list.Id}", Json);
        var left = Assert.Single(stored!.Items);
        Assert.Equal(MovieMediaType.Movie, left.MediaType);
    }
}
