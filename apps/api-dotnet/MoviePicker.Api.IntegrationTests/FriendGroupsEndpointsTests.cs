using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Domain.Exceptions;
using MoviePicker.Api.Tests.Builders;
using Xunit;

namespace MoviePicker.Api.IntegrationTests;

public sealed class FriendGroupsEndpointsTests : IClassFixture<MoviePickerApplicationFactory>
{
    private const string Route = "/api/v1/groups";

    private const string UnknownObjectId = "0123456789abcdef01234567";

    private static readonly string[] SummaryFields =
        ["id", "name", "role", "ownerId", "ownerDisplayName", "memberCount", "memberPreview", "createdAt", "updatedAt"];

    private static readonly JsonSerializerOptions Json = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        PropertyNameCaseInsensitive = true,
        Converters = { new JsonStringEnumConverter(JsonNamingPolicy.CamelCase) }
    };

    private readonly MoviePickerApplicationFactory _factory;

    public FriendGroupsEndpointsTests(MoviePickerApplicationFactory factory) => _factory = factory;

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

    private static async Task<string> CreateGroupAsync(Account owner, string name)
    {
        var response = await owner.Client.PostAsJsonAsync(Route, new { name });
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        return (await BodyOfAsync(response)).GetProperty("id").GetString()!;
    }

    private static Task<HttpResponseMessage> InviteAsync(Account owner, string groupId, Account invitee) =>
        owner.Client.PostAsJsonAsync($"{Route}/{groupId}/invitations", new { userId = invitee.Id });

    private async Task<(Account Owner, Account Member, string GroupId)> SharedGroupAsync(string tag)
    {
        var owner = await NewUserAsync($"Léa{tag}");
        var member = await NewUserAsync($"Sam{tag}");
        await FollowAsync(owner, member);
        var groupId = await CreateGroupAsync(owner, "Les cinéphiles");
        Assert.Equal(HttpStatusCode.Created, (await InviteAsync(owner, groupId, member)).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await member.Client.PostAsync($"{Route}/{groupId}/invitation/accept", null)).StatusCode);
        return (owner, member, groupId);
    }

    private static async Task<string> CreateLinkAsync(Account owner, string groupId)
    {
        var created = await owner.Client.PostAsync($"{Route}/{groupId}/invite-link", null);
        Assert.Equal(HttpStatusCode.OK, created.StatusCode);
        return (await BodyOfAsync(created)).GetProperty("token").GetString()!;
    }

    private static async Task<string?> ReasonOfAsync(HttpResponseMessage response) =>
        JsonElement.Parse(await response.Content.ReadAsStringAsync()).GetProperty("reason").GetString();

    private static async Task<JsonElement> BodyOfAsync(HttpResponseMessage response) =>
        JsonElement.Parse(await response.Content.ReadAsStringAsync());

    private static string[] FieldsOf(JsonElement element) => [.. element.EnumerateObject().Select(property => property.Name)];

    private static Task<HttpResponseMessage> DeleteAccountAsync(Account account) =>
        account.Client.SendAsync(new HttpRequestMessage(HttpMethod.Delete, "/api/v1/auth/me")
        {
            Content = JsonContent.Create(new DeleteAccountRequest { Password = "abcd1234" })
        });

    [Theory]
    [InlineData("GET", "")]
    [InlineData("POST", "")]
    [InlineData("GET", "/" + UnknownObjectId)]
    [InlineData("PATCH", "/" + UnknownObjectId)]
    [InlineData("DELETE", "/" + UnknownObjectId)]
    [InlineData("GET", "/" + UnknownObjectId + "/members")]
    [InlineData("GET", "/" + UnknownObjectId + "/invitable")]
    [InlineData("POST", "/" + UnknownObjectId + "/invitations")]
    [InlineData("DELETE", "/" + UnknownObjectId + "/invitations/" + UnknownObjectId)]
    [InlineData("POST", "/" + UnknownObjectId + "/invitation/accept")]
    [InlineData("POST", "/" + UnknownObjectId + "/invitation/decline")]
    [InlineData("DELETE", "/" + UnknownObjectId + "/members/" + UnknownObjectId)]
    [InlineData("POST", "/" + UnknownObjectId + "/leave")]
    [InlineData("POST", "/" + UnknownObjectId + "/invite-link")]
    [InlineData("DELETE", "/" + UnknownObjectId + "/invite-link")]
    [InlineData("POST", "/join/some-token")]
    public async Task EveryRoute_ButThePreview_WithoutASession_IsUnauthorized(string method, string suffix)
    {
        using var request = new HttpRequestMessage(new HttpMethod(method), $"{Route}{suffix}")
        {
            Content = JsonContent.Create(new { userId = UnknownObjectId, name = "Les cinéphiles" })
        };

        var response = await _factory.CreateClient().SendAsync(request);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task CreateListAndGet_AnswerTheDocumentedShapes()
    {
        var owner = await NewUserAsync("LéaShape");

        var created = await owner.Client.PostAsJsonAsync(Route, new { name = "  Les cinéphiles  " });
        var summary = await BodyOfAsync(created);
        var groupId = summary.GetProperty("id").GetString()!;
        var mine = await owner.Client.GetFromJsonAsync<JsonElement>(Route, Json);
        var detail = await owner.Client.GetFromJsonAsync<JsonElement>($"{Route}/{groupId}", Json);

        Assert.Equal(HttpStatusCode.Created, created.StatusCode);
        Assert.Equal(SummaryFields, FieldsOf(summary));
        Assert.Equal("Les cinéphiles", summary.GetProperty("name").GetString());
        Assert.Equal("owner", summary.GetProperty("role").GetString());
        Assert.Equal((owner.Id, "LéaShape", 1), (summary.GetProperty("ownerId").GetString(), summary.GetProperty("ownerDisplayName").GetString(), summary.GetProperty("memberCount").GetInt32()));
        var person = summary.GetProperty("memberPreview").EnumerateArray().Single();
        Assert.Equal(["userId", "displayName", "avatarId"], FieldsOf(person));
        Assert.Equal(owner.Id, person.GetProperty("userId").GetString());
        Assert.Equal(["groups", "invitations", "nextNights"], FieldsOf(mine));
        Assert.Equal(groupId, mine.GetProperty("groups").EnumerateArray().Single().GetProperty("id").GetString());
        Assert.Empty(mine.GetProperty("invitations").EnumerateArray());
        Assert.Equal([.. SummaryFields, "members", "upcomingNights", "nextNightParticipantIds", "pastNights"], FieldsOf(detail));
        var member = detail.GetProperty("members").EnumerateArray().Single();
        Assert.Equal(["userId", "handle", "displayName", "avatarId", "role", "joinedAt"], FieldsOf(member));
        Assert.Equal((owner.Id, "owner"), (member.GetProperty("userId").GetString(), member.GetProperty("role").GetString()));
        Assert.False(summary.TryGetProperty("_id", out _));
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData("01234567890123456789012345678901234567890")]
    public async Task Create_ABlankOrTooLongName_IsAValidationError(string name)
    {
        var owner = await NewUserAsync("LéaName");

        var response = await owner.Client.PostAsJsonAsync(Route, new { name });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal(ErrorCodes.ValidationFailed, await ReasonOfAsync(response));
        Assert.Empty((await owner.Client.GetFromJsonAsync<JsonElement>(Route, Json)).GetProperty("groups").EnumerateArray());
    }

    [Fact]
    public async Task Rename_ChangesTheNameForEveryMember()
    {
        var (owner, member, groupId) = await SharedGroupAsync("Rename");

        var renamed = await owner.Client.PatchAsJsonAsync($"{Route}/{groupId}", new { name = "Ciné du jeudi" });

        Assert.Equal(HttpStatusCode.OK, renamed.StatusCode);
        Assert.Equal(SummaryFields, FieldsOf(await BodyOfAsync(renamed)));
        var seen = await member.Client.GetFromJsonAsync<JsonElement>($"{Route}/{groupId}", Json);
        Assert.Equal("Ciné du jeudi", seen.GetProperty("name").GetString());
    }

    [Fact]
    public async Task Invitation_IsNotifiedWithItsAnswers_AndAcceptingPutsTheGroupInTheMembersGroups()
    {
        var owner = await NewUserAsync("LéaInvite");
        var invitee = await NewUserAsync("ZoéInvite");
        await FollowAsync(owner, invitee);
        var groupId = await CreateGroupAsync(owner, "Les cinéphiles");

        var invited = await InviteAsync(owner, groupId, invitee);
        var beforeAccepting = await invitee.Client.GetAsync($"{Route}/{groupId}");
        var pending = await invitee.Client.GetFromJsonAsync<JsonElement>(Route, Json);
        var inbox = await invitee.Client.GetFromJsonAsync<JsonElement>("/api/v1/notifications/inbox", Json);
        var accepted = await invitee.Client.PostAsync($"{Route}/{groupId}/invitation/accept", null);
        var inboxAfter = await invitee.Client.GetFromJsonAsync<JsonElement>("/api/v1/notifications/inbox", Json);
        var mine = await invitee.Client.GetFromJsonAsync<JsonElement>(Route, Json);

        Assert.Equal(HttpStatusCode.Created, invited.StatusCode);
        var invitation = await BodyOfAsync(invited);
        Assert.Equal(["userId", "handle", "displayName", "avatarId", "invitedAt"], FieldsOf(invitation));
        Assert.Equal((invitee.Id, "ZoéInvite"), (invitation.GetProperty("userId").GetString(), invitation.GetProperty("displayName").GetString()));
        Assert.Equal(HttpStatusCode.NotFound, beforeAccepting.StatusCode);
        Assert.Equal(ErrorCodes.GroupNotFound, await ReasonOfAsync(beforeAccepting));
        Assert.Empty(pending.GetProperty("groups").EnumerateArray());
        var offer = pending.GetProperty("invitations").EnumerateArray().Single();
        Assert.Equal(["groupId", "name", "invitedByDisplayName", "memberCount", "memberPreview", "invitedAt"], FieldsOf(offer));
        Assert.Equal((groupId, "Les cinéphiles", "LéaInvite", 1), (offer.GetProperty("groupId").GetString(), offer.GetProperty("name").GetString(), offer.GetProperty("invitedByDisplayName").GetString(), offer.GetProperty("memberCount").GetInt32()));
        var notice = inbox.GetProperty("items").EnumerateArray().Single(item => item.GetProperty("type").GetString() == "groupinvitation");
        Assert.Equal(groupId, notice.GetProperty("groupId").GetString());
        Assert.Equal("Les cinéphiles", notice.GetProperty("groupName").GetString());
        Assert.Equal("LéaInvite", notice.GetProperty("actorDisplayName").GetString());
        Assert.True(notice.GetProperty("groupInvitationPending").GetBoolean());
        Assert.False(notice.GetProperty("listInvitationPending").GetBoolean());
        Assert.Equal(HttpStatusCode.OK, accepted.StatusCode);
        Assert.Equal("member", (await BodyOfAsync(accepted)).GetProperty("role").GetString());
        var noticeAfter = inboxAfter.GetProperty("items").EnumerateArray().Single(item => item.GetProperty("type").GetString() == "groupinvitation");
        Assert.False(noticeAfter.GetProperty("groupInvitationPending").GetBoolean());
        Assert.Empty(mine.GetProperty("invitations").EnumerateArray());
        var joined = mine.GetProperty("groups").EnumerateArray().Single();
        Assert.Equal((groupId, "member"), (joined.GetProperty("id").GetString(), joined.GetProperty("role").GetString()));
        Assert.Equal((owner.Id, "LéaInvite", 2), (joined.GetProperty("ownerId").GetString(), joined.GetProperty("ownerDisplayName").GetString(), joined.GetProperty("memberCount").GetInt32()));
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
        var groupId = await CreateGroupAsync(owner, "Les cinéphiles");
        await InviteAsync(owner, groupId, invitee);

        var declined = await invitee.Client.PostAsync($"{Route}/{groupId}/invitation/decline", null);
        var acceptAfterDecline = await invitee.Client.PostAsync($"{Route}/{groupId}/invitation/accept", null);
        await InviteAsync(owner, groupId, invitee);
        var cancelled = await owner.Client.DeleteAsync($"{Route}/{groupId}/invitations/{invitee.Id}");
        var inbox = await invitee.Client.GetFromJsonAsync<NotificationInboxResponse>("/api/v1/notifications/inbox", Json);
        var mine = await invitee.Client.GetFromJsonAsync<JsonElement>(Route, Json);

        Assert.Equal(HttpStatusCode.NoContent, declined.StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, acceptAfterDecline.StatusCode);
        Assert.Equal(ErrorCodes.GroupInvitationNotFound, await ReasonOfAsync(acceptAfterDecline));
        Assert.Equal(HttpStatusCode.NoContent, cancelled.StatusCode);
        Assert.DoesNotContain(inbox!.Items, item => item.Type == "groupinvitation");
        Assert.Empty(mine.GetProperty("groups").EnumerateArray());
        Assert.Empty(mine.GetProperty("invitations").EnumerateArray());
    }

    [Fact]
    public async Task Invitation_OfAnAccountNotFollowed_IsRefused()
    {
        var owner = await NewUserAsync("LéaNotFollowed");
        var stranger = await NewUserAsync("Inconnu");
        var groupId = await CreateGroupAsync(owner, "Les cinéphiles");

        var response = await InviteAsync(owner, groupId, stranger);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal(ErrorCodes.InviteOnlyFollowed, await ReasonOfAsync(response));
    }

    [Fact]
    public async Task Invitation_OfAMember_IsAConflict()
    {
        var (owner, member, groupId) = await SharedGroupAsync("Twice");

        var response = await InviteAsync(owner, groupId, member);

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
        Assert.Equal(ErrorCodes.GroupAlreadyMember, await ReasonOfAsync(response));
    }

    [Fact]
    public async Task Members_TheOwnerSeesInvitationsAndTheLink_AMemberOnlyTheMembers()
    {
        var (owner, member, groupId) = await SharedGroupAsync("Members");
        var invitee = await NewUserAsync("ZoéMembers");
        await FollowAsync(owner, invitee);
        await InviteAsync(owner, groupId, invitee);
        await owner.Client.PostAsync($"{Route}/{groupId}/invite-link", null);

        var asOwner = await owner.Client.GetFromJsonAsync<JsonElement>($"{Route}/{groupId}/members", Json);
        var asMember = await member.Client.GetFromJsonAsync<JsonElement>($"{Route}/{groupId}/members", Json);

        Assert.Equal(["maxMembers", "members", "invitations", "inviteLink"], FieldsOf(asOwner));
        Assert.Equal(20, asOwner.GetProperty("maxMembers").GetInt32());
        var members = asOwner.GetProperty("members").EnumerateArray().ToList();
        Assert.Equal([owner.Id, member.Id], members.Select(m => m.GetProperty("userId").GetString()));
        Assert.Equal(["owner", "member"], members.Select(m => m.GetProperty("role").GetString()));
        Assert.True(members[1].TryGetProperty("joinedAt", out _));
        Assert.Equal(invitee.Id, asOwner.GetProperty("invitations").EnumerateArray().Single().GetProperty("userId").GetString());
        var link = asOwner.GetProperty("inviteLink");
        Assert.Equal(["token", "expiresAt", "active"], FieldsOf(link));
        Assert.False(string.IsNullOrEmpty(link.GetProperty("token").GetString()));
        Assert.True(link.GetProperty("active").GetBoolean());
        Assert.Equal(2, asMember.GetProperty("members").GetArrayLength());
        Assert.Equal(JsonValueKind.Null, asMember.GetProperty("invitations").ValueKind);
        Assert.Equal(JsonValueKind.Null, asMember.GetProperty("inviteLink").ValueKind);
    }

    [Fact]
    public async Task Invitable_ListsTheOwnersFollows_ButNotTheMembers_FilteredByTheQuery()
    {
        var (owner, member, groupId) = await SharedGroupAsync("Invitable");
        var ana = await NewUserAsync("Ana Lopez");
        var bea = await NewUserAsync("Béatrice");
        await FollowAsync(owner, ana);
        await FollowAsync(owner, bea);

        var all = await owner.Client.GetFromJsonAsync<JsonElement>($"{Route}/{groupId}/invitable", Json);
        var filtered = await owner.Client.GetFromJsonAsync<JsonElement>($"{Route}/{groupId}/invitable?query=beat", Json);

        var users = all.GetProperty("users").EnumerateArray().ToList();
        Assert.Equal(["userId", "handle", "displayName", "avatarId"], FieldsOf(users[0]));
        Assert.Equal(
            new[] { ana.Id, bea.Id }.Order(StringComparer.Ordinal),
            users.Select(user => user.GetProperty("userId").GetString()).Order(StringComparer.Ordinal));
        Assert.DoesNotContain(users, user => user.GetProperty("userId").GetString() == member.Id);
        Assert.Equal([bea.Id], filtered.GetProperty("users").EnumerateArray().Select(user => user.GetProperty("userId").GetString()));
    }

    [Fact]
    public async Task AGroup_IsInvisibleToEveryoneElse_OnEveryRoute()
    {
        var (owner, _, groupId) = await SharedGroupAsync("Hidden");
        var intruder = await NewUserAsync("Intrus");
        var groupRoute = $"{Route}/{groupId}";

        HttpResponseMessage[] responses =
        [
            await intruder.Client.GetAsync(groupRoute),
            await intruder.Client.PatchAsJsonAsync(groupRoute, new { name = "Volé" }),
            await intruder.Client.DeleteAsync(groupRoute),
            await intruder.Client.GetAsync($"{groupRoute}/members"),
            await intruder.Client.GetAsync($"{groupRoute}/invitable"),
            await intruder.Client.PostAsJsonAsync($"{groupRoute}/invitations", new { userId = owner.Id }),
            await intruder.Client.DeleteAsync($"{groupRoute}/invitations/{owner.Id}"),
            await intruder.Client.DeleteAsync($"{groupRoute}/members/{owner.Id}"),
            await intruder.Client.PostAsync($"{groupRoute}/leave", null),
            await intruder.Client.PostAsync($"{groupRoute}/invite-link", null),
            await intruder.Client.DeleteAsync($"{groupRoute}/invite-link"),
            await intruder.Client.GetAsync($"{Route}/{UnknownObjectId}"),
            await intruder.Client.GetAsync($"{Route}/not-an-object-id")
        ];

        foreach (var response in responses)
        {
            Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
            Assert.Equal(ErrorCodes.GroupNotFound, await ReasonOfAsync(response));
        }
        Assert.Empty((await intruder.Client.GetFromJsonAsync<JsonElement>(Route, Json)).GetProperty("groups").EnumerateArray());
    }

    [Fact]
    public async Task AMember_IsRefusedTheOwnersRoutes_WithADedicatedReason()
    {
        var (owner, member, groupId) = await SharedGroupAsync("Forbidden");
        var groupRoute = $"{Route}/{groupId}";

        HttpResponseMessage[] responses =
        [
            await member.Client.PatchAsJsonAsync(groupRoute, new { name = "Renommé" }),
            await member.Client.DeleteAsync(groupRoute),
            await member.Client.GetAsync($"{groupRoute}/invitable"),
            await member.Client.PostAsJsonAsync($"{groupRoute}/invitations", new { userId = owner.Id }),
            await member.Client.DeleteAsync($"{groupRoute}/invitations/{owner.Id}"),
            await member.Client.DeleteAsync($"{groupRoute}/members/{owner.Id}"),
            await member.Client.PostAsync($"{groupRoute}/invite-link", null),
            await member.Client.DeleteAsync($"{groupRoute}/invite-link")
        ];

        foreach (var response in responses)
        {
            Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
            Assert.Equal(ErrorCodes.GroupOwnerOnly, await ReasonOfAsync(response));
        }
        Assert.Equal("Les cinéphiles", (await owner.Client.GetFromJsonAsync<JsonElement>(groupRoute, Json)).GetProperty("name").GetString());
    }

    [Fact]
    public async Task Leaving_TakesTheGroupAway_AndTheOwnerCannotLeave()
    {
        var (owner, member, groupId) = await SharedGroupAsync("Leave");

        var ownerLeaves = await owner.Client.PostAsync($"{Route}/{groupId}/leave", null);
        var memberLeaves = await member.Client.PostAsync($"{Route}/{groupId}/leave", null);

        Assert.Equal(HttpStatusCode.Conflict, ownerLeaves.StatusCode);
        Assert.Equal(ErrorCodes.GroupOwnerCannotLeave, await ReasonOfAsync(ownerLeaves));
        Assert.Equal(HttpStatusCode.NoContent, memberLeaves.StatusCode);
        Assert.Empty((await member.Client.GetFromJsonAsync<JsonElement>(Route, Json)).GetProperty("groups").EnumerateArray());
        Assert.Equal(1, (await owner.Client.GetFromJsonAsync<JsonElement>($"{Route}/{groupId}", Json)).GetProperty("memberCount").GetInt32());
    }

    [Fact]
    public async Task RemovingAMember_DisablesTheLink_SoTheyCannotComeBackThroughIt()
    {
        var owner = await NewUserAsync("LéaRejoin");
        var member = await NewUserAsync("SamRejoin");
        var groupId = await CreateGroupAsync(owner, "Les cinéphiles");
        var token = await CreateLinkAsync(owner, groupId);
        Assert.Equal(HttpStatusCode.Created, (await member.Client.PostAsync($"{Route}/join/{token}", null)).StatusCode);

        var removed = await owner.Client.DeleteAsync($"{Route}/{groupId}/members/{member.Id}");
        var rejoin = await member.Client.PostAsync($"{Route}/join/{token}", null);
        var asOwner = await owner.Client.GetFromJsonAsync<JsonElement>($"{Route}/{groupId}/members", Json);

        Assert.Equal(HttpStatusCode.NoContent, removed.StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, rejoin.StatusCode);
        Assert.Equal(ErrorCodes.GroupInviteLinkInvalid, await ReasonOfAsync(rejoin));
        Assert.Equal(HttpStatusCode.NotFound, (await member.Client.GetAsync($"{Route}/{groupId}")).StatusCode);
        Assert.False(asOwner.GetProperty("inviteLink").GetProperty("active").GetBoolean());
        Assert.Equal([owner.Id], asOwner.GetProperty("members").EnumerateArray().Select(m => m.GetProperty("userId").GetString()));
    }

    [Fact]
    public async Task InviteLink_PreviewsWithoutLeaking_JoinsOnce_ThenStopsOnceDisabled()
    {
        var owner = await NewUserAsync("LéaLink");
        var joiner = await NewUserAsync("SamLink");
        var groupId = await CreateGroupAsync(owner, "Les cinéphiles");
        var token = await CreateLinkAsync(owner, groupId);

        var preview = await BodyOfAsync(await _factory.CreateClient().GetAsync($"{Route}/join/{token}"));
        var first = await joiner.Client.PostAsync($"{Route}/join/{token}", null);
        var again = await joiner.Client.PostAsync($"{Route}/join/{token}", null);
        var previewAsMember = await BodyOfAsync(await joiner.Client.GetAsync($"{Route}/join/{token}"));
        var disabled = await owner.Client.DeleteAsync($"{Route}/{groupId}/invite-link");
        var afterDisable = await _factory.CreateClient().GetAsync($"{Route}/join/{token}");
        var latecomer = await NewUserAsync("ZoéLink");
        var lateJoin = await latecomer.Client.PostAsync($"{Route}/join/{token}", null);

        Assert.Matches("^[A-Za-z0-9_-]{22,}$", token);
        Assert.Equal(["name", "ownerDisplayName", "memberCount", "memberPreview", "isFull", "role", "groupId"], FieldsOf(preview));
        Assert.Equal(("Les cinéphiles", "LéaLink", 1), (preview.GetProperty("name").GetString(), preview.GetProperty("ownerDisplayName").GetString(), preview.GetProperty("memberCount").GetInt32()));
        var shown = preview.GetProperty("memberPreview").EnumerateArray().Single();
        Assert.Equal(["displayName", "avatarId"], FieldsOf(shown));
        Assert.False(preview.GetProperty("isFull").GetBoolean());
        Assert.Equal(JsonValueKind.Null, preview.GetProperty("groupId").ValueKind);
        Assert.Equal(JsonValueKind.Null, preview.GetProperty("role").ValueKind);
        Assert.Equal(HttpStatusCode.Created, first.StatusCode);
        var joined = await BodyOfAsync(first);
        Assert.Equal(["group", "joined"], FieldsOf(joined));
        Assert.True(joined.GetProperty("joined").GetBoolean());
        Assert.Equal(SummaryFields, FieldsOf(joined.GetProperty("group")));
        Assert.Equal((groupId, "member"), (joined.GetProperty("group").GetProperty("id").GetString(), joined.GetProperty("group").GetProperty("role").GetString()));
        Assert.Equal(HttpStatusCode.OK, again.StatusCode);
        Assert.False((await BodyOfAsync(again)).GetProperty("joined").GetBoolean());
        Assert.Equal(groupId, previewAsMember.GetProperty("groupId").GetString());
        Assert.Equal("member", previewAsMember.GetProperty("role").GetString());
        Assert.Equal(HttpStatusCode.NoContent, disabled.StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, afterDisable.StatusCode);
        Assert.Equal(ErrorCodes.GroupInviteLinkInvalid, await ReasonOfAsync(afterDisable));
        Assert.Equal(HttpStatusCode.NotFound, lateJoin.StatusCode);
        Assert.Equal(ErrorCodes.GroupInviteLinkInvalid, await ReasonOfAsync(lateJoin));
    }

    [Fact]
    public async Task InviteLink_AnUnknownToken_IsNotFound()
    {
        var response = await _factory.CreateClient().GetAsync($"{Route}/join/not-a-real-token");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        Assert.Equal(ErrorCodes.GroupInviteLinkInvalid, await ReasonOfAsync(response));
    }

    [Fact]
    public async Task DeletingTheGroup_TakesItAwayFromTheMembers_AndWithdrawsItsInvitations()
    {
        var (owner, member, groupId) = await SharedGroupAsync("Delete");
        var invitee = await NewUserAsync("ZoéDelete");
        await FollowAsync(owner, invitee);
        await InviteAsync(owner, groupId, invitee);

        var deleted = await owner.Client.DeleteAsync($"{Route}/{groupId}");

        Assert.Equal(HttpStatusCode.NoContent, deleted.StatusCode);
        Assert.Empty((await member.Client.GetFromJsonAsync<JsonElement>(Route, Json)).GetProperty("groups").EnumerateArray());
        Assert.Empty((await invitee.Client.GetFromJsonAsync<JsonElement>(Route, Json)).GetProperty("invitations").EnumerateArray());
        var inbox = await invitee.Client.GetFromJsonAsync<NotificationInboxResponse>("/api/v1/notifications/inbox", Json);
        Assert.DoesNotContain(inbox!.Items, item => item.Type == "groupinvitation");
        Assert.Equal(HttpStatusCode.NotFound, (await owner.Client.GetAsync($"{Route}/{groupId}")).StatusCode);
    }

    [Fact]
    public async Task ADeletedMember_LeavesTheGroup()
    {
        var (owner, member, groupId) = await SharedGroupAsync("DeletedMember");

        var deletion = await DeleteAccountAsync(member);

        Assert.True(deletion.IsSuccessStatusCode, await deletion.Content.ReadAsStringAsync());
        var kept = await owner.Client.GetFromJsonAsync<JsonElement>($"{Route}/{groupId}", Json);
        Assert.Equal(1, kept.GetProperty("memberCount").GetInt32());
        Assert.Equal([owner.Id], kept.GetProperty("members").EnumerateArray().Select(m => m.GetProperty("userId").GetString()));
    }

    [Fact]
    public async Task DeletingTheOwnersAccount_DeletesTheirGroups_AndWithdrawsTheInvitationsTheyHadSent()
    {
        var (owner, member, groupId) = await SharedGroupAsync("OwnerGone");
        var invitee = await NewUserAsync("ZoéGone");
        await FollowAsync(owner, invitee);
        Assert.Equal(HttpStatusCode.Created, (await InviteAsync(owner, groupId, invitee)).StatusCode);

        var deletion = await DeleteAccountAsync(owner);
        var inbox = await invitee.Client.GetFromJsonAsync<NotificationInboxResponse>("/api/v1/notifications/inbox", Json);

        Assert.True(deletion.IsSuccessStatusCode, await deletion.Content.ReadAsStringAsync());
        Assert.DoesNotContain(inbox!.Items, item => item.Type == "groupinvitation");
        Assert.Empty((await member.Client.GetFromJsonAsync<JsonElement>(Route, Json)).GetProperty("groups").EnumerateArray());
        Assert.Equal(HttpStatusCode.NotFound, (await member.Client.GetAsync($"{Route}/{groupId}")).StatusCode);
    }

    [Fact]
    public async Task PersonalDataExport_HoldsTheGroupsOwnedJoinedAndPending()
    {
        var (owner, member, groupId) = await SharedGroupAsync("Export");
        var pendingGroupId = await CreateGroupAsync(owner, "Le club du dimanche");
        await InviteAsync(owner, pendingGroupId, member);
        await CreateGroupAsync(member, "Les miens");

        var export = JsonElement.Parse(await member.Client.GetStringAsync("/api/v1/auth/me/export"));

        Assert.Equal("Les miens", export.GetProperty("friendGroups").EnumerateArray().Single().GetProperty("name").GetString());
        var joined = export.GetProperty("joinedFriendGroups").EnumerateArray().Single();
        Assert.Equal((groupId, "Les cinéphiles", "LéaExport"), (joined.GetProperty("groupId").GetString(), joined.GetProperty("name").GetString(), joined.GetProperty("ownerDisplayName").GetString()));
        var pending = export.GetProperty("pendingFriendGroupInvitations").EnumerateArray().Single();
        Assert.Equal((pendingGroupId, "Le club du dimanche"), (pending.GetProperty("groupId").GetString(), pending.GetProperty("name").GetString()));
        Assert.Contains(
            "Le club du dimanche",
            export.GetProperty("notifications").EnumerateArray()
                .Where(n => n.GetProperty("type").GetString() == "GroupInvitation")
                .Select(n => n.GetProperty("groupName").GetString()));
    }

    [Fact]
    public async Task NotificationPreferences_OfferTheGroupInvitationType()
    {
        var account = await NewUserAsync("PrefsGroup");

        var preferences = await account.Client.GetFromJsonAsync<NotificationPreferencesResponse>("/api/v1/notifications/preferences", Json);

        Assert.Contains(preferences!.Preferences, preference => preference is { Type: "groupinvitation", Enabled: true });
    }

    [Fact]
    public async Task AMemberNightForTheGroup_ReachesTheOtherMember_WithoutAnyLink()
    {
        var (owner, member, groupId) = await SharedGroupAsync("Nuit");

        var created = await member.Client.PostAsJsonAsync(
            "/api/v1/events",
            new { title = "Jeudi ciné", date = TestDates.Upcoming, time = "21:00", groupId });
        Assert.Equal(HttpStatusCode.Created, created.StatusCode);
        var slug = (await BodyOfAsync(created)).GetProperty("slug").GetString();

        var mine = await owner.Client.GetFromJsonAsync<JsonElement>("/api/v1/events/mine?scope=active", Json);
        var listed = mine.GetProperty("events").EnumerateArray().Single(night => night.GetProperty("slug").GetString() == slug);
        Assert.False(listed.GetProperty("isParticipant").GetBoolean());
        Assert.Equal("Les cinéphiles", listed.GetProperty("groupName").GetString());

        var page = await owner.Client.GetFromJsonAsync<JsonElement>($"{Route}/{groupId}", Json);
        Assert.Equal(slug, page.GetProperty("upcomingNights")[0].GetProperty("slug").GetString());
        Assert.Equal([member.Id], page.GetProperty("nextNightParticipantIds").EnumerateArray().Select(id => id.GetString()));

        var groups = await owner.Client.GetFromJsonAsync<JsonElement>(Route, Json);
        Assert.Equal(slug, groups.GetProperty("nextNights")[0].GetProperty("slug").GetString());

        var inbox = await owner.Client.GetFromJsonAsync<JsonElement>("/api/v1/notifications/inbox", Json);
        var notice = inbox.GetProperty("items").EnumerateArray().Single(item => item.GetProperty("type").GetString() == "groupnight");
        Assert.Equal(slug, notice.GetProperty("eventSlug").GetString());
        Assert.Equal("Les cinéphiles", notice.GetProperty("groupName").GetString());
    }

    [Fact]
    public async Task ANightForAGroupTheHostIsNotIn_IsRefusedAsAnUnknownGroup()
    {
        var (_, _, groupId) = await SharedGroupAsync("Intrus");
        var stranger = await NewUserAsync("IntrusNuit");

        var refused = await stranger.Client.PostAsJsonAsync(
            "/api/v1/events",
            new { title = "Pas chez moi", date = TestDates.Upcoming, time = "21:00", groupId });

        Assert.Equal(HttpStatusCode.NotFound, refused.StatusCode);
        Assert.Equal(ErrorCodes.GroupNotFound, await ReasonOfAsync(refused));
    }
}
