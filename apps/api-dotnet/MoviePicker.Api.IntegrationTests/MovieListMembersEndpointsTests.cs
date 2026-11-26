using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Domain.Exceptions;
using Xunit;

namespace MoviePicker.Api.IntegrationTests;

public sealed class MovieListMembersEndpointsTests : IClassFixture<MoviePickerApplicationFactory>
{
    private const string Route = "/api/v1/lists";

    private const string UnknownObjectId = "0123456789abcdef01234567";

    private static readonly JsonSerializerOptions Json = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        PropertyNameCaseInsensitive = true,
        Converters = { new JsonStringEnumConverter(JsonNamingPolicy.CamelCase) }
    };

    private readonly MoviePickerApplicationFactory _factory;

    public MovieListMembersEndpointsTests(MoviePickerApplicationFactory factory) => _factory = factory;

    private sealed record Account(HttpClient Client, UserProfileResponse Profile)
    {
        public string Id => Profile.UserId;
    }

    private async Task<Account> NewUserAsync(string displayName)
    {
        var client = await IntegrationTestAuth.NewRegisteredClientAsync(_factory, displayName);
        var profile = await client.GetFromJsonAsync<UserProfileResponse>("/api/v1/auth/me", Json);
        return new Account(client, profile!);
    }

    private static async Task FollowAsync(Account follower, Account followed) =>
        (await follower.Client.PostAsync($"/api/v1/users/{followed.Profile.Handle}/follow", null)).EnsureSuccessStatusCode();

    private static async Task<string> CreateListAsync(Account owner, string name)
    {
        var response = await owner.Client.PostAsJsonAsync(Route, new { name });
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        return (await response.Content.ReadFromJsonAsync<MovieListSummaryResponse>(Json))!.Id;
    }

    private static Task<HttpResponseMessage> InviteAsync(Account owner, string listId, Account invitee) =>
        owner.Client.PostAsJsonAsync($"{Route}/{listId}/invitations", new { userId = invitee.Id });

    private async Task<(Account Owner, Account Member, string ListId)> SharedListAsync(string tag)
    {
        var owner = await NewUserAsync($"Léa{tag}");
        var member = await NewUserAsync($"Sam{tag}");
        await FollowAsync(owner, member);
        var listId = await CreateListAsync(owner, "Halloween");
        Assert.Equal(HttpStatusCode.Created, (await InviteAsync(owner, listId, member)).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await member.Client.PostAsync($"{Route}/{listId}/invitation/accept", null)).StatusCode);
        return (owner, member, listId);
    }

    private static Task<HttpResponseMessage> AddTitleAsync(Account account, string listId, int tmdbId, string title) =>
        account.Client.PostAsJsonAsync($"{Route}/{listId}/items", new { tmdbId, mediaType = "movie", title, year = "1999" });

    private static async Task<string?> ReasonOfAsync(HttpResponseMessage response) =>
        JsonElement.Parse(await response.Content.ReadAsStringAsync()).GetProperty("reason").GetString();

    private static async Task<JsonElement> BodyOfAsync(HttpResponseMessage response) =>
        JsonElement.Parse(await response.Content.ReadAsStringAsync());

    [Theory]
    [InlineData("GET", "/members")]
    [InlineData("GET", "/invitable")]
    [InlineData("POST", "/invitations")]
    [InlineData("DELETE", "/invitations/" + UnknownObjectId)]
    [InlineData("POST", "/invitation/accept")]
    [InlineData("POST", "/invitation/decline")]
    [InlineData("DELETE", "/members/" + UnknownObjectId)]
    [InlineData("POST", "/leave")]
    [InlineData("POST", "/invite-link")]
    [InlineData("DELETE", "/invite-link")]
    public async Task EveryMembershipRoute_WithoutASession_IsUnauthorized(string method, string suffix)
    {
        using var request = new HttpRequestMessage(new HttpMethod(method), $"{Route}/{UnknownObjectId}{suffix}")
        {
            Content = JsonContent.Create(new { userId = UnknownObjectId })
        };

        var response = await _factory.CreateClient().SendAsync(request);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Joining_WithoutASession_IsUnauthorized_ButThePreviewAnswers()
    {
        var owner = await NewUserAsync("LéaPreview");
        var listId = await CreateListAsync(owner, "Halloween");
        var link = await (await owner.Client.PostAsync($"{Route}/{listId}/invite-link", null)).Content.ReadFromJsonAsync<MovieListInviteLinkResponse>(Json);
        var anonymous = _factory.CreateClient();

        var preview = await anonymous.GetAsync($"{Route}/join/{link!.Token}");
        var join = await anonymous.PostAsync($"{Route}/join/{link.Token}", null);

        Assert.Equal(HttpStatusCode.OK, preview.StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, join.StatusCode);
    }

    [Fact]
    public async Task Invitation_IsNotifiedWithItsAnswers_AndAcceptingPutsTheListInTheMembersLists()
    {
        var owner = await NewUserAsync("LéaInvite");
        var invitee = await NewUserAsync("ZoéInvite");
        await FollowAsync(owner, invitee);
        var listId = await CreateListAsync(owner, "Halloween");

        var invited = await InviteAsync(owner, listId, invitee);
        var beforeAccepting = await invitee.Client.GetAsync($"{Route}/{listId}");
        var inbox = await invitee.Client.GetFromJsonAsync<JsonElement>("/api/v1/notifications/inbox", Json);
        var accepted = await invitee.Client.PostAsync($"{Route}/{listId}/invitation/accept", null);
        var inboxAfter = await invitee.Client.GetFromJsonAsync<JsonElement>("/api/v1/notifications/inbox", Json);
        var lists = await invitee.Client.GetFromJsonAsync<JsonElement>(Route, Json);

        Assert.Equal(HttpStatusCode.Created, invited.StatusCode);
        var invitation = await BodyOfAsync(invited);
        Assert.Equal(invitee.Id, invitation.GetProperty("userId").GetString());
        Assert.Equal("ZoéInvite", invitation.GetProperty("displayName").GetString());
        Assert.True(invitation.TryGetProperty("invitedAt", out _));
        Assert.Equal(HttpStatusCode.NotFound, beforeAccepting.StatusCode);
        var notice = inbox.GetProperty("items").EnumerateArray().Single(item => item.GetProperty("type").GetString() == "listinvitation");
        Assert.Equal(listId, notice.GetProperty("listId").GetString());
        Assert.Equal("Halloween", notice.GetProperty("listName").GetString());
        Assert.Equal("LéaInvite", notice.GetProperty("actorDisplayName").GetString());
        Assert.True(notice.GetProperty("listInvitationPending").GetBoolean());
        Assert.Equal(HttpStatusCode.OK, accepted.StatusCode);
        Assert.Equal("member", (await BodyOfAsync(accepted)).GetProperty("role").GetString());
        var noticeAfter = inboxAfter.GetProperty("items").EnumerateArray().Single(item => item.GetProperty("type").GetString() == "listinvitation");
        Assert.False(noticeAfter.GetProperty("listInvitationPending").GetBoolean());
        var joined = lists.GetProperty("items").EnumerateArray().Single();
        Assert.Equal(listId, joined.GetProperty("id").GetString());
        Assert.Equal("member", joined.GetProperty("role").GetString());
        Assert.Equal("LéaInvite", joined.GetProperty("owner").GetProperty("displayName").GetString());
        Assert.Equal(owner.Id, joined.GetProperty("owner").GetProperty("userId").GetString());
        Assert.Equal(2, joined.GetProperty("memberCount").GetInt32());
        Assert.Equal(
            ["LéaInvite", "ZoéInvite"],
            joined.GetProperty("memberPreview").EnumerateArray().Select(person => person.GetProperty("displayName").GetString()));
    }

    [Fact]
    public async Task Invitation_DeclinedOrCancelled_LeavesTheInviteeOutside()
    {
        var owner = await NewUserAsync("LéaDecline");
        var invitee = await NewUserAsync("ZoéDecline");
        await FollowAsync(owner, invitee);
        var listId = await CreateListAsync(owner, "Halloween");
        await InviteAsync(owner, listId, invitee);

        var declined = await invitee.Client.PostAsync($"{Route}/{listId}/invitation/decline", null);
        var acceptAfterDecline = await invitee.Client.PostAsync($"{Route}/{listId}/invitation/accept", null);
        await InviteAsync(owner, listId, invitee);
        var cancelled = await owner.Client.DeleteAsync($"{Route}/{listId}/invitations/{invitee.Id}");
        var inbox = await invitee.Client.GetFromJsonAsync<NotificationInboxResponse>("/api/v1/notifications/inbox", Json);

        Assert.Equal(HttpStatusCode.NoContent, declined.StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, acceptAfterDecline.StatusCode);
        Assert.Equal(ErrorCodes.ListInvitationNotFound, await ReasonOfAsync(acceptAfterDecline));
        Assert.Equal(HttpStatusCode.NoContent, cancelled.StatusCode);
        Assert.DoesNotContain(inbox!.Items, item => item.Type == "listinvitation");
        Assert.Empty((await invitee.Client.GetFromJsonAsync<MovieListsResponse>(Route, Json))!.Items);
    }

    [Fact]
    public async Task Invitation_OfAnAccountNotFollowed_IsRefused()
    {
        var owner = await NewUserAsync("LéaNotFollowed");
        var stranger = await NewUserAsync("Inconnu");
        var listId = await CreateListAsync(owner, "Halloween");

        var response = await InviteAsync(owner, listId, stranger);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal(ErrorCodes.InviteOnlyFollowed, await ReasonOfAsync(response));
    }

    [Fact]
    public async Task Members_TheOwnerSeesInvitationsAndTheLink_AMemberOnlyTheMembers()
    {
        var (owner, member, listId) = await SharedListAsync("Members");
        var invitee = await NewUserAsync("ZoéMembers");
        await FollowAsync(owner, invitee);
        await InviteAsync(owner, listId, invitee);
        await owner.Client.PostAsync($"{Route}/{listId}/invite-link", null);

        var asOwner = await owner.Client.GetFromJsonAsync<JsonElement>($"{Route}/{listId}/members", Json);
        var asMember = await member.Client.GetFromJsonAsync<JsonElement>($"{Route}/{listId}/members", Json);

        Assert.Equal(20, asOwner.GetProperty("maxMembers").GetInt32());
        var members = asOwner.GetProperty("members").EnumerateArray().ToList();
        Assert.Equal([owner.Id, member.Id], members.Select(m => m.GetProperty("userId").GetString()));
        Assert.Equal([true, false], members.Select(m => m.GetProperty("isOwner").GetBoolean()));
        Assert.True(members[1].TryGetProperty("joinedAt", out _));
        Assert.Equal(invitee.Id, asOwner.GetProperty("invitations").EnumerateArray().Single().GetProperty("userId").GetString());
        var link = asOwner.GetProperty("inviteLink");
        Assert.False(string.IsNullOrEmpty(link.GetProperty("token").GetString()));
        Assert.True(link.GetProperty("active").GetBoolean());
        Assert.True(link.TryGetProperty("expiresAt", out _));
        Assert.Equal(2, asMember.GetProperty("members").GetArrayLength());
        Assert.Equal(JsonValueKind.Null, asMember.GetProperty("invitations").ValueKind);
        Assert.Equal(JsonValueKind.Null, asMember.GetProperty("inviteLink").ValueKind);
    }

    [Fact]
    public async Task Invitable_ListsTheOwnersFollows_ButNotTheMembers_FilteredByTheQuery()
    {
        var (owner, member, listId) = await SharedListAsync("Invitable");
        var ana = await NewUserAsync("Ana Lopez");
        var bea = await NewUserAsync("Béatrice");
        await FollowAsync(owner, ana);
        await FollowAsync(owner, bea);

        var all = await owner.Client.GetFromJsonAsync<MovieListInvitableUsersResponse>($"{Route}/{listId}/invitable", Json);
        var filtered = await owner.Client.GetFromJsonAsync<MovieListInvitableUsersResponse>($"{Route}/{listId}/invitable?q=beat", Json);

        Assert.Equal(
            new[] { ana.Id, bea.Id }.Order(StringComparer.Ordinal),
            all!.Users.Select(user => user.UserId).Order(StringComparer.Ordinal));
        Assert.DoesNotContain(all.Users, user => user.UserId == member.Id);
        Assert.Equal([bea.Id], filtered!.Users.Select(user => user.UserId));
    }

    [Fact]
    public async Task SharedList_IsInvisibleToEveryoneElse_OnEveryRoute()
    {
        var (owner, _, listId) = await SharedListAsync("Hidden");
        var intruder = await NewUserAsync("Intrus");
        var listRoute = $"{Route}/{listId}";

        HttpResponseMessage[] responses =
        [
            await intruder.Client.GetAsync(listRoute),
            await intruder.Client.PatchAsJsonAsync(listRoute, new { name = "Volée" }),
            await intruder.Client.DeleteAsync(listRoute),
            await AddTitleAsync(intruder, listId, 680, "Pulp Fiction"),
            await intruder.Client.DeleteAsync($"{listRoute}/items/680"),
            await intruder.Client.GetAsync($"{listRoute}/members"),
            await intruder.Client.GetAsync($"{listRoute}/invitable"),
            await intruder.Client.PostAsJsonAsync($"{listRoute}/invitations", new { userId = owner.Id }),
            await intruder.Client.DeleteAsync($"{listRoute}/invitations/{owner.Id}"),
            await intruder.Client.DeleteAsync($"{listRoute}/members/{owner.Id}"),
            await intruder.Client.PostAsync($"{listRoute}/leave", null),
            await intruder.Client.PostAsync($"{listRoute}/invite-link", null),
            await intruder.Client.DeleteAsync($"{listRoute}/invite-link")
        ];

        foreach (var response in responses)
        {
            Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
            Assert.Equal(ErrorCodes.ListNotFound, await ReasonOfAsync(response));
        }
        Assert.DoesNotContain(
            (await intruder.Client.GetFromJsonAsync<MovieListsResponse>($"{Route}?tmdbId=603", Json))!.Items,
            list => list.Id == listId);
    }

    [Fact]
    public async Task AMember_IsRefusedTheOwnersRoutes_WithADedicatedReason()
    {
        var (owner, member, listId) = await SharedListAsync("Forbidden");
        var listRoute = $"{Route}/{listId}";

        HttpResponseMessage[] responses =
        [
            await member.Client.PatchAsJsonAsync(listRoute, new { name = "Renommée" }),
            await member.Client.DeleteAsync(listRoute),
            await member.Client.GetAsync($"{listRoute}/invitable"),
            await member.Client.PostAsJsonAsync($"{listRoute}/invitations", new { userId = owner.Id }),
            await member.Client.DeleteAsync($"{listRoute}/invitations/{owner.Id}"),
            await member.Client.DeleteAsync($"{listRoute}/members/{owner.Id}"),
            await member.Client.PostAsync($"{listRoute}/invite-link", null),
            await member.Client.DeleteAsync($"{listRoute}/invite-link")
        ];

        foreach (var response in responses)
        {
            Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
            Assert.Equal(ErrorCodes.ListOwnerOnly, await ReasonOfAsync(response));
        }
        Assert.Equal("Halloween", (await owner.Client.GetFromJsonAsync<MovieListResponse>(listRoute, Json))!.Name);
    }

    [Fact]
    public async Task Members_AddAndRemoveEachOthersTitles_AndEachTitleSaysWhoAddedIt()
    {
        var (owner, member, listId) = await SharedListAsync("Items");

        var byMember = await AddTitleAsync(member, listId, 603, "Matrix");
        var sameByOwner = await AddTitleAsync(owner, listId, 603, "Matrix");
        var byOwner = await AddTitleAsync(owner, listId, 680, "Pulp Fiction");
        var removedByMember = await member.Client.DeleteAsync($"{Route}/{listId}/items/680");
        var detail = await member.Client.GetFromJsonAsync<JsonElement>($"{Route}/{listId}", Json);
        var probed = await member.Client.GetFromJsonAsync<MovieListsResponse>($"{Route}?tmdbId=603&mediaType=movie", Json);

        Assert.Equal(HttpStatusCode.Created, byMember.StatusCode);
        Assert.Equal(member.Id, (await BodyOfAsync(byMember)).GetProperty("addedBy").GetProperty("userId").GetString());
        Assert.Equal(HttpStatusCode.OK, sameByOwner.StatusCode);
        Assert.Equal("SamItems", (await BodyOfAsync(sameByOwner)).GetProperty("addedBy").GetProperty("displayName").GetString());
        Assert.Equal(HttpStatusCode.Created, byOwner.StatusCode);
        Assert.Equal(HttpStatusCode.NoContent, removedByMember.StatusCode);
        Assert.Equal("member", detail.GetProperty("role").GetString());
        var item = detail.GetProperty("items").EnumerateArray().Single();
        Assert.Equal(603, item.GetProperty("tmdbId").GetInt32());
        var addedBy = item.GetProperty("addedBy");
        Assert.Equal((member.Id, "SamItems"), (addedBy.GetProperty("userId").GetString(), addedBy.GetProperty("displayName").GetString()));
        Assert.True(addedBy.TryGetProperty("handle", out _));
        Assert.True(addedBy.TryGetProperty("avatarId", out _));
        Assert.True(Assert.Single(probed!.Items).ContainsMovie);
    }

    [Fact]
    public async Task Leaving_KeepsTheTitles_AndTheOwnerCannotLeave()
    {
        var (owner, member, listId) = await SharedListAsync("Leave");
        await AddTitleAsync(member, listId, 603, "Matrix");

        var ownerLeaves = await owner.Client.PostAsync($"{Route}/{listId}/leave", null);
        var memberLeaves = await member.Client.PostAsync($"{Route}/{listId}/leave", null);

        Assert.Equal(HttpStatusCode.Conflict, ownerLeaves.StatusCode);
        Assert.Equal(ErrorCodes.ListOwnerCannotLeave, await ReasonOfAsync(ownerLeaves));
        Assert.Equal(HttpStatusCode.NoContent, memberLeaves.StatusCode);
        Assert.Empty((await member.Client.GetFromJsonAsync<MovieListsResponse>(Route, Json))!.Items);
        var kept = await owner.Client.GetFromJsonAsync<MovieListResponse>($"{Route}/{listId}", Json);
        Assert.Equal(member.Id, Assert.Single(kept!.Items).AddedBy!.UserId);
        Assert.Equal(1, kept.MemberCount);
    }

    [Fact]
    public async Task RemovingAMember_TakesTheListAwayFromThem()
    {
        var (owner, member, listId) = await SharedListAsync("Remove");

        var removed = await owner.Client.DeleteAsync($"{Route}/{listId}/members/{member.Id}");

        Assert.Equal(HttpStatusCode.NoContent, removed.StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await member.Client.GetAsync($"{Route}/{listId}")).StatusCode);
    }

    [Fact]
    public async Task RemovingAMember_DisablesTheLink_SoTheyCannotComeBackThroughIt()
    {
        var owner = await NewUserAsync("LéaRejoin");
        var member = await NewUserAsync("SamRejoin");
        var listId = await CreateListAsync(owner, "Halloween");
        var link = await (await owner.Client.PostAsync($"{Route}/{listId}/invite-link", null)).Content.ReadFromJsonAsync<MovieListInviteLinkResponse>(Json);
        Assert.Equal(HttpStatusCode.Created, (await member.Client.PostAsync($"{Route}/join/{link!.Token}", null)).StatusCode);

        var removed = await owner.Client.DeleteAsync($"{Route}/{listId}/members/{member.Id}");
        var rejoin = await member.Client.PostAsync($"{Route}/join/{link.Token}", null);
        var asOwner = await owner.Client.GetFromJsonAsync<JsonElement>($"{Route}/{listId}/members", Json);

        Assert.Equal(HttpStatusCode.NoContent, removed.StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, rejoin.StatusCode);
        Assert.Equal(ErrorCodes.ListInviteLinkInvalid, await ReasonOfAsync(rejoin));
        Assert.Equal(HttpStatusCode.NotFound, (await member.Client.GetAsync($"{Route}/{listId}")).StatusCode);
        Assert.False(asOwner.GetProperty("inviteLink").GetProperty("active").GetBoolean());
        Assert.Equal([owner.Id], asOwner.GetProperty("members").EnumerateArray().Select(m => m.GetProperty("userId").GetString()));
    }

    [Fact]
    public async Task InviteLink_PreviewsWithoutLeaking_JoinsOnce_ThenStopsOnceDisabled()
    {
        var owner = await NewUserAsync("LéaLink");
        var joiner = await NewUserAsync("SamLink");
        var listId = await CreateListAsync(owner, "Halloween");
        await AddTitleAsync(owner, listId, 603, "Matrix");
        var created = await owner.Client.PostAsync($"{Route}/{listId}/invite-link", null);
        var link = await created.Content.ReadFromJsonAsync<MovieListInviteLinkResponse>(Json);

        var preview = await BodyOfAsync(await _factory.CreateClient().GetAsync($"{Route}/join/{link!.Token}"));
        var first = await joiner.Client.PostAsync($"{Route}/join/{link.Token}", null);
        var again = await joiner.Client.PostAsync($"{Route}/join/{link.Token}", null);
        var previewAsMember = await BodyOfAsync(await joiner.Client.GetAsync($"{Route}/join/{link.Token}"));
        var disabled = await owner.Client.DeleteAsync($"{Route}/{listId}/invite-link");
        var afterDisable = await _factory.CreateClient().GetAsync($"{Route}/join/{link.Token}");
        var latecomer = await NewUserAsync("ZoéLink");
        var lateJoin = await latecomer.Client.PostAsync($"{Route}/join/{link.Token}", null);

        Assert.Equal(HttpStatusCode.OK, created.StatusCode);
        Assert.Matches("^[A-Za-z0-9_-]{22,}$", link.Token);
        Assert.Equal("Halloween", preview.GetProperty("name").GetString());
        Assert.Equal("LéaLink", preview.GetProperty("owner").GetProperty("displayName").GetString());
        Assert.False(preview.GetProperty("owner").TryGetProperty("userId", out _));
        Assert.Equal(1, preview.GetProperty("itemCount").GetInt32());
        Assert.False(preview.GetProperty("isFull").GetBoolean());
        Assert.Equal(JsonValueKind.Null, preview.GetProperty("listId").ValueKind);
        Assert.Equal(JsonValueKind.Null, preview.GetProperty("role").ValueKind);
        Assert.False(preview.TryGetProperty("description", out _));
        Assert.Equal(HttpStatusCode.Created, first.StatusCode);
        Assert.Equal("member", (await BodyOfAsync(first)).GetProperty("role").GetString());
        Assert.Equal(HttpStatusCode.OK, again.StatusCode);
        Assert.Equal(listId, previewAsMember.GetProperty("listId").GetString());
        Assert.Equal("member", previewAsMember.GetProperty("role").GetString());
        Assert.Equal(HttpStatusCode.NoContent, disabled.StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, afterDisable.StatusCode);
        Assert.Equal(ErrorCodes.ListInviteLinkInvalid, await ReasonOfAsync(afterDisable));
        Assert.Equal(HttpStatusCode.NotFound, lateJoin.StatusCode);
        Assert.Equal(ErrorCodes.ListInviteLinkInvalid, await ReasonOfAsync(lateJoin));
    }

    [Fact]
    public async Task InviteLink_AnUnknownToken_IsNotFound()
    {
        var response = await _factory.CreateClient().GetAsync($"{Route}/join/not-a-real-token");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        Assert.Equal(ErrorCodes.ListInviteLinkInvalid, await ReasonOfAsync(response));
    }

    [Fact]
    public async Task DeletingTheList_TakesItAwayFromTheMembers()
    {
        var (owner, member, listId) = await SharedListAsync("Delete");

        var deleted = await owner.Client.DeleteAsync($"{Route}/{listId}");

        Assert.Equal(HttpStatusCode.NoContent, deleted.StatusCode);
        Assert.Empty((await member.Client.GetFromJsonAsync<MovieListsResponse>(Route, Json))!.Items);
    }

    [Fact]
    public async Task ADeletedMember_LeavesTheirTitlesToTheListOwner()
    {
        var (owner, member, listId) = await SharedListAsync("Deleted");
        await AddTitleAsync(member, listId, 603, "Matrix");

        var deletion = await member.Client.SendAsync(new HttpRequestMessage(HttpMethod.Delete, "/api/v1/auth/me")
        {
            Content = JsonContent.Create(new DeleteAccountRequest { Password = "abcd1234" })
        });

        Assert.True(deletion.IsSuccessStatusCode, await deletion.Content.ReadAsStringAsync());
        var kept = await owner.Client.GetFromJsonAsync<MovieListResponse>($"{Route}/{listId}", Json);
        Assert.Equal(owner.Profile.UserId, Assert.Single(kept!.Items).AddedBy?.UserId);
        Assert.Equal(1, kept.MemberCount);
    }

    [Fact]
    public async Task DeletingTheOwnersAccount_WithdrawsTheInvitationsTheyHadSent()
    {
        var owner = await NewUserAsync("LéaGone");
        var invitee = await NewUserAsync("ZoéGone");
        await FollowAsync(owner, invitee);
        var listId = await CreateListAsync(owner, "Halloween");
        Assert.Equal(HttpStatusCode.Created, (await InviteAsync(owner, listId, invitee)).StatusCode);

        var deletion = await owner.Client.SendAsync(new HttpRequestMessage(HttpMethod.Delete, "/api/v1/auth/me")
        {
            Content = JsonContent.Create(new DeleteAccountRequest { Password = "abcd1234" })
        });
        var inbox = await invitee.Client.GetFromJsonAsync<NotificationInboxResponse>("/api/v1/notifications/inbox", Json);

        Assert.True(deletion.IsSuccessStatusCode, await deletion.Content.ReadAsStringAsync());
        Assert.DoesNotContain(inbox!.Items, item => item.Type == "listinvitation");
    }

    [Fact]
    public async Task PersonalDataExport_HoldsTheJoinedListsAndThePendingInvitations()
    {
        var (owner, member, listId) = await SharedListAsync("Export");
        var pendingListId = await CreateListAsync(owner, "Nanars");
        await InviteAsync(owner, pendingListId, member);

        var export = JsonElement.Parse(await member.Client.GetStringAsync("/api/v1/auth/me/export"));

        var joined = Assert.Single(export.GetProperty("joinedMovieLists").EnumerateArray().ToList());
        Assert.Equal((listId, "Halloween", "LéaExport"), (joined.GetProperty("listId").GetString(), joined.GetProperty("name").GetString(), joined.GetProperty("ownerDisplayName").GetString()));
        var pending = Assert.Single(export.GetProperty("pendingListInvitations").EnumerateArray().ToList());
        Assert.Equal(pendingListId, pending.GetProperty("listId").GetString());
    }

    [Fact]
    public async Task NotificationPreferences_OfferTheListInvitationType()
    {
        var account = await NewUserAsync("Prefs");

        var preferences = await account.Client.GetFromJsonAsync<NotificationPreferencesResponse>("/api/v1/notifications/preferences", Json);

        Assert.Contains(preferences!.Preferences, preference => preference is { Type: "listinvitation", Enabled: true });
    }
}
