using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Domain.Entities;

namespace MoviePicker.Api.Application.UseCases.FriendGroups;

public sealed class FriendGroupPeople
{
    private readonly Dictionary<string, DisplayedPerson> _people;

    private FriendGroupPeople(Dictionary<string, DisplayedPerson> people)
    {
        _people = people;
    }

    public static async Task<FriendGroupPeople> LoadAsync(
        IUserRepository users,
        IEnumerable<string> userIds,
        CancellationToken ct)
    {
        var wanted = userIds.Where(id => !string.IsNullOrEmpty(id)).Distinct(StringComparer.Ordinal).ToList();
        var known = wanted.Count == 0 ? [] : await users.ListCardsByIdsAsync(wanted, ct);
        var people = known
            .DistinctBy(card => card.Id, StringComparer.Ordinal)
            .ToDictionary(card => card.Id, card => DisplayedPerson.From(card), StringComparer.Ordinal);
        return new FriendGroupPeople(people);
    }

    public static Task<FriendGroupPeople> LoadPreviewsAsync(
        IUserRepository users,
        IEnumerable<FriendGroup> groups,
        CancellationToken ct) =>
        LoadAsync(users, groups.SelectMany(group => group.PreviewMemberIds()), ct);

    public static async Task<FriendGroupSummaryResponse> DescribeAsync(
        IUserRepository users,
        FriendGroup group,
        string viewerId,
        CancellationToken ct) =>
        (await LoadPreviewsAsync(users, [group], ct)).SummaryOf(viewerId, group);

    public DisplayedPerson PersonOf(string userId) => _people.GetValueOrDefault(userId) ?? DisplayedPerson.Unknown(userId);

    public IEnumerable<DisplayedPerson> PreviewOf(FriendGroup group) =>
        group.PreviewMemberIds()
            .Where(id => id == group.OwnerId || _people.ContainsKey(id))
            .Select(PersonOf);

    public FriendGroupAudience AudienceOf(string viewerId, FriendGroup group) =>
        new(
            viewerId == group.OwnerId ? FriendGroupRole.Owner : FriendGroupRole.Member,
            PersonOf(group.OwnerId).DisplayName,
            [.. PreviewOf(group).Select(FriendGroupPersonResponse.From)]);

    public FriendGroupSummaryResponse SummaryOf(string viewerId, FriendGroup group) =>
        FriendGroupSummaryResponse.From(group, AudienceOf(viewerId, group));

    public IReadOnlyList<FriendGroupMemberResponse> MembersOf(FriendGroup group) =>
    [
        FriendGroupMemberResponse.From(PersonOf(group.OwnerId), FriendGroupRole.Owner, group.CreatedAt),
        .. group.Members.Select(member => FriendGroupMemberResponse.From(PersonOf(member.UserId), FriendGroupRole.Member, member.JoinedAt))
    ];

    public FriendGroupInvitationResponse InvitationOf(FriendGroup group, FriendGroupInvitation invitation) => new()
    {
        GroupId = group.Id,
        Name = group.Name,
        InvitedByDisplayName = PersonOf(group.OwnerId).DisplayName,
        MemberCount = group.MemberCount,
        MemberPreview = [.. PreviewOf(group).Select(FriendGroupPersonResponse.From)],
        InvitedAt = invitation.InvitedAt
    };
}
