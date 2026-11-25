using Moq;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.MovieRatings;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Domain.Exceptions;
using MoviePicker.Api.Tests.Builders;
using Xunit;

namespace MoviePicker.Api.Tests.UseCases.MovieRatings;

public sealed class MarkRatingPromptedHandlerTests
{
    private const string UserId = "user-1";
    private static readonly DateTimeOffset Now = new(2026, 11, 25, 21, 0, 0, TimeSpan.Zero);

    private readonly Mock<IEventRepository> _events = new();
    private readonly Mock<IParticipantRepository> _participants = new();
    private readonly MarkRatingPromptedHandler _sut;
    private readonly Event _night = new EventEntityBuilder().WithId("evt1").WithSlug("soiree").Closed().Build();

    private sealed class FixedClock(DateTimeOffset now) : TimeProvider
    {
        public override DateTimeOffset GetUtcNow() => now;
    }

    public MarkRatingPromptedHandlerTests()
    {
        _events.Setup(r => r.GetByIdOrSlugAsync("soiree", It.IsAny<CancellationToken>())).ReturnsAsync(_night);
        _participants.Setup(r => r.MarkRatingPromptedAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<DateTimeOffset>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);
        _sut = new MarkRatingPromptedHandler(_events.Object, _participants.Object, new FixedClock(Now));
    }

    [Fact]
    public async Task HandleAsync_Participant_RemembersTheProposalOnTheParticipationAndMovesTheNightView()
    {
        _participants.Setup(r => r.FindByEventAndUserIdAsync("evt1", UserId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new Participant { Id = "p1", EventId = "evt1", Pseudo = "Léa", UserId = UserId });

        await _sut.HandleAsync(UserId, "soiree");

        _participants.Verify(r => r.MarkRatingPromptedAsync("p1", "evt1", Now, It.IsAny<CancellationToken>()), Times.Once);
        _events.Verify(r => r.MarkChangedAsync("evt1", It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task HandleAsync_NotAParticipant_ThrowsParticipantNotFound()
    {
        var ex = await Assert.ThrowsAsync<NotFoundException>(() => _sut.HandleAsync(UserId, "soiree"));

        Assert.Equal(ErrorCodes.ParticipantNotFound, ex.Reason);
        _participants.Verify(r => r.MarkRatingPromptedAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<DateTimeOffset>(), It.IsAny<CancellationToken>()), Times.Never);
        _events.Verify(r => r.MarkChangedAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task HandleAsync_UnknownNight_ThrowsEventNotFound()
    {
        var ex = await Assert.ThrowsAsync<NotFoundException>(() => _sut.HandleAsync(UserId, "nope"));

        Assert.Equal(ErrorCodes.EventNotFound, ex.Reason);
    }
}
