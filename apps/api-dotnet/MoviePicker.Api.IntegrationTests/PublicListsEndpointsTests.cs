using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Domain.Exceptions;
using Xunit;

namespace MoviePicker.Api.IntegrationTests;

public sealed class PublicListsEndpointsTests : IClassFixture<MoviePickerApplicationFactory>
{
    private const string UnknownObjectId = "0123456789abcdef01234567";

    private static readonly JsonSerializerOptions Json = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        PropertyNameCaseInsensitive = true,
        Converters = { new JsonStringEnumConverter(JsonNamingPolicy.CamelCase) }
    };

    private readonly MoviePickerApplicationFactory _factory;

    public PublicListsEndpointsTests(MoviePickerApplicationFactory factory) => _factory = factory;

    private sealed record Person(HttpClient Client, string Handle, string UserId);

    private async Task<Person> NewPersonAsync(string displayName)
    {
        var client = await IntegrationTestAuth.NewRegisteredClientAsync(_factory, displayName);
        var me = (await client.GetFromJsonAsync<UserProfileResponse>("/api/v1/auth/me", Json))!;
        return new Person(client, me.Handle, me.UserId);
    }

    private static string ListsOf(Person person) => $"/api/v1/users/{person.Handle}/lists";

    private static async Task<MovieListSummaryResponse> CreateListAsync(
        Person owner,
        string name,
        bool? isPublic,
        params int[] tmdbIds)
    {
        var response = await owner.Client.PostAsJsonAsync(
            "/api/v1/lists",
            new { name, description = $"À propos de {name}", isPublic });
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var created = (await response.Content.ReadFromJsonAsync<MovieListSummaryResponse>(Json))!;
        foreach (var tmdbId in tmdbIds)
            await AddFilmAsync(owner.Client, created.Id, tmdbId);
        return created;
    }

    private static async Task AddFilmAsync(HttpClient client, string listId, int tmdbId)
    {
        var added = await client.PostAsJsonAsync(
            $"/api/v1/lists/{listId}/items",
            new { tmdbId, mediaType = "movie", title = $"Film {tmdbId}", year = "1999" });
        Assert.Equal(HttpStatusCode.Created, added.StatusCode);
    }

    private static async Task SetVisibilityAsync(Person owner, string listId, string name, bool isPublic)
    {
        var patched = await owner.Client.PatchAsJsonAsync($"/api/v1/lists/{listId}", new { name, isPublic });
        Assert.Equal(HttpStatusCode.OK, patched.StatusCode);
    }

    private static async Task MarkWatchedAsync(HttpClient client, int tmdbId)
    {
        var response = await client.PostAsJsonAsync("/api/v1/watched", new { tmdbId, mediaType = "movie", title = $"Film {tmdbId}", year = "1999" });
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    private static async Task ShareAsync(Person owner, string listId, Person member)
    {
        await owner.Client.PostAsync($"/api/v1/users/{member.Handle}/follow", null);
        await member.Client.PostAsync($"/api/v1/users/{owner.Handle}/follow", null);
        var invited = await owner.Client.PostAsJsonAsync($"/api/v1/lists/{listId}/invitations", new { userId = member.UserId });
        Assert.Equal(HttpStatusCode.Created, invited.StatusCode);
        var accepted = await member.Client.PostAsync($"/api/v1/lists/{listId}/invitation/accept", null);
        Assert.Equal(HttpStatusCode.OK, accepted.StatusCode);
    }

    private static async Task<string?> ReasonOfAsync(HttpResponseMessage response) =>
        JsonElement.Parse(await response.Content.ReadAsStringAsync()).GetProperty("reason").GetString();

    private static async Task<JsonElement> BodyOfAsync(HttpResponseMessage response) =>
        JsonElement.Parse(await response.Content.ReadAsStringAsync());

    private static Task<HttpResponseMessage> SaveAsync(HttpClient client, string listId) =>
        client.PostAsJsonAsync("/api/v1/saved-lists", new { sourceType = "memberList", sourceId = listId });

    private static async Task<JsonElement> SavedSummaryAsync(HttpClient client, string savedListId)
    {
        var lists = await BodyOfAsync(await client.GetAsync("/api/v1/saved-lists"));
        return lists.GetProperty("items").EnumerateArray().Single(item => item.GetProperty("id").GetString() == savedListId);
    }

    [Fact]
    public async Task CreateAndUpdate_SetTheVisibility_PrivateByDefault()
    {
        var lea = await NewPersonAsync("Léa Visibilité");

        var hidden = await CreateListAsync(lea, "Pour plus tard", isPublic: null);
        var shown = await CreateListAsync(lea, "Hitchcock", isPublic: true);
        await SetVisibilityAsync(lea, shown.Id, "Hitchcock", isPublic: false);
        await SetVisibilityAsync(lea, hidden.Id, "Pour plus tard", isPublic: true);
        var kept = await lea.Client.PatchAsJsonAsync($"/api/v1/lists/{hidden.Id}", new { name = "Pour bientôt" });

        Assert.False(hidden.IsPublic);
        Assert.True(shown.IsPublic);
        Assert.True((await kept.Content.ReadFromJsonAsync<MovieListSummaryResponse>(Json))!.IsPublic);
        var lists = (await lea.Client.GetFromJsonAsync<MovieListsResponse>("/api/v1/lists", Json))!.Items;
        Assert.Equal([("Hitchcock", false), ("Pour bientôt", true)], lists.Select(list => (list.Name, list.IsPublic)).Order());
        Assert.True((await lea.Client.GetFromJsonAsync<MovieListResponse>($"/api/v1/lists/{hidden.Id}", Json))!.IsPublic);
    }

    [Fact]
    public async Task ThePublicListsOfAMember_AreReadWithoutSession_InCamelCase_WithoutAnythingPrivate()
    {
        var lea = await NewPersonAsync("Léa Publique");
        var sam = await NewPersonAsync("Sam Membre");
        await CreateListAsync(lea, "Pour plus tard", isPublic: false, 438631);
        var hitchcock = await CreateListAsync(lea, "Hitchcock", isPublic: true, 539, 426);
        await ShareAsync(lea, hitchcock.Id, sam);
        var anonymous = _factory.CreateClient();

        var response = await anonymous.GetAsync(ListsOf(lea));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await BodyOfAsync(response);
        var listed = Assert.Single(body.GetProperty("items").EnumerateArray().ToList());
        Assert.Equal(hitchcock.Id, listed.GetProperty("id").GetString());
        Assert.Equal("Hitchcock", listed.GetProperty("name").GetString());
        Assert.Equal("À propos de Hitchcock", listed.GetProperty("description").GetString());
        Assert.Equal(2, listed.GetProperty("itemCount").GetInt32());
        Assert.Equal(2, listed.GetProperty("memberCount").GetInt32());
        Assert.Equal(JsonValueKind.Null, listed.GetProperty("watchedCount").ValueKind);
        Assert.Equal(JsonValueKind.Array, listed.GetProperty("posterPaths").ValueKind);
        Assert.True(listed.TryGetProperty("createdAt", out _));
        Assert.True(listed.TryGetProperty("updatedAt", out _));
        Assert.False(listed.TryGetProperty("role", out _));
        Assert.False(listed.TryGetProperty("memberPreview", out _));
        Assert.False(listed.TryGetProperty("owner", out _));
        Assert.DoesNotContain(sam.UserId, body.GetRawText(), StringComparison.Ordinal);
    }

    [Fact]
    public async Task ThePublicListsOfAMember_CountWhatTheSignedInViewerWatched()
    {
        var lea = await NewPersonAsync("Léa Avancée");
        var zoe = await NewPersonAsync("Zoé Avancée");
        await CreateListAsync(lea, "Hitchcock", isPublic: true, 539, 426, 567);
        await MarkWatchedAsync(zoe.Client, 426);

        var lists = (await zoe.Client.GetFromJsonAsync<PublicListsResponse>(ListsOf(lea), Json))!.Items;

        Assert.Equal(1, Assert.Single(lists).WatchedCount);
    }

    [Fact]
    public async Task APublicList_IsReadWithItsFilmsInOrder_ItsCreator_AndTheRoleOfTheViewer()
    {
        var lea = await NewPersonAsync("Léa Détail");
        var sam = await NewPersonAsync("Sam Détail");
        var zoe = await NewPersonAsync("Zoé Détail");
        var hitchcock = await CreateListAsync(lea, "Hitchcock", isPublic: true, 567, 539);
        await ShareAsync(lea, hitchcock.Id, sam);
        await AddFilmAsync(sam.Client, hitchcock.Id, 426);
        await MarkWatchedAsync(zoe.Client, 539);
        var route = $"{ListsOf(lea)}/{hitchcock.Id}";

        var anonymous = await BodyOfAsync(await _factory.CreateClient().GetAsync(route));
        var asZoe = (await zoe.Client.GetFromJsonAsync<PublicListResponse>(route, Json))!;
        var asLea = (await lea.Client.GetFromJsonAsync<PublicListResponse>(route, Json))!;
        var asSam = (await sam.Client.GetFromJsonAsync<PublicListResponse>(route, Json))!;

        Assert.Equal("Hitchcock", anonymous.GetProperty("name").GetString());
        Assert.Equal(lea.Handle, anonymous.GetProperty("creator").GetProperty("handle").GetString());
        Assert.Equal("Léa Détail", anonymous.GetProperty("creator").GetProperty("displayName").GetString());
        Assert.Equal(JsonValueKind.String, anonymous.GetProperty("creator").GetProperty("avatarId").ValueKind);
        Assert.False(anonymous.GetProperty("creator").TryGetProperty("userId", out _));
        Assert.Equal(JsonValueKind.Null, anonymous.GetProperty("viewerRole").ValueKind);
        Assert.Equal(JsonValueKind.Null, anonymous.GetProperty("watchedCount").ValueKind);
        Assert.Equal(
            [567, 539, 426],
            anonymous.GetProperty("items").EnumerateArray().Select(item => item.GetProperty("tmdbId").GetInt32()));
        Assert.All(anonymous.GetProperty("items").EnumerateArray(), item => Assert.False(item.GetProperty("isWatched").GetBoolean()));
        Assert.DoesNotContain(sam.UserId, anonymous.GetRawText(), StringComparison.Ordinal);
        Assert.Equal(((MovieListRole?)null, (int?)1), (asZoe.ViewerRole, asZoe.WatchedCount));
        Assert.Equal([false, true, false], asZoe.Items.Select(item => item.IsWatched));
        Assert.Equal(MovieListRole.Owner, asLea.ViewerRole);
        Assert.Equal(MovieListRole.Member, asSam.ViewerRole);
    }

    [Fact]
    public async Task APrivateList_ASomeoneElsesList_AndAnUnknownOne_AreNotFound()
    {
        var lea = await NewPersonAsync("Léa Privée");
        var sam = await NewPersonAsync("Sam Ailleurs");
        var hidden = await CreateListAsync(lea, "Pour plus tard", isPublic: false, 438631);
        var samsList = await CreateListAsync(sam, "Celle de Sam", isPublic: true, 550);

        var responses = new[]
        {
            await lea.Client.GetAsync($"{ListsOf(lea)}/{hidden.Id}"),
            await _factory.CreateClient().GetAsync($"{ListsOf(lea)}/{samsList.Id}"),
            await _factory.CreateClient().GetAsync($"{ListsOf(lea)}/{UnknownObjectId}"),
            await _factory.CreateClient().GetAsync($"{ListsOf(lea)}/not-an-id")
        };

        foreach (var response in responses)
        {
            Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
            Assert.Equal(ErrorCodes.ListNotFound, await ReasonOfAsync(response));
        }
    }

    [Fact]
    public async Task ThePublicListsOfAPrivateProfile_OrOfAnUnknownHandle_AreNotFound()
    {
        var lea = await NewPersonAsync("Léa Discrète");
        var hitchcock = await CreateListAsync(lea, "Hitchcock", isPublic: true, 539);
        var hide = await lea.Client.PatchAsJsonAsync("/api/v1/auth/me", new { isProfilePublic = false });
        Assert.Equal(HttpStatusCode.OK, hide.StatusCode);

        var responses = new[]
        {
            await _factory.CreateClient().GetAsync(ListsOf(lea)),
            await lea.Client.GetAsync($"{ListsOf(lea)}/{hitchcock.Id}"),
            await _factory.CreateClient().GetAsync("/api/v1/users/nobody_here_xyz/lists")
        };

        foreach (var response in responses)
        {
            Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
            Assert.Equal(ErrorCodes.ProfileNotFound, await ReasonOfAsync(response));
        }

        var stats = await _factory.CreateClient().GetAsync($"/api/v1/users/{lea.Handle}/stats");
        Assert.Equal(HttpStatusCode.NotFound, stats.StatusCode);
    }

    [Fact]
    public async Task TheProfileStats_CountThePublicListsCreated()
    {
        var lea = await NewPersonAsync("Léa Compte");
        var sam = await NewPersonAsync("Sam Compte");
        await CreateListAsync(lea, "Hitchcock", isPublic: true);
        await CreateListAsync(lea, "Ciné coréen", isPublic: true);
        await CreateListAsync(lea, "Pour plus tard", isPublic: false);
        var shared = await CreateListAsync(sam, "Celle de Sam", isPublic: true);
        await ShareAsync(sam, shared.Id, lea);

        var stats = await BodyOfAsync(await _factory.CreateClient().GetAsync($"/api/v1/users/{lea.Handle}/stats"));

        Assert.Equal(2, stats.GetProperty("publicListCount").GetInt32());
    }

    [Fact]
    public async Task Copy_OfAPublicList_NeedsASession_AndFollowsTheRulesOfCreatedLists()
    {
        var lea = await NewPersonAsync("Léa Copiée");
        var zoe = await NewPersonAsync("Zoé Copie");
        var hitchcock = await CreateListAsync(lea, "Hitchcock", isPublic: true, 539, 426);
        var hidden = await CreateListAsync(lea, "Pour plus tard", isPublic: false, 438631);
        var route = $"{ListsOf(lea)}/{hitchcock.Id}/copy";

        var anonymous = await _factory.CreateClient().PostAsJsonAsync(route, new { name = "Volée" });
        var copied = await zoe.Client.PostAsJsonAsync(route, new { name = "  Mon Hitchcock  " });
        var sameName = await zoe.Client.PostAsJsonAsync(route, new { name = "mon HITCHCOCK" });
        var ofAPrivateList = await zoe.Client.PostAsJsonAsync($"{ListsOf(lea)}/{hidden.Id}/copy", new { name = "Volée" });

        Assert.Equal(HttpStatusCode.Unauthorized, anonymous.StatusCode);
        Assert.Equal(HttpStatusCode.Created, copied.StatusCode);
        var copy = (await copied.Content.ReadFromJsonAsync<MovieListResponse>(Json))!;
        Assert.Equal(("Mon Hitchcock", false, MovieListRole.Owner), (copy.Name, copy.IsPublic, copy.Role));
        Assert.Equal([539, 426], copy.Items.Select(item => item.TmdbId));
        Assert.Equal(HttpStatusCode.Conflict, sameName.StatusCode);
        Assert.Equal(ErrorCodes.ListNameTaken, await ReasonOfAsync(sameName));
        Assert.Equal(HttpStatusCode.NotFound, ofAPrivateList.StatusCode);
        Assert.Equal(ErrorCodes.ListNotFound, await ReasonOfAsync(ofAPrivateList));
        Assert.Single((await zoe.Client.GetFromJsonAsync<MovieListsResponse>("/api/v1/lists", Json))!.Items);
    }

    [Fact]
    public async Task Save_ThePublicListOfAMember_FollowsIt_WithItsCreator()
    {
        var lea = await NewPersonAsync("Léa Suivie");
        var zoe = await NewPersonAsync("Zoé Suit");
        var hitchcock = await CreateListAsync(lea, "Hitchcock", isPublic: true, 539, 426);
        await MarkWatchedAsync(zoe.Client, 539);

        var first = await SaveAsync(zoe.Client, hitchcock.Id);
        var again = await SaveAsync(zoe.Client, hitchcock.Id.ToUpperInvariant());
        await AddFilmAsync(lea.Client, hitchcock.Id, 567);

        Assert.Equal(HttpStatusCode.Created, first.StatusCode);
        Assert.Equal(HttpStatusCode.OK, again.StatusCode);
        var body = await BodyOfAsync(first);
        Assert.Equal("memberList", body.GetProperty("sourceType").GetString());
        Assert.Equal(hitchcock.Id, body.GetProperty("sourceId").GetString());
        Assert.Equal("Hitchcock", body.GetProperty("name").GetString());
        Assert.Equal("À propos de Hitchcock", body.GetProperty("description").GetString());
        Assert.Equal(lea.Handle, body.GetProperty("creator").GetProperty("handle").GetString());
        Assert.Equal(1, body.GetProperty("watchedCount").GetInt32());
        Assert.False(body.GetProperty("unavailable").GetBoolean());
        Assert.Equal(JsonValueKind.Null, body.GetProperty("unavailableReason").ValueKind);
        Assert.True(body.GetProperty("copyAvailable").GetBoolean());
        var detail = (await zoe.Client.GetFromJsonAsync<SavedListResponse>($"/api/v1/saved-lists/{body.GetProperty("id").GetString()}", Json))!;
        Assert.Equal([539, 426, 567], detail.Items.Select(item => item.TmdbId));
        Assert.Equal([true, false, false], detail.Items.Select(item => item.IsWatched));
    }

    [Fact]
    public async Task Save_ItsOwnList_AListItBelongsTo_APrivateList_OrAnUnknownOne_IsRefused()
    {
        var lea = await NewPersonAsync("Léa Refus");
        var sam = await NewPersonAsync("Sam Refus");
        var zoe = await NewPersonAsync("Zoé Refus");
        var hitchcock = await CreateListAsync(lea, "Hitchcock", isPublic: true, 539);
        var hidden = await CreateListAsync(lea, "Pour plus tard", isPublic: false, 438631);
        await ShareAsync(lea, hitchcock.Id, sam);

        var own = await SaveAsync(lea.Client, hitchcock.Id);
        var asMember = await SaveAsync(sam.Client, hitchcock.Id);
        var ofAPrivateList = await SaveAsync(zoe.Client, hidden.Id);
        var unknown = await SaveAsync(zoe.Client, UnknownObjectId);
        var malformed = await SaveAsync(zoe.Client, "not-an-id");

        Assert.Equal(HttpStatusCode.Conflict, own.StatusCode);
        Assert.Equal(ErrorCodes.ListAlreadyYours, await ReasonOfAsync(own));
        Assert.Equal(HttpStatusCode.Conflict, asMember.StatusCode);
        Assert.Equal(ErrorCodes.ListAlreadyYours, await ReasonOfAsync(asMember));
        Assert.Equal(HttpStatusCode.NotFound, ofAPrivateList.StatusCode);
        Assert.Equal(ErrorCodes.ListSourceNotFound, await ReasonOfAsync(ofAPrivateList));
        Assert.Equal(HttpStatusCode.NotFound, unknown.StatusCode);
        Assert.Equal(ErrorCodes.ListSourceNotFound, await ReasonOfAsync(unknown));
        Assert.Equal(HttpStatusCode.BadRequest, malformed.StatusCode);
        Assert.Equal(ErrorCodes.ListSourceNotSavable, await ReasonOfAsync(malformed));
    }

    [Fact]
    public async Task Save_APublicListOfAPrivateProfile_IsNotFound()
    {
        var lea = await NewPersonAsync("Léa Fermée");
        var zoe = await NewPersonAsync("Zoé Fermée");
        var hitchcock = await CreateListAsync(lea, "Hitchcock", isPublic: true, 539);
        await lea.Client.PatchAsJsonAsync("/api/v1/auth/me", new { isProfilePublic = false });

        var response = await SaveAsync(zoe.Client, hitchcock.Id);

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        Assert.Equal(ErrorCodes.ListSourceNotFound, await ReasonOfAsync(response));
    }

    [Fact]
    public async Task ASavedListMadePrivate_IsUnavailable_AndItsLastFilmsSeenCanStillBeCopied()
    {
        var lea = await NewPersonAsync("Léa Retrait");
        var zoe = await NewPersonAsync("Zoé Retrait");
        var hitchcock = await CreateListAsync(lea, "Hitchcock", isPublic: true, 539, 426);
        var savedId = (await BodyOfAsync(await SaveAsync(zoe.Client, hitchcock.Id))).GetProperty("id").GetString()!;
        await AddFilmAsync(lea.Client, hitchcock.Id, 567);
        await zoe.Client.GetAsync($"/api/v1/saved-lists/{savedId}");
        await AddFilmAsync(lea.Client, hitchcock.Id, 600);
        await zoe.Client.GetAsync("/api/v1/saved-lists");
        await SetVisibilityAsync(lea, hitchcock.Id, "Hitchcock", isPublic: false);
        await AddFilmAsync(lea.Client, hitchcock.Id, 213);

        var listed = await SavedSummaryAsync(zoe.Client, savedId);
        var detail = await BodyOfAsync(await zoe.Client.GetAsync($"/api/v1/saved-lists/{savedId}"));
        var copied = await zoe.Client.PostAsJsonAsync($"/api/v1/saved-lists/{savedId}/copy", new { name = "Mon Hitchcock" });

        Assert.True(listed.GetProperty("unavailable").GetBoolean());
        Assert.Equal("private", listed.GetProperty("unavailableReason").GetString());
        Assert.Equal("Hitchcock", listed.GetProperty("name").GetString());
        Assert.Equal(JsonValueKind.Null, listed.GetProperty("creator").ValueKind);
        Assert.Equal(0, listed.GetProperty("itemCount").GetInt32());
        Assert.True(listed.GetProperty("copyAvailable").GetBoolean());
        Assert.Equal("private", detail.GetProperty("unavailableReason").GetString());
        Assert.Equal(0, detail.GetProperty("items").GetArrayLength());
        Assert.True(detail.GetProperty("copyAvailable").GetBoolean());
        Assert.Equal(HttpStatusCode.Created, copied.StatusCode);
        var copy = (await copied.Content.ReadFromJsonAsync<MovieListResponse>(Json))!;
        Assert.Equal([539, 426, 567], copy.Items.Select(item => item.TmdbId));
    }

    [Fact]
    public async Task ASavedListDeletedByItsCreator_IsUnavailableAsDeleted()
    {
        var lea = await NewPersonAsync("Léa Supprime");
        var zoe = await NewPersonAsync("Zoé Supprime");
        var hitchcock = await CreateListAsync(lea, "Hitchcock", isPublic: true, 539);
        var savedId = (await BodyOfAsync(await SaveAsync(zoe.Client, hitchcock.Id))).GetProperty("id").GetString()!;
        await zoe.Client.GetAsync($"/api/v1/saved-lists/{savedId}");
        Assert.Equal(HttpStatusCode.NoContent, (await lea.Client.DeleteAsync($"/api/v1/lists/{hitchcock.Id}")).StatusCode);

        var listed = await SavedSummaryAsync(zoe.Client, savedId);
        var copied = await zoe.Client.PostAsJsonAsync($"/api/v1/saved-lists/{savedId}/copy", new { name = "Mon Hitchcock" });

        Assert.True(listed.GetProperty("unavailable").GetBoolean());
        Assert.Equal("deleted", listed.GetProperty("unavailableReason").GetString());
        Assert.Equal("Hitchcock", listed.GetProperty("name").GetString());
        Assert.True(listed.GetProperty("copyAvailable").GetBoolean());
        Assert.Equal(HttpStatusCode.Created, copied.StatusCode);
        Assert.Equal([539], (await copied.Content.ReadFromJsonAsync<MovieListResponse>(Json))!.Items.Select(item => item.TmdbId));
    }

    [Fact]
    public async Task ASavedListNeverOpened_ThatTurnsPrivate_CannotBeCopied()
    {
        var lea = await NewPersonAsync("Léa Jamais Vue");
        var zoe = await NewPersonAsync("Zoé Jamais Vue");
        var hitchcock = await CreateListAsync(lea, "Hitchcock", isPublic: true, 539, 426);
        var savedId = (await BodyOfAsync(await SaveAsync(zoe.Client, hitchcock.Id))).GetProperty("id").GetString()!;
        await zoe.Client.GetAsync("/api/v1/saved-lists");
        await SetVisibilityAsync(lea, hitchcock.Id, "Hitchcock", isPublic: false);

        var listed = await SavedSummaryAsync(zoe.Client, savedId);
        var copied = await zoe.Client.PostAsJsonAsync($"/api/v1/saved-lists/{savedId}/copy", new { name = "Mon Hitchcock" });

        Assert.True(listed.GetProperty("unavailable").GetBoolean());
        Assert.False(listed.GetProperty("copyAvailable").GetBoolean());
        Assert.Equal(HttpStatusCode.Conflict, copied.StatusCode);
        Assert.Equal(ErrorCodes.SavedListCopyUnavailable, await ReasonOfAsync(copied));
        Assert.Empty((await zoe.Client.GetFromJsonAsync<MovieListsResponse>("/api/v1/lists", Json))!.Items);
    }

    [Fact]
    public async Task TheAccountDeletionOfTheCreator_ForgetsWhatTheSaversKept()
    {
        var lea = await NewPersonAsync("Léa Part");
        var zoe = await NewPersonAsync("Zoé Reste");
        var hitchcock = await CreateListAsync(lea, "Hitchcock", isPublic: true, 539, 426);
        var savedId = (await BodyOfAsync(await SaveAsync(zoe.Client, hitchcock.Id))).GetProperty("id").GetString()!;
        await zoe.Client.GetAsync($"/api/v1/saved-lists/{savedId}");

        var deleted = await lea.Client.SendAsync(new HttpRequestMessage(HttpMethod.Delete, "/api/v1/auth/me")
        {
            Content = JsonContent.Create(new DeleteAccountRequest { Password = "abcd1234" })
        });

        Assert.Equal(HttpStatusCode.NoContent, deleted.StatusCode);
        var listed = await SavedSummaryAsync(zoe.Client, savedId);
        var detail = await BodyOfAsync(await zoe.Client.GetAsync($"/api/v1/saved-lists/{savedId}"));
        var copied = await zoe.Client.PostAsJsonAsync($"/api/v1/saved-lists/{savedId}/copy", new { name = "Mon Hitchcock" });
        Assert.True(listed.GetProperty("unavailable").GetBoolean());
        Assert.Equal("deleted", listed.GetProperty("unavailableReason").GetString());
        Assert.Equal(JsonValueKind.Null, listed.GetProperty("name").ValueKind);
        Assert.False(listed.GetProperty("copyAvailable").GetBoolean());
        Assert.Equal(JsonValueKind.Null, detail.GetProperty("name").ValueKind);
        Assert.False(detail.GetProperty("copyAvailable").GetBoolean());
        Assert.Equal(HttpStatusCode.Conflict, copied.StatusCode);
        Assert.Equal(ErrorCodes.SavedListCopyUnavailable, await ReasonOfAsync(copied));
    }

    [Fact]
    public async Task TheAccountDeletionOfTheCreator_AlsoForgetsWhatTheSaversKeptOfAListDeletedBefore()
    {
        var lea = await NewPersonAsync("Léa Efface");
        var zoe = await NewPersonAsync("Zoé Garde");
        var hitchcock = await CreateListAsync(lea, "Hitchcock", isPublic: true, 539, 426);
        var savedId = (await BodyOfAsync(await SaveAsync(zoe.Client, hitchcock.Id))).GetProperty("id").GetString()!;
        await zoe.Client.GetAsync($"/api/v1/saved-lists/{savedId}");
        Assert.Equal(HttpStatusCode.NoContent, (await lea.Client.DeleteAsync($"/api/v1/lists/{hitchcock.Id}")).StatusCode);
        Assert.True((await SavedSummaryAsync(zoe.Client, savedId)).GetProperty("copyAvailable").GetBoolean());

        var deleted = await lea.Client.SendAsync(new HttpRequestMessage(HttpMethod.Delete, "/api/v1/auth/me")
        {
            Content = JsonContent.Create(new DeleteAccountRequest { Password = "abcd1234" })
        });

        Assert.Equal(HttpStatusCode.NoContent, deleted.StatusCode);
        var listed = await SavedSummaryAsync(zoe.Client, savedId);
        var copied = await zoe.Client.PostAsJsonAsync($"/api/v1/saved-lists/{savedId}/copy", new { name = "Mon Hitchcock" });
        Assert.Equal(JsonValueKind.Null, listed.GetProperty("name").ValueKind);
        Assert.False(listed.GetProperty("copyAvailable").GetBoolean());
        Assert.Equal(HttpStatusCode.Conflict, copied.StatusCode);
        Assert.Equal(ErrorCodes.SavedListCopyUnavailable, await ReasonOfAsync(copied));
    }

    [Fact]
    public async Task HiddenWatchedFilms_AreNotFoundForVisitors_ButStayReadableByTheirOwner()
    {
        var lea = await NewPersonAsync("Léa Vus");
        var me = (await lea.Client.GetFromJsonAsync<UserProfileResponse>("/api/v1/auth/me", Json))!;
        Assert.True(me.IsWatchedPublic);

        var patch = await lea.Client.PatchAsJsonAsync("/api/v1/auth/me", new { isWatchedPublic = false });

        Assert.Equal(HttpStatusCode.OK, patch.StatusCode);
        var patched = (await patch.Content.ReadFromJsonAsync<UserProfileResponse>(Json))!;
        Assert.Equal((false, true, true), (patched.IsWatchedPublic, patched.IsWatchlistPublic, patched.IsProfilePublic));
        var anonymous = _factory.CreateClient();
        var hidden = await anonymous.GetAsync($"/api/v1/users/{lea.Handle}/watched-movies");
        Assert.Equal(HttpStatusCode.NotFound, hidden.StatusCode);
        Assert.Equal(ErrorCodes.WatchedNotFound, await ReasonOfAsync(hidden));
        var profile = (await anonymous.GetFromJsonAsync<PublicProfileResponse>($"/api/v1/users/{lea.Handle}", Json))!;
        Assert.False(profile.IsWatchedPublic);
        Assert.Equal(HttpStatusCode.OK, (await lea.Client.GetAsync($"/api/v1/users/{lea.Handle}/watched-movies")).StatusCode);
        var export = await BodyOfAsync(await lea.Client.GetAsync("/api/v1/auth/me/export"));
        Assert.False(export.GetProperty("profile").GetProperty("isWatchedPublic").GetBoolean());
    }

    [Fact]
    public async Task PersonalDataExport_TellsWhichListsArePublic()
    {
        var lea = await NewPersonAsync("Léa Export");
        await CreateListAsync(lea, "Hitchcock", isPublic: true);
        await CreateListAsync(lea, "Pour plus tard", isPublic: false);

        var export = await BodyOfAsync(await lea.Client.GetAsync("/api/v1/auth/me/export"));

        Assert.Equal(
            [("Hitchcock", true), ("Pour plus tard", false)],
            export.GetProperty("movieLists").EnumerateArray()
                .Select(list => (list.GetProperty("name").GetString()!, list.GetProperty("isPublic").GetBoolean()))
                .Order());
        Assert.True(export.GetProperty("profile").GetProperty("isWatchedPublic").GetBoolean());
    }
}
