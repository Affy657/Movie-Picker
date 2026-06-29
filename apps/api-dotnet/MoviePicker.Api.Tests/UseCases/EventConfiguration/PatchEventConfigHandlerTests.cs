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
    private readonly Mock<IParticipantRepository> _participants;
    private readonly Mock<IHostTokenAccessor> _hostToken;
    private readonly Mock<ICurrentUserAccessor> _user;
    private readonly PatchEventConfigHandler _sut;

    public PatchEventConfigHandlerTests()
    {
        _events = new Mock<IEventRepository>();
        _participants = new Mock<IParticipantRepository>();
        _hostToken = new Mock<IHostTokenAccessor>();
        _user = new Mock<ICurrentUserAccessor>();
        _sut = new PatchEventConfigHandler(_events.Object, _participants.Object, _hostToken.Object, _user.Object);
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
    public async Task HandleAsync_Theme_Updates()
    {
        var evt = Evt();
        _events.Setup(r => r.GetByIdOrSlugAsync("s", It.IsAny<CancellationToken>())).ReturnsAsync(evt);
        _hostToken.Setup(h => h.GetHostToken()).Returns("ht");
        _events.Setup(r => r.UpdateAsync(It.IsAny<Event>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((Event e, CancellationToken _) => e);

        var res = await _sut.HandleAsync("s", new PatchEventConfigRequest { Theme = "Polars" });

        Assert.Equal("Polars", res.Theme);
    }

    [Fact]
    public async Task HandleAsync_RichSharePreview_Updates()
    {
        var evt = Evt();
        _events.Setup(r => r.GetByIdOrSlugAsync("s", It.IsAny<CancellationToken>())).ReturnsAsync(evt);
        _hostToken.Setup(h => h.GetHostToken()).Returns("ht");
        _events.Setup(r => r.UpdateAsync(It.IsAny<Event>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((Event e, CancellationToken _) => e);

        var res = await _sut.HandleAsync("s", new PatchEventConfigRequest { RichSharePreview = true });

        Assert.True(res.RichSharePreview);
    }

    [Fact]
    public async Task HandleAsync_MaxParticipants_ValidValue_Updates()
    {
        var evt = Evt();
        _events.Setup(r => r.GetByIdOrSlugAsync("s", It.IsAny<CancellationToken>())).ReturnsAsync(evt);
        _hostToken.Setup(h => h.GetHostToken()).Returns("ht");
        _participants.Setup(p => p.CountByEventIdAsync(evt.Id, It.IsAny<CancellationToken>()))
            .ReturnsAsync(3);
        _events.Setup(r => r.UpdateAsync(It.IsAny<Event>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((Event e, CancellationToken _) => e);

        var res = await _sut.HandleAsync("s", new PatchEventConfigRequest { MaxParticipants = 8 });

        Assert.Equal(8, res.MaxParticipants);
    }

    [Fact]
    public async Task HandleAsync_MaxParticipants_Zero_ClearsCap()
    {
        var evt = Evt() with
        {
            Config = new EventConfig { MaxParticipants = 4 }
        };
        _events.Setup(r => r.GetByIdOrSlugAsync("s", It.IsAny<CancellationToken>())).ReturnsAsync(evt);
        _hostToken.Setup(h => h.GetHostToken()).Returns("ht");
        _events.Setup(r => r.UpdateAsync(It.IsAny<Event>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((Event e, CancellationToken _) => e);

        var res = await _sut.HandleAsync("s", new PatchEventConfigRequest { MaxParticipants = 0 });

        Assert.Null(res.MaxParticipants);
    }

    [Fact]
    public async Task HandleAsync_MaxParticipants_OutOfRange_ThrowsBadRequest()
    {
        var evt = Evt();
        _events.Setup(r => r.GetByIdOrSlugAsync("s", It.IsAny<CancellationToken>())).ReturnsAsync(evt);
        _hostToken.Setup(h => h.GetHostToken()).Returns("ht");

        await Assert.ThrowsAsync<BadRequestException>(() =>
            _sut.HandleAsync("s", new PatchEventConfigRequest { MaxParticipants = 501 }));
    }

    [Fact]
    public async Task HandleAsync_MaxParticipants_BelowCurrentCount_ThrowsConflict()
    {
        var evt = Evt();
        _events.Setup(r => r.GetByIdOrSlugAsync("s", It.IsAny<CancellationToken>())).ReturnsAsync(evt);
        _hostToken.Setup(h => h.GetHostToken()).Returns("ht");
        _participants.Setup(p => p.CountByEventIdAsync(evt.Id, It.IsAny<CancellationToken>()))
            .ReturnsAsync(7);

        var ex = await Assert.ThrowsAsync<ConflictException>(() =>
            _sut.HandleAsync("s", new PatchEventConfigRequest { MaxParticipants = 5 }));
        Assert.Contains("inférieure", ex.Message);
    }

    [Fact]
    public async Task HandleAsync_Title_Valid_Updates()
    {
        var evt = Evt();
        _events.Setup(r => r.GetByIdOrSlugAsync("s", It.IsAny<CancellationToken>())).ReturnsAsync(evt);
        _hostToken.Setup(h => h.GetHostToken()).Returns("ht");
        _events.Setup(r => r.UpdateAsync(It.IsAny<Event>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((Event e, CancellationToken _) => e);

        await _sut.HandleAsync("s", new PatchEventConfigRequest { Title = "Nouvelle soirée" });

        _events.Verify(r => r.UpdateAsync(
            It.Is<Event>(e => e.Title == "Nouvelle soirée"),
            It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task HandleAsync_Title_Trimmed()
    {
        var evt = Evt();
        _events.Setup(r => r.GetByIdOrSlugAsync("s", It.IsAny<CancellationToken>())).ReturnsAsync(evt);
        _hostToken.Setup(h => h.GetHostToken()).Returns("ht");
        _events.Setup(r => r.UpdateAsync(It.IsAny<Event>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((Event e, CancellationToken _) => e);

        await _sut.HandleAsync("s", new PatchEventConfigRequest { Title = "  Soirée  " });

        _events.Verify(r => r.UpdateAsync(
            It.Is<Event>(e => e.Title == "Soirée"),
            It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task HandleAsync_Title_Empty_ThrowsBadRequest()
    {
        var evt = Evt();
        _events.Setup(r => r.GetByIdOrSlugAsync("s", It.IsAny<CancellationToken>())).ReturnsAsync(evt);
        _hostToken.Setup(h => h.GetHostToken()).Returns("ht");

        await Assert.ThrowsAsync<BadRequestException>(() =>
            _sut.HandleAsync("s", new PatchEventConfigRequest { Title = "   " }));
    }

    [Fact]
    public async Task HandleAsync_Title_TooLong_ThrowsBadRequest()
    {
        var evt = Evt();
        _events.Setup(r => r.GetByIdOrSlugAsync("s", It.IsAny<CancellationToken>())).ReturnsAsync(evt);
        _hostToken.Setup(h => h.GetHostToken()).Returns("ht");

        await Assert.ThrowsAsync<BadRequestException>(() =>
            _sut.HandleAsync("s", new PatchEventConfigRequest { Title = new string('a', 201) }));
    }

    [Fact]
    public async Task HandleAsync_Title_WhenFinished_ThrowsConflict()
    {
        var evt = Evt() with { ClosedAt = DateTimeOffset.UtcNow.AddDays(-1) };
        _events.Setup(r => r.GetByIdOrSlugAsync("s", It.IsAny<CancellationToken>())).ReturnsAsync(evt);
        _hostToken.Setup(h => h.GetHostToken()).Returns("ht");

        var ex = await Assert.ThrowsAsync<ConflictException>(() =>
            _sut.HandleAsync("s", new PatchEventConfigRequest { Title = "Nouveau nom" }));
        Assert.Contains("terminée", ex.Message);
    }
}
