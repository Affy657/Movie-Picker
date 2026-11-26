using Moq;
using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.EventConfiguration;
using MoviePicker.Api.Application.UseCases.Shared;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Domain.Exceptions;
using MoviePicker.Api.Infrastructure.Persistence.InMemory;
using MoviePicker.Api.Tests.Builders;
using Xunit;

namespace MoviePicker.Api.Tests.UseCases.FriendGroups;

public sealed class GroupNightSettingsTests : FriendGroupTestBase
{
    private readonly InMemoryEventRepository _events = new();
    private readonly InMemoryParticipantRepository _participants = new();
    private readonly Mock<IGroupNightAnnouncer> _announcer = new();
    private readonly Mock<ICurrentUserAccessor> _currentUser = new();

    private PatchEventConfigHandler Handler(string? userId)
    {
        _currentUser.Setup(u => u.GetUserId()).Returns(userId);
        return new PatchEventConfigHandler(
            _events,
            _participants,
            Mock.Of<IMovieRepository>(),
            _currentUser.Object,
            TestAudienceNotifier.Over(_participants, Kit.Users, Kit.PushSubscriptions, Kit.Push.Object, Kit.Notifications),
            Kit.Groups,
            _announcer.Object,
            new InMemoryUnitOfWork(),
            Kit.Clock);
    }

    private Task<Event> NightAsync(string hostId, string? groupId = null, string date = "2026-11-26") =>
        _events.AddAsync(new Event
        {
            Title = "Jeudi ciné",
            Date = date,
            Time = "21:00",
            Slug = "jeudi-cine",
            CreatorUserId = hostId,
            GroupId = groupId,
            CreatedAt = FriendGroupTestKit.Start,
            UpdatedAt = FriendGroupTestKit.Start
        });

    [Fact]
    public async Task TheHostAttachesTheNightToTheirGroup_AndTheGroupHearsOfIt()
    {
        var group = await SharedGroupAsync(FriendGroupTestKit.Member);
        var night = await NightAsync(FriendGroupTestKit.Member);

        var config = await Handler(FriendGroupTestKit.Member)
            .HandleAsync(night.Slug, new PatchEventConfigRequest { GroupId = group.Id });

        Assert.Equal(group.Id, config.GroupId);
        Assert.Equal(group.Id, (await _events.GetByIdOrSlugAsync(night.Slug))!.GroupId);
        _announcer.Verify(
            a => a.AnnounceAsync(
                It.Is<Event>(e => e.Id == night.Id),
                It.Is<FriendGroup>(g => g.Id == group.Id),
                FriendGroupTestKit.Member,
                It.IsAny<CancellationToken>()),
            Times.Once);
    }

    [Fact]
    public async Task TheHostCannotAttachTheNightToAGroupTheyAreNotIn()
    {
        var group = await SharedGroupAsync(FriendGroupTestKit.Member);
        var night = await NightAsync(FriendGroupTestKit.Stranger);

        var ex = await Assert.ThrowsAsync<NotFoundException>(() => Handler(FriendGroupTestKit.Stranger)
            .HandleAsync(night.Slug, new PatchEventConfigRequest { GroupId = group.Id }));

        Assert.Equal(ErrorCodes.GroupNotFound, ex.Reason);
        Assert.Null((await _events.GetByIdOrSlugAsync(night.Slug))!.GroupId);
    }

    [Fact]
    public async Task ACoHost_CannotMoveTheNightIntoTheirGroup()
    {
        var group = await SharedGroupAsync(FriendGroupTestKit.Member);
        var night = await NightAsync(FriendGroupTestKit.Stranger);
        await _events.UpdateAsync((await _events.GetByIdOrSlugAsync(night.Slug))! with { CoHostUserIds = [FriendGroupTestKit.Member] });
        var handler = Handler(FriendGroupTestKit.Member);

        var ex = await Assert.ThrowsAsync<ForbiddenException>(() =>
            handler.HandleAsync(night.Slug, new PatchEventConfigRequest { GroupId = group.Id }));

        Assert.Equal(ErrorCodes.CreatorOnlyNightGroup, ex.Reason);
        Assert.Null((await _events.GetByIdOrSlugAsync(night.Slug))!.GroupId);
    }

    [Fact]
    public async Task TheHostTakesTheNightOutOfItsGroup_WithoutAnnouncingAnything()
    {
        var group = await SharedGroupAsync(FriendGroupTestKit.Member);
        var night = await NightAsync(FriendGroupTestKit.Owner, group.Id);

        var config = await Handler(FriendGroupTestKit.Owner)
            .HandleAsync(night.Slug, new PatchEventConfigRequest { ClearGroup = true });

        Assert.Null(config.GroupId);
        Assert.Null((await _events.GetByIdOrSlugAsync(night.Slug))!.GroupId);
        _announcer.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task ChoosingTheGroupTheNightAlreadyBelongsTo_AnnouncesNothingAgain()
    {
        var group = await SharedGroupAsync(FriendGroupTestKit.Member);
        var night = await NightAsync(FriendGroupTestKit.Owner, group.Id);

        await Handler(FriendGroupTestKit.Owner).HandleAsync(night.Slug, new PatchEventConfigRequest { GroupId = group.Id });

        _announcer.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task AFinishedNight_KeepsItsGroup()
    {
        var group = await SharedGroupAsync(FriendGroupTestKit.Member);
        var night = await NightAsync(FriendGroupTestKit.Owner, date: "2026-10-01");

        var ex = await Assert.ThrowsAsync<ConflictException>(() => Handler(FriendGroupTestKit.Owner)
            .HandleAsync(night.Slug, new PatchEventConfigRequest { GroupId = group.Id }));

        Assert.Equal(ErrorCodes.EventConfigLockedFinished, ex.Reason);
        Assert.Null((await _events.GetByIdOrSlugAsync(night.Slug))!.GroupId);
    }
}
