using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.CreateEvent;
using MoviePicker.Api.Application.UseCases.Shared;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Domain.Exceptions;
using MoviePicker.Api.Infrastructure.Persistence.InMemory;
using Xunit;

namespace MoviePicker.Api.Tests.UseCases.FriendGroups;

public sealed class GroupNightCreationTests : FriendGroupTestBase
{
    private readonly InMemoryEventRepository _events = new();
    private readonly InMemoryParticipantRepository _participants = new();
    private readonly Mock<IGroupNightAnnouncer> _announcer = new();

    private CreateEventHandler Handler() => new(
        _events,
        Kit.Users,
        _participants,
        Kit.Groups,
        _announcer.Object,
        new InMemoryUnitOfWork(),
        NullLogger<CreateEventHandler>.Instance,
        Kit.Clock);

    private static CreateEventRequest Night(string? groupId) => new()
    {
        Title = "Jeudi ciné",
        Date = "2026-11-26",
        Time = "21:00",
        GroupId = groupId
    };

    [Fact]
    public async Task AMemberCreatingANightForTheGroup_AttachesItAndAnnouncesItToTheGroup()
    {
        var group = await SharedGroupAsync(FriendGroupTestKit.Member);

        var created = await Handler().HandleAsync(Night(group.Id), FriendGroupTestKit.Member);

        var stored = await _events.GetBySlugAsync(created.Slug);
        Assert.Equal(group.Id, stored!.GroupId);
        _announcer.Verify(
            a => a.AnnounceAsync(
                It.Is<Event>(e => e.Id == stored.Id),
                It.Is<FriendGroup>(g => g.Id == group.Id),
                FriendGroupTestKit.Member,
                It.IsAny<CancellationToken>()),
            Times.Once);
    }

    [Fact]
    public async Task ANightForAGroupTheCreatorIsNotIn_IsRefusedAsAnUnknownGroup_AndNothingIsCreated()
    {
        var group = await SharedGroupAsync(FriendGroupTestKit.Member);

        var ex = await Assert.ThrowsAsync<NotFoundException>(
            () => Handler().HandleAsync(Night(group.Id), FriendGroupTestKit.Stranger));

        Assert.Equal(ErrorCodes.GroupNotFound, ex.Reason);
        Assert.Empty(await _events.ListAllByCreatorUserIdAsync(FriendGroupTestKit.Stranger));
        _announcer.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task ANightWithoutGroup_StaysOutOfEveryGroup_AndIsAnnouncedToNobody()
    {
        await SharedGroupAsync(FriendGroupTestKit.Member);

        var created = await Handler().HandleAsync(Night(null), FriendGroupTestKit.Owner);

        Assert.Null((await _events.GetBySlugAsync(created.Slug))!.GroupId);
        _announcer.VerifyNoOtherCalls();
    }
}
