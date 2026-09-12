using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.CreateEvent;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Domain.Exceptions;
using MoviePicker.Api.Infrastructure.Persistence.InMemory;
using MoviePicker.Api.Tests.Builders;
using Xunit;

namespace MoviePicker.Api.Tests.UseCases.CreateEvent;

public sealed class CreateEventHandlerTests
{
    private readonly Mock<IEventRepository> _eventRepo;
    private readonly Mock<IUserRepository> _userRepo;
    private readonly Mock<IParticipantRepository> _participantRepo;
    private readonly CreateEventHandler _sut;

    public CreateEventHandlerTests()
    {
        _eventRepo = new Mock<IEventRepository>();
        _userRepo = new Mock<IUserRepository>();
        _participantRepo = new Mock<IParticipantRepository>();
        _sut = new CreateEventHandler(_eventRepo.Object, _userRepo.Object, _participantRepo.Object, new InMemoryUnitOfWork(),
            NullLogger<CreateEventHandler>.Instance);
    }

    [Fact]
    public async Task HandleAsync_WithoutCreatorUserId_ThrowsUnauthorizedException()
    {
        var request = new CreateEventRequest { Title = "T", Date = "2025-01-01", Time = "12:00" };
        await Assert.ThrowsAsync<UnauthorizedException>(() => _sut.HandleAsync(request, null));
        await Assert.ThrowsAsync<UnauthorizedException>(() => _sut.HandleAsync(request, "   "));
    }

    [Fact]
    public async Task HandleAsync_ValidRequest_CreatesEventAndCreatorParticipant()
    {
        var request = new CreateEventRequest
        {
            Title = " Soirée film ",
            Date = "2025-12-31",
            Time = "20:00"
        };
        Event? capturedEvent = null;
        _eventRepo
            .Setup(r => r.AddAsync(It.IsAny<Event>(), It.IsAny<CancellationToken>()))
            .Callback<Event, CancellationToken>((e, _) => capturedEvent = e)
            .ReturnsAsync((Event e, CancellationToken _) => new Event
            {
                Id = "evt123",
                Title = e.Title,
                Date = e.Date,
                Time = e.Time,
                HostToken = e.HostToken,
                Slug = e.Slug,
                CreatorUserId = e.CreatorUserId,
                Config = e.Config,
                ClosedAt = e.ClosedAt,
                Winners = e.Winners,
                CreatedAt = e.CreatedAt,
                UpdatedAt = e.UpdatedAt
            });

        _userRepo
            .Setup(u => u.GetByIdAsync("user-1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(
                new User
                {
                    Id = "user-1",
                    Email = "a@test.local",
                    PasswordHash = "x",
                    DisplayName = "Alice",
                    CreatedAt = default,
                    UpdatedAt = default
                });

        Participant? capturedP = null;
        _participantRepo
            .Setup(p => p.AddAsync(It.IsAny<Participant>(), It.IsAny<CancellationToken>()))
            .Callback<Participant, CancellationToken>((p, _) => capturedP = p)
            .ReturnsAsync((Participant p, CancellationToken _) => new Participant
            {
                Id = "part-1",
                EventId = p.EventId,
                Pseudo = p.Pseudo,
                UserId = p.UserId,
                CreatedAt = p.CreatedAt,
                UpdatedAt = p.UpdatedAt
            });

        var result = await _sut.HandleAsync(request, "user-1");

        Assert.NotNull(capturedEvent);
        Assert.Equal("Soirée film", capturedEvent!.Title);
        Assert.Equal("2025-12-31", capturedEvent.Date);
        Assert.Equal("20:00", capturedEvent.Time);
        Assert.False(string.IsNullOrEmpty(capturedEvent.Slug));
        Assert.False(string.IsNullOrEmpty(capturedEvent.HostToken));
        Assert.Equal("user-1", capturedEvent.CreatorUserId);
        Assert.NotNull(capturedEvent.Config);
        Assert.True(capturedEvent.Config!.RichSharePreview);

        Assert.NotNull(capturedP);
        Assert.Equal("evt123", capturedP!.EventId);
        Assert.Equal("Alice", capturedP.Pseudo);
        Assert.Equal("user-1", capturedP.UserId);

        Assert.NotNull(result);
        Assert.Equal("evt123", result.Id);
        Assert.Equal(capturedEvent.Slug, result.Slug);
        Assert.Equal("/e/" + result.Slug, result.ShareUrl);
        Assert.NotNull(result.CreatorParticipant);
        Assert.Equal("part-1", result.CreatorParticipant!.Id);
        Assert.Equal("Alice", result.CreatorParticipant.Pseudo);

        _eventRepo.Verify(r => r.AddAsync(It.IsAny<Event>(), It.IsAny<CancellationToken>()), Times.Once);
        _participantRepo.Verify(p => p.AddAsync(It.IsAny<Participant>(), It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task HandleAsync_TrimsTitle()
    {
        var request = new CreateEventRequestBuilder()
            .WithTitle("  Titre  ")
            .WithDate("2025-01-01")
            .WithTime("19:00")
            .Build();
        Event? captured = null;
        _eventRepo
            .Setup(r => r.AddAsync(It.IsAny<Event>(), It.IsAny<CancellationToken>()))
            .Callback<Event, CancellationToken>((e, _) => captured = e)
            .ReturnsAsync((Event e, CancellationToken _) => new Event
            {
                Id = "id",
                Title = e.Title,
                Date = e.Date,
                Time = e.Time,
                HostToken = e.HostToken,
                Slug = e.Slug,
                CreatorUserId = e.CreatorUserId,
                Config = e.Config,
                ClosedAt = e.ClosedAt,
                Winners = e.Winners,
                CreatedAt = e.CreatedAt,
                UpdatedAt = e.UpdatedAt
            });
        _userRepo
            .Setup(u => u.GetByIdAsync("u", It.IsAny<CancellationToken>()))
            .ReturnsAsync(
                new User
                {
                    Id = "u",
                    Email = "x@y.z",
                    PasswordHash = "h",
                    DisplayName = "Nom",
                    CreatedAt = default,
                    UpdatedAt = default
                });
        _participantRepo
            .Setup(p => p.AddAsync(It.IsAny<Participant>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((Participant p, CancellationToken _) => new Participant
            {
                Id = "p",
                EventId = "id",
                Pseudo = p.Pseudo,
                UserId = p.UserId,
                CreatedAt = p.CreatedAt,
                UpdatedAt = p.UpdatedAt
            });

        await _sut.HandleAsync(request, "u");

        Assert.NotNull(captured);
        Assert.Equal("Titre", captured!.Title);
    }
}
