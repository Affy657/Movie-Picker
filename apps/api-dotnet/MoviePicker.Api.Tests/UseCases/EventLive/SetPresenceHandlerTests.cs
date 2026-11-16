using Microsoft.Extensions.Options;
using Moq;
using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.EventLive;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Domain.Exceptions;
using MoviePicker.Api.Tests.Builders;
using Xunit;

namespace MoviePicker.Api.Tests.UseCases.EventLive;

public sealed class SetPresenceHandlerTests
{
    private static readonly DateTimeOffset Now = new(2026, 11, 16, 20, 0, 0, TimeSpan.Zero);

    private readonly Mock<IEventRepository> _events = new();
    private readonly Mock<IParticipantRepository> _participants = new();
    private readonly Mock<IEventPresenceRepository> _presence = new();
    private readonly Mock<ICurrentUserAccessor> _currentUser = new();
    private readonly Mock<TimeProvider> _clock = new();
    private readonly SetPresenceHandler _sut;

    public SetPresenceHandlerTests()
    {
        _clock.Setup(c => c.GetUtcNow()).Returns(Now);
        _events
            .Setup(r => r.GetByIdOrSlugAsync("soiree", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new EventEntityBuilder().WithId("evt-1").WithSlug("soiree").Build());
        _currentUser.Setup(u => u.GetUserId()).Returns("user-1");
        _participants
            .Setup(r => r.FindByEventAndUserIdAsync("evt-1", "user-1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new Participant { Id = "p-1", EventId = "evt-1", Pseudo = "Alice", UserId = "user-1" });
        _sut = new SetPresenceHandler(
            _events.Object,
            _participants.Object,
            _presence.Object,
            _currentUser.Object,
            _clock.Object,
            Options.Create(new EventLiveOptions { PresenceTtl = TimeSpan.FromSeconds(30) }));
    }

    [Fact]
    public async Task HandleAsync_UnknownEvent_ThrowsEventNotFound()
    {
        var ex = await Assert.ThrowsAsync<NotFoundException>(
            () => _sut.HandleAsync("nope", new PresenceRequest { Proposing = true }));

        Assert.Equal(ErrorCodes.EventNotFound, ex.Reason);
    }

    [Fact]
    public async Task HandleAsync_UserWhoHasNotJoined_ThrowsParticipantNotFound()
    {
        _currentUser.Setup(u => u.GetUserId()).Returns("user-2");

        var ex = await Assert.ThrowsAsync<NotFoundException>(
            () => _sut.HandleAsync("soiree", new PresenceRequest { Proposing = true }));

        Assert.Equal(ErrorCodes.ParticipantNotFound, ex.Reason);
        _presence.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task HandleAsync_Proposing_KeepsTheParticipantPresentAndProposingForOneTtl()
    {
        await _sut.HandleAsync("soiree", new PresenceRequest { Proposing = true });

        _presence.Verify(r => r.SetProposingAsync(
            "evt-1",
            "p-1",
            Now.AddSeconds(30),
            Now.AddSeconds(30),
            It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task HandleAsync_NotProposingAnymore_ClearsTheSignalButKeepsThePresence()
    {
        await _sut.HandleAsync("soiree", new PresenceRequest { Proposing = false });

        _presence.Verify(r => r.SetProposingAsync(
            "evt-1",
            "p-1",
            Now.AddSeconds(30),
            null,
            It.IsAny<CancellationToken>()), Times.Once);
    }
}
