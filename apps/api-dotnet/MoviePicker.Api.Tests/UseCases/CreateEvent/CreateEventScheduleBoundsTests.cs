using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.CreateEvent;
using MoviePicker.Api.Application.UseCases.Shared;
using MoviePicker.Api.Domain;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Domain.Exceptions;
using MoviePicker.Api.Infrastructure.Persistence.InMemory;
using MoviePicker.Api.Tests.Builders;
using Xunit;

namespace MoviePicker.Api.Tests.UseCases.CreateEvent;

public sealed class CreateEventScheduleBoundsTests
{
    private static readonly DateTimeOffset Now = new(2026, 11, 23, 12, 0, 0, TimeSpan.Zero);

    private readonly Mock<IEventRepository> _events = new();
    private readonly Mock<IUserRepository> _users = new();
    private readonly Mock<IParticipantRepository> _participants = new();
    private readonly CreateEventHandler _sut;

    public CreateEventScheduleBoundsTests()
    {
        _events.Setup(r => r.AddAsync(It.IsAny<Event>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((Event e, CancellationToken _) => e with { Id = "evt" });
        _users.Setup(u => u.GetByIdAsync("u", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new User { Id = "u", Email = "u@test.local", DisplayName = "Hôte" });
        _participants.Setup(p => p.AddAsync(It.IsAny<Participant>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((Participant p, CancellationToken _) => p with { Id = "p" });
        _sut = new CreateEventHandler(
            _events.Object,
            _users.Object,
            _participants.Object,
            new InMemoryFriendGroupRepository(),
            Mock.Of<IGroupNightAnnouncer>(),
            new InMemoryUnitOfWork(),
            NullLogger<CreateEventHandler>.Instance,
            new FixedClock(Now));
    }

    [Theory]
    [InlineData("2026-11-16", "10:00")]
    [InlineData("2025-12-04", "20:00")]
    [InlineData("1900-01-01", "20:00")]
    public async Task HandleAsync_NightThatWouldAlreadyBeClosed_IsRefused(string date, string time)
    {
        var ex = await Assert.ThrowsAsync<BadRequestException>(() =>
            _sut.HandleAsync(new CreateEventRequestBuilder().WithDate(date).WithTime(time).Build(), "u"));

        Assert.Equal(ErrorCodes.EventDateTooEarly, ex.Reason);
        _events.Verify(r => r.AddAsync(It.IsAny<Event>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Theory]
    [InlineData("2026-11-16", "20:00")]
    [InlineData("2026-11-22", "21:00")]
    [InlineData("2028-11-23", "20:00")]
    public async Task HandleAsync_NightStillOpenOrWithinTwoYears_IsCreated(string date, string time)
    {
        var created = await _sut.HandleAsync(new CreateEventRequestBuilder().WithDate(date).WithTime(time).Build(), "u");

        Assert.Equal(date, created.Date);
    }

    [Theory]
    [InlineData("8:30")]
    [InlineData("20:30:00")]
    [InlineData("20h30")]
    [InlineData(" 20:30")]
    [InlineData("24:00")]
    public async Task HandleAsync_TimeOutsideTheHourMinuteFormat_IsRefusedAsATimeError(string time)
    {
        var ex = await Assert.ThrowsAsync<BadRequestException>(() =>
            _sut.HandleAsync(new CreateEventRequestBuilder().WithDate("2026-12-05").WithTime(time).Build(), "u"));

        Assert.Equal(ErrorCodes.InvalidTimeFormat, ex.Reason);
        _events.Verify(r => r.AddAsync(It.IsAny<Event>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Theory]
    [InlineData("2026-12-5")]
    [InlineData("05/12/2026")]
    [InlineData("2026-02-30")]
    public async Task HandleAsync_DateOutsideTheIsoFormat_IsRefusedAsADateError(string date)
    {
        var ex = await Assert.ThrowsAsync<BadRequestException>(() =>
            _sut.HandleAsync(new CreateEventRequestBuilder().WithDate(date).WithTime("20:30").Build(), "u"));

        Assert.Equal(ErrorCodes.InvalidDateFormat, ex.Reason);
        _events.Verify(r => r.AddAsync(It.IsAny<Event>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Theory]
    [InlineData("2028-11-24")]
    [InlineData("9999-12-31")]
    public async Task HandleAsync_NightMoreThanTwoYearsAhead_IsRefused(string date)
    {
        var ex = await Assert.ThrowsAsync<BadRequestException>(() =>
            _sut.HandleAsync(new CreateEventRequestBuilder().WithDate(date).Build(), "u"));

        Assert.Equal(ErrorCodes.EventDateTooFar, ex.Reason);
        Assert.Equal(EventSchedule.MaxYearsAhead, ex.Parameters!["years"]);
    }

    [Theory]
    [InlineData("\u200B\u200B")]
    [InlineData("\u202E \u3164")]
    public async Task HandleAsync_TitleOfInvisibleCharactersOnly_IsRequired(string title)
    {
        var ex = await Assert.ThrowsAsync<BadRequestException>(() =>
            _sut.HandleAsync(new CreateEventRequestBuilder().WithTitle(title).Build(), "u"));

        Assert.Equal(ErrorCodes.EventTitleRequired, ex.Reason);
    }

    [Fact]
    public async Task HandleAsync_TitleWithDirectionalControls_IsStoredWithoutThem()
    {
        var created = await _sut.HandleAsync(
            new CreateEventRequestBuilder().WithTitle("\u202ESoirée\u202C").WithDate("2026-12-04").Build(),
            "u");

        Assert.Equal("Soirée", created.Title);
    }

    private sealed class FixedClock(DateTimeOffset now) : TimeProvider
    {
        public override DateTimeOffset GetUtcNow() => now;
    }
}
