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

namespace MoviePicker.Api.Tests.UseCases.EventConfiguration;

public sealed class PatchEventConfigHandlerScheduleTests
{
    private static readonly DateTimeOffset Now = new(2026, 11, 23, 12, 0, 0, TimeSpan.Zero);

    private readonly Mock<IEventRepository> _events = new();
    private readonly Mock<IParticipantRepository> _participants = new();
    private readonly Mock<IHostTokenAccessor> _hostToken = new();
    private readonly Mock<IUserNotificationRepository> _notifications = new();
    private readonly PatchEventConfigHandler _sut;

    public PatchEventConfigHandlerScheduleTests()
    {
        _hostToken.Setup(h => h.GetHostToken()).Returns("ht");
        _events.Setup(r => r.UpdateAsync(It.IsAny<Event>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((Event e, CancellationToken _) => e);
        _participants.Setup(r => r.ListByEventIdAsync("evt", It.IsAny<CancellationToken>()))
            .ReturnsAsync([new Participant { Id = "p2", EventId = "evt", Pseudo = "Invité", UserId = "guest" }]);
        _sut = new PatchEventConfigHandler(
            _events.Object,
            _participants.Object,
            _hostToken.Object,
            Mock.Of<ICurrentUserAccessor>(),
            TestAudienceNotifier.Over(
                _participants.Object,
                Mock.Of<IUserRepository>(),
                Mock.Of<IPushSubscriptionRepository>(),
                Mock.Of<IPushNotificationSender>(),
                _notifications.Object),
            new InMemoryFriendGroupRepository(),
            Mock.Of<IGroupNightAnnouncer>(),
            new RecordingUnitOfWork(),
            new FixedClock(Now));
    }

    private void Night(string date, string time) =>
        _events.Setup(r => r.GetByIdOrSlugAsync("s", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new Event
            {
                Id = "evt",
                Title = "Soirée",
                Date = date,
                Time = time,
                Slug = "s",
                HostToken = "ht",
                CreatorUserId = "host"
            });

    [Theory]
    [InlineData("2025-12-04", "20:00")]
    [InlineData("2026-11-16", "10:00")]
    public async Task HandleAsync_NewDateThatWouldEndAnUpcomingNight_IsRefusedWithoutSavingOrNotifying(string date, string time)
    {
        Night("2026-12-04", "20:00");

        var ex = await Assert.ThrowsAsync<BadRequestException>(() => _sut.HandleAsync(
            "s",
            new PatchEventConfigRequest { Date = date, Time = time, NotifyParticipantsOfDateChange = true }));

        Assert.Equal(ErrorCodes.EventDateTooEarly, ex.Reason);
        _events.Verify(r => r.UpdateAsync(It.IsAny<Event>(), It.IsAny<CancellationToken>()), Times.Never);
        _participants.Verify(r => r.ListByEventIdAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task HandleAsync_NewTimeThatWouldEndAPendingNight_IsRefused()
    {
        Night("2026-11-17", "20:00");

        var ex = await Assert.ThrowsAsync<BadRequestException>(() =>
            _sut.HandleAsync("s", new PatchEventConfigRequest { Date = "2026-11-16", Time = "09:00" }));

        Assert.Equal(ErrorCodes.EventDateTooEarly, ex.Reason);
    }

    [Theory]
    [InlineData("2026-11-17", "20:00")]
    [InlineData("2026-11-23", "11:00")]
    [InlineData("2028-11-23", "21:00")]
    public async Task HandleAsync_NewDateThatKeepsTheNightOpen_IsSaved(string date, string time)
    {
        Night("2026-12-04", "20:00");

        await _sut.HandleAsync("s", new PatchEventConfigRequest { Date = date, Time = time });

        _events.Verify(
            r => r.UpdateAsync(It.Is<Event>(e => e.Date == date && e.Time == time), It.IsAny<CancellationToken>()),
            Times.Once);
    }

    [Fact]
    public async Task HandleAsync_NewDateMoreThanTwoYearsAhead_IsRefused()
    {
        Night("2026-12-04", "20:00");

        var ex = await Assert.ThrowsAsync<BadRequestException>(() =>
            _sut.HandleAsync("s", new PatchEventConfigRequest { Date = "2028-11-24" }));

        Assert.Equal(ErrorCodes.EventDateTooFar, ex.Reason);
    }

    [Fact]
    public async Task HandleAsync_TitleOfInvisibleCharactersOnly_IsRequired()
    {
        Night("2026-12-04", "20:00");

        var ex = await Assert.ThrowsAsync<BadRequestException>(() =>
            _sut.HandleAsync("s", new PatchEventConfigRequest { Title = "\u200B\u2060\u3164" }));

        Assert.Equal(ErrorCodes.EventTitleRequired, ex.Reason);
    }

    private sealed class FixedClock(DateTimeOffset now) : TimeProvider
    {
        public override DateTimeOffset GetUtcNow() => now;
    }
}
