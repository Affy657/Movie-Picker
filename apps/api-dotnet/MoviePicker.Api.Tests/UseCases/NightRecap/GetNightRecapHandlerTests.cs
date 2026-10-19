using Moq;
using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.GetEventDetail;
using MoviePicker.Api.Application.UseCases.ListMovies;
using MoviePicker.Api.Application.UseCases.NightRecap;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Domain.Exceptions;
using MoviePicker.Api.Tests.Builders;
using Xunit;

namespace MoviePicker.Api.Tests.UseCases.NightRecap;

public sealed class GetNightRecapHandlerTests
{
    private readonly Mock<IEventRepository> _events = new();
    private readonly Mock<IGetEventDetailHandler> _detail = new();
    private readonly Mock<IListMoviesForEventHandler> _movies = new();
    private readonly GetNightRecapHandler _sut;

    private static readonly Event Night =
        new EventEntityBuilder().WithId("evt-1").WithSlug("soiree-privee").Build() with { RecapSlug = "recap-1234" };

    public GetNightRecapHandlerTests()
    {
        _events.Setup(r => r.GetByRecapSlugAsync("recap-1234", It.IsAny<CancellationToken>())).ReturnsAsync(Night);
        _movies.Setup(m => m.HandleAsync("soiree-privee", It.IsAny<string?>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync([Movie("m1", "Heat"), Movie("m2", "Alien"), Movie("m3", "Dune")]);
        _sut = new GetNightRecapHandler(_events.Object, _detail.Object, _movies.Object);
    }

    private static MovieWithScoreResponse Movie(string id, string title) => new() { Id = id, Title = title };

    private void GivenDetail(bool isHost = false, string? myParticipantId = null, params string[] winnerIds) =>
        _detail.Setup(d => d.HandleAsync("soiree-privee", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new EventDetailResponse
            {
                Id = "evt-1",
                Slug = "soiree-privee",
                RecapSlug = "recap-1234",
                Title = "Soirée du vendredi",
                Date = "2026-09-18",
                Time = "20:30",
                Config = new EventConfigResponse { Theme = "Années 80" },
                IsHost = isHost,
                IsFinished = true,
                Lifecycle = "finished",
                MyParticipant = myParticipantId is null ? null : new ParticipantResponse { Id = myParticipantId, Pseudo = "Moi" },
                ParticipantCount = 4,
                MovieCount = 6,
                Winners = winnerIds.Select(id => new EventWinnerResponse { MovieId = id, PickMethod = "wheel" }).ToList(),
            });

    [Fact]
    public async Task HandleAsync_UnknownRecapLink_ThrowsNotFound()
    {
        var ex = await Assert.ThrowsAsync<NotFoundException>(() => _sut.HandleAsync("soiree-privee"));

        Assert.Equal(ErrorCodes.EventNotFound, ex.Reason);
        _detail.Verify(d => d.HandleAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task HandleAsync_ReaderOutsideTheNight_GetsTheRecapWithoutTheLinkOfTheNight()
    {
        GivenDetail(winnerIds: "m1");

        var recap = await _sut.HandleAsync("recap-1234");

        Assert.Equal("recap-1234", recap.RecapSlug);
        Assert.Null(recap.EventSlug);
        Assert.Equal("Soirée du vendredi", recap.Title);
        Assert.Equal("2026-09-18", recap.Date);
        Assert.Equal("20:30", recap.Time);
        Assert.Equal("Années 80", recap.Config?.Theme);
        Assert.True(recap.IsFinished);
        Assert.Equal(4, recap.ParticipantCount);
        Assert.Equal(6, recap.MovieCount);
        Assert.Null(recap.MyParticipant);
    }

    [Fact]
    public async Task HandleAsync_Participant_GetsTheLinkOfTheNight()
    {
        GivenDetail(myParticipantId: "p1", winnerIds: "m1");

        var recap = await _sut.HandleAsync("recap-1234");

        Assert.Equal("soiree-privee", recap.EventSlug);
        Assert.Equal("p1", recap.MyParticipant?.Id);
    }

    [Fact]
    public async Task HandleAsync_Host_GetsTheLinkOfTheNight()
    {
        GivenDetail(isHost: true, winnerIds: "m1");

        var recap = await _sut.HandleAsync("recap-1234");

        Assert.Equal("soiree-privee", recap.EventSlug);
    }

    [Fact]
    public async Task HandleAsync_ListsOnlyTheChosenMovies_InTheOrderOfTheDraw()
    {
        GivenDetail(myParticipantId: "p1", winnerIds: ["m2", "m1"]);

        var recap = await _sut.HandleAsync("recap-1234");

        Assert.Equal(["Alien", "Heat"], recap.WinnerMovies.Select(m => m.Title));
        Assert.Equal(["m2", "m1"], recap.Winners.Select(w => w.MovieId));
        _movies.Verify(m => m.HandleAsync("soiree-privee", "p1", It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task HandleAsync_NoMovieChosenYet_ReadsNoMovie()
    {
        GivenDetail();

        var recap = await _sut.HandleAsync("recap-1234");

        Assert.Empty(recap.WinnerMovies);
        _movies.Verify(m => m.HandleAsync(It.IsAny<string>(), It.IsAny<string?>(), It.IsAny<CancellationToken>()), Times.Never);
    }
}
