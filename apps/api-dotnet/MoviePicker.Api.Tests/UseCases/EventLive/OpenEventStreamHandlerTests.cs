using Moq;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.EventLive;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Domain.Exceptions;
using MoviePicker.Api.Tests.Builders;
using Xunit;

namespace MoviePicker.Api.Tests.UseCases.EventLive;

public sealed class OpenEventStreamHandlerTests
{
    private readonly Mock<IEventRepository> _events = new();
    private readonly Mock<IParticipantRepository> _participants = new();
    private readonly Mock<ICurrentUserAccessor> _currentUser = new();
    private readonly OpenEventStreamHandler _sut;
    private readonly Event _event = new EventEntityBuilder().WithId("evt-1").WithSlug("soiree").Build();

    public OpenEventStreamHandlerTests()
    {
        _events.Setup(r => r.GetByIdOrSlugAsync("soiree", It.IsAny<CancellationToken>())).ReturnsAsync(_event);
        _sut = new OpenEventStreamHandler(_events.Object, _participants.Object, _currentUser.Object);
    }

    [Fact]
    public async Task HandleAsync_UnknownEvent_ThrowsEventNotFound()
    {
        var ex = await Assert.ThrowsAsync<NotFoundException>(() => _sut.HandleAsync("nope"));

        Assert.Equal(ErrorCodes.EventNotFound, ex.Reason);
    }

    [Fact]
    public async Task HandleAsync_AnonymousViewer_OpensWithoutParticipant()
    {
        var access = await _sut.HandleAsync("soiree");

        Assert.Equal(new EventStreamAccess("evt-1", "soiree", null), access);
    }

    [Fact]
    public async Task HandleAsync_SignedInParticipant_OpensAsThatParticipant()
    {
        _currentUser.Setup(u => u.GetUserId()).Returns("user-1");
        _participants
            .Setup(r => r.FindByEventAndUserIdAsync("evt-1", "user-1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new Participant { Id = "p-1", EventId = "evt-1", Pseudo = "Alice", UserId = "user-1" });

        var access = await _sut.HandleAsync("soiree");

        Assert.Equal(new EventStreamAccess("evt-1", "soiree", "p-1"), access);
    }

    [Fact]
    public async Task HandleAsync_SignedInVisitorWhoHasNotJoined_OpensWithoutParticipant()
    {
        _currentUser.Setup(u => u.GetUserId()).Returns("user-2");

        var access = await _sut.HandleAsync("soiree");

        Assert.Null(access.ParticipantId);
        Assert.Equal("evt-1", access.EventId);
    }
}
