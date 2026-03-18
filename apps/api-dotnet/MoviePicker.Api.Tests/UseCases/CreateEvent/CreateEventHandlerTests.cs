using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.UseCases.CreateEvent;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Tests.Builders;
using Moq;
using Xunit;

namespace MoviePicker.Api.Tests.UseCases.CreateEvent;

public sealed class CreateEventHandlerTests
{
    private readonly Mock<IEventRepository> _eventRepo;
    private readonly CreateEventHandler _sut;

    public CreateEventHandlerTests()
    {
        _eventRepo = new Mock<IEventRepository>();
        _sut = new CreateEventHandler(_eventRepo.Object);
    }

    [Fact]
    public async Task HandleAsync_ValidRequest_ReturnsSlugAndHostToken()
    {
        var request = new CreateEventRequest
        {
            Title = " Soirée film ",
            Date = "2025-12-31",
            Time = "20:00"
        };
        Event? captured = null;
        _eventRepo
            .Setup(r => r.AddAsync(It.IsAny<Event>(), It.IsAny<CancellationToken>()))
            .Callback<Event, CancellationToken>((e, _) => captured = e)
            .ReturnsAsync((Event e, CancellationToken _) => new Event { Id = "evt123", Title = e.Title, Date = e.Date, Time = e.Time, HostToken = e.HostToken, Slug = e.Slug, Config = e.Config, ClosedAt = e.ClosedAt, WinnerMovieId = e.WinnerMovieId, CreatedAt = e.CreatedAt, UpdatedAt = e.UpdatedAt });

        var result = await _sut.HandleAsync(request);

        Assert.NotNull(captured);
        Assert.Equal("Soirée film", captured.Title);
        Assert.Equal("2025-12-31", captured.Date);
        Assert.Equal("20:00", captured.Time);
        Assert.False(string.IsNullOrEmpty(captured.Slug));
        Assert.False(string.IsNullOrEmpty(captured.HostToken));
        Assert.NotNull(result);
        Assert.Equal("evt123", result.Id);
        Assert.Equal(captured.Slug, result.Slug);
        Assert.Equal(captured.HostToken, result.HostToken);
        Assert.Equal("/s/" + result.Slug, result.ShareUrl);
        Assert.Equal("Soirée film", result.Title);
        Assert.Equal("2025-12-31", result.Date);
        Assert.Equal("20:00", result.Time);
        _eventRepo.Verify(r => r.AddAsync(It.IsAny<Event>(), It.IsAny<CancellationToken>()), Times.Once);
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
            .ReturnsAsync((Event e, CancellationToken _) => new Event { Id = "id", Title = e.Title, Date = e.Date, Time = e.Time, HostToken = e.HostToken, Slug = e.Slug, Config = e.Config, ClosedAt = e.ClosedAt, WinnerMovieId = e.WinnerMovieId, CreatedAt = e.CreatedAt, UpdatedAt = e.UpdatedAt });

        await _sut.HandleAsync(request);

        Assert.NotNull(captured);
        Assert.Equal("Titre", captured.Title);
    }
}
