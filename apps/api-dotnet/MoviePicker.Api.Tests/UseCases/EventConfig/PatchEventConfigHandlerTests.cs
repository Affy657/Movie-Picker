using Moq;
using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.EventConfiguration;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Domain.Exceptions;
using Xunit;

namespace MoviePicker.Api.Tests.UseCases.EventConfiguration;

public sealed class PatchEventConfigHandlerTests
{
    private readonly Mock<IEventRepository> _events;
    private readonly Mock<IHostTokenAccessor> _hostToken;
    private readonly Mock<ICurrentUserAccessor> _user;
    private readonly PatchEventConfigHandler _sut;

    public PatchEventConfigHandlerTests()
    {
        _events = new Mock<IEventRepository>();
        _hostToken = new Mock<IHostTokenAccessor>();
        _user = new Mock<ICurrentUserAccessor>();
        _sut = new PatchEventConfigHandler(_events.Object, _hostToken.Object, _user.Object);
    }

    private static Event Evt() => new()
    {
        Id = "evt1",
        Title = "S",
        Date = "2035-01-01",
        Time = "20:00",
        Slug = "s",
        HostToken = "ht",
        CreatedAt = DateTimeOffset.UtcNow,
        UpdatedAt = DateTimeOffset.UtcNow
    };

    [Fact]
    public async Task HandleAsync_NotHost_ThrowsForbidden()
    {
        var evt = Evt();
        _events.Setup(r => r.GetByIdOrSlugAsync("s", It.IsAny<CancellationToken>())).ReturnsAsync(evt);
        _hostToken.Setup(h => h.GetHostToken()).Returns((string?)null);
        _user.Setup(u => u.GetUserId()).Returns((string?)null);

        await Assert.ThrowsAsync<ForbiddenException>(() =>
            _sut.HandleAsync("s", new PatchEventConfigRequest { Theme = "x" }));
    }

    [Fact]
    public async Task HandleAsync_WhenWinnerSet_ThrowsConflict()
    {
        var evt = Evt();
        evt = new Event
        {
            Id = evt.Id,
            Title = evt.Title,
            Date = evt.Date,
            Time = evt.Time,
            Slug = evt.Slug,
            HostToken = evt.HostToken,
            WinnerMovieId = "m1",
            CreatedAt = evt.CreatedAt,
            UpdatedAt = evt.UpdatedAt
        };
        _events.Setup(r => r.GetByIdOrSlugAsync("s", It.IsAny<CancellationToken>())).ReturnsAsync(evt);
        _hostToken.Setup(h => h.GetHostToken()).Returns("ht");

        await Assert.ThrowsAsync<ConflictException>(() =>
            _sut.HandleAsync("s", new PatchEventConfigRequest { Theme = "x" }));
    }

    [Fact]
    public async Task HandleAsync_ValidReactionIds_Saves()
    {
        var evt = Evt();
        _events.Setup(r => r.GetByIdOrSlugAsync("s", It.IsAny<CancellationToken>())).ReturnsAsync(evt);
        _hostToken.Setup(h => h.GetHostToken()).Returns("ht");
        _events.Setup(r => r.UpdateAsync(It.IsAny<Event>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((Event e, CancellationToken _) => e);

        var res = await _sut.HandleAsync(
            "s",
            new PatchEventConfigRequest { AllowedReactionIds = new[] { "already_seen", "meh" } });

        Assert.NotNull(res.AllowedReactionIds);
        Assert.Equal(2, res.AllowedReactionIds.Count);
    }

    [Fact]
    public async Task HandleAsync_UnknownReaction_ThrowsBadRequest()
    {
        var evt = Evt();
        _events.Setup(r => r.GetByIdOrSlugAsync("s", It.IsAny<CancellationToken>())).ReturnsAsync(evt);
        _hostToken.Setup(h => h.GetHostToken()).Returns("ht");

        var ex = await Assert.ThrowsAsync<BadRequestException>(() =>
            _sut.HandleAsync("s", new PatchEventConfigRequest { AllowedReactionIds = new[] { "nope" } }));
        Assert.Contains("inconnue", ex.Message);
    }
}
