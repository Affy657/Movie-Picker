using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.Shared;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Infrastructure.Persistence.InMemory;
using MoviePicker.Api.Tests.Builders;
using Xunit;

namespace MoviePicker.Api.Tests.UseCases.FriendGroups;

public sealed class GroupNightAnnouncerTests : FriendGroupTestBase
{
    private readonly RecordingSharedQuota _quota = new();

    private GroupNightAnnouncer Announcer(IUserRepository? users = null) => new(
        new EventAudienceNotifier(
            new InMemoryParticipantRepository(),
            Kit.Users,
            Kit.PushSubscriptions,
            Kit.Push.Object,
            Kit.Notifications,
            NullLogger<EventAudienceNotifier>.Instance,
            Kit.Clock),
        users ?? Kit.Users,
        Kit.Notifications,
        _quota,
        NullLogger<GroupNightAnnouncer>.Instance);

    private async Task<FriendGroup> GroupOfThreeAsync()
    {
        var summary = await SharedGroupAsync(FriendGroupTestKit.Member, FriendGroupTestKit.Invitee);
        return (await Kit.Groups.FindAsync(summary.Id))!;
    }

    private static Event Night(string groupId) => new()
    {
        Id = "night-1",
        Slug = "jeudi-cine",
        Title = "Jeudi ciné",
        GroupId = groupId
    };

    [Fact]
    public async Task ANightOfTheGroup_ReachesEveryOtherMemberInbox_ButNotItsHost()
    {
        var summary = await SharedGroupAsync(FriendGroupTestKit.Member, FriendGroupTestKit.Invitee);
        var group = (await Kit.Groups.FindAsync(summary.Id))!;

        await Announcer().AnnounceAsync(Night(group.Id), group, FriendGroupTestKit.Member);

        foreach (var recipient in new[] { FriendGroupTestKit.Owner, FriendGroupTestKit.Invitee })
        {
            var notice = Assert.Single(await Kit.Notifications.ListByUserIdAsync(recipient));
            Assert.Equal(UserNotificationType.GroupNight, notice.Type);
            Assert.Equal("jeudi-cine", notice.EventSlug);
            Assert.Equal(group.Name, notice.GroupName);
            Assert.Equal("Sam", notice.ActorDisplayName);
        }

        Assert.Empty(await Kit.Notifications.ListByUserIdAsync(FriendGroupTestKit.Member));
        Assert.Empty(await Kit.Notifications.ListByUserIdAsync(FriendGroupTestKit.Stranger));
    }

    [Fact]
    public async Task ANightAnnouncedTwice_ReachesEachMemberOnce()
    {
        var group = await GroupOfThreeAsync();

        await Announcer().AnnounceAsync(Night(group.Id), group, FriendGroupTestKit.Member);
        await Announcer().AnnounceAsync(Night(group.Id), group, FriendGroupTestKit.Member);

        Assert.Single(await Kit.Notifications.ListByUserIdAsync(FriendGroupTestKit.Owner));
        Assert.Single(await Kit.Notifications.ListByUserIdAsync(FriendGroupTestKit.Invitee));
        Assert.Single(_quota.Calls);
    }

    [Fact]
    public async Task AHostPastTheDailyAnnouncementsOfTheGroup_TellsNobody()
    {
        var group = await GroupOfThreeAsync();
        _quota.Allows = false;

        await Announcer().AnnounceAsync(Night(group.Id), group, FriendGroupTestKit.Member);

        Assert.Empty(await Kit.Notifications.ListByUserIdAsync(FriendGroupTestKit.Owner));
        var call = Assert.Single(_quota.Calls);
        Assert.Equal(GroupNightAnnouncer.HostQuotaScope, call.Scope);
        Assert.Equal($"{FriendGroupTestKit.Member}|{group.Id}", call.Subject);
        Assert.Equal(GroupNightAnnouncer.MaxAnnouncementsPerHostPerGroupPerDay, call.Limit);
    }

    [Fact]
    public async Task AFailingAnnouncement_NeverFailsTheNight()
    {
        var group = await GroupOfThreeAsync();
        var users = new Mock<IUserRepository>();
        users.Setup(u => u.GetByIdAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new InvalidOperationException("mongo down"));

        await Announcer(users.Object).AnnounceAsync(Night(group.Id), group, FriendGroupTestKit.Member);

        Assert.Empty(await Kit.Notifications.ListByUserIdAsync(FriendGroupTestKit.Owner));
    }

    [Fact]
    public void Recipients_AreTheOwnerAndTheMembers_WithoutTheHost()
    {
        var group = new FriendGroup
        {
            Id = "g1",
            OwnerId = "owner",
            Name = "Les jeudis ciné",
            Members = [new FriendGroupMember("sam", DateTimeOffset.UnixEpoch), new FriendGroupMember("ines", DateTimeOffset.UnixEpoch)]
        };

        Assert.Equal(["owner", "ines"], GroupNightAnnouncer.Recipients(group, "sam"));
        Assert.Equal(["sam", "ines"], GroupNightAnnouncer.Recipients(group, "owner"));
    }
}
