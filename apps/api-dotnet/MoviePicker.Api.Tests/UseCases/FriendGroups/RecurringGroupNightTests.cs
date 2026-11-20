using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using MoviePicker.Api.Application.UseCases.RecurringEvents;
using MoviePicker.Api.Application.UseCases.Shared;
using MoviePicker.Api.Domain;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Infrastructure.Persistence.InMemory;
using Xunit;

namespace MoviePicker.Api.Tests.UseCases.FriendGroups;

public sealed class RecurringGroupNightTests : FriendGroupTestBase
{
    private readonly InMemoryEventRepository _events = new();
    private readonly InMemoryParticipantRepository _participants = new();
    private readonly Mock<IGroupNightAnnouncer> _announcer = new();

    private RecurringEventPass Pass() => new(
        _events,
        _participants,
        Kit.Users,
        Kit.Groups,
        _announcer.Object,
        new InMemoryUnitOfWork(),
        Kit.Clock,
        NullLogger<RecurringEventPass>.Instance);

    private Task<Event> ClosedWeeklyNightAsync(string hostId, string groupId) =>
        _events.AddAsync(new Event
        {
            Title = "Jeudi ciné",
            Date = "2026-11-12",
            Time = "21:00",
            Slug = "jeudi-cine-12",
            HostToken = "host-token",
            CreatorUserId = hostId,
            GroupId = groupId,
            Recurrence = RecurrenceFrequency.Weekly,
            ClosedAt = FriendGroupTestKit.Start.AddHours(-1),
            CreatedAt = FriendGroupTestKit.Start.AddDays(-7),
            UpdatedAt = FriendGroupTestKit.Start.AddDays(-7)
        });

    private async Task<Event> NextOccurrenceOfAsync(Event parent)
    {
        var reloaded = await _events.GetByIdOrSlugAsync(parent.Slug);
        return Assert.Single(await _events.ListByIdsAsync([reloaded!.NextOccurrenceEventId!]));
    }

    [Fact]
    public async Task TheNextOccurrence_StaysInTheGroup_AndIsAnnouncedToIt()
    {
        var group = await SharedGroupAsync(FriendGroupTestKit.Member);
        var parent = await ClosedWeeklyNightAsync(FriendGroupTestKit.Member, group.Id);

        var result = await Pass().RunAsync();

        Assert.Equal(1, result.Created);
        var next = await NextOccurrenceOfAsync(parent);
        Assert.Equal("2026-11-19", next.Date);
        Assert.Equal(group.Id, next.GroupId);
        _announcer.Verify(
            a => a.AnnounceAsync(
                It.Is<Event>(e => e.Id == next.Id),
                It.Is<FriendGroup>(g => g.Id == group.Id),
                FriendGroupTestKit.Member,
                It.IsAny<CancellationToken>()),
            Times.Once);
    }

    [Fact]
    public async Task TheNextOccurrence_LeavesTheGroup_WhenItsHostIsNoLongerInIt()
    {
        var group = await SharedGroupAsync(FriendGroupTestKit.Member);
        var parent = await ClosedWeeklyNightAsync(FriendGroupTestKit.Member, group.Id);
        await Kit.LeaveHandler().HandleAsync(FriendGroupTestKit.Member, group.Id);

        await Pass().RunAsync();

        Assert.Null((await NextOccurrenceOfAsync(parent)).GroupId);
        _announcer.VerifyNoOtherCalls();
    }
}
