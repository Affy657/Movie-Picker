using System.Linq;
using Microsoft.Extensions.Options;
using Moq;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.UserMovies;
using MoviePicker.Api.Configuration;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Domain.Exceptions;
using MoviePicker.Api.Tests.Builders;
using Xunit;

namespace MoviePicker.Api.Tests.UseCases.UserMovies;

public sealed class GetUserProposedMoviesHandlerTests
{
    private readonly Mock<IUserRepository> _users = new();
    private readonly Mock<IParticipantRepository> _participants = new();
    private readonly Mock<IEventRepository> _events = new();
    private readonly Mock<IMovieRepository> _movies = new();
    private readonly Mock<ITmdbMovieSearch> _tmdb = new();

    private static readonly DateTimeOffset Day1 = new(2026, 5, 1, 18, 0, 0, TimeSpan.Zero);

    private static User Alice(bool isPublic = true) => new()
    {
        Id = "u1",
        Email = "a@b.co",
        PasswordHash = "h",
        DisplayName = "Alice",
        Handle = "alice",
        AvatarId = "alpha",
        IsProfilePublic = isPublic,
        CreatedAt = Day1,
        UpdatedAt = Day1
    };

    private static Participant Part(string id, string eventId) => new()
    {
        Id = id,
        EventId = eventId,
        UserId = "u1",
        Pseudo = "Alice",
        CreatedAt = Day1,
        UpdatedAt = Day1
    };

    private static Movie Proposal(string id, string eventId, string participantId, int tmdbId, int daysAfterDay1) => new()
    {
        Id = id,
        EventId = eventId,
        ParticipantId = participantId,
        TmdbId = tmdbId,
        Title = $"Film {tmdbId}",
        Year = "2019",
        PosterPath = $"/p{tmdbId}.jpg",
        GenreIds = [27],
        CreatedAt = Day1.AddDays(daysAfterDay1),
        UpdatedAt = Day1.AddDays(daysAfterDay1)
    };

    private static Event Evt(string id, string? winnerMovieId = null) => new()
    {
        Id = id,
        Title = "Soirée",
        Date = "2026-05-01",
        Time = "20:00",
        Slug = id,
        HostToken = "ht",
        CreatorUserId = "u1",
        Winners = TestWinners.Won(winnerMovieId),
        CreatedAt = Day1,
        UpdatedAt = Day1
    };

    private GetUserProposedMoviesHandler Build(
        IReadOnlyList<Participant>? participants = null,
        IReadOnlyList<Movie>? proposals = null,
        IReadOnlyList<Event>? events = null)
    {
        _users.Setup(r => r.GetByHandleAsync("alice", It.IsAny<CancellationToken>())).ReturnsAsync(Alice());
        _participants.Setup(r => r.ListByUserIdAsync("u1", It.IsAny<int>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(participants ?? []);
        _movies.Setup(r => r.ListByParticipantIdsAsync(It.IsAny<IReadOnlyCollection<string>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(proposals ?? []);
        _events.Setup(r => r.ListByIdsAsync(It.IsAny<IReadOnlyCollection<string>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(events ?? []);
        _tmdb.Setup(s => s.GetEnrichmentsAsync(
                It.IsAny<IReadOnlyCollection<(int, MovieMediaType)>>(),
                It.IsAny<string>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(new Dictionary<(int TmdbId, MovieMediaType MediaType), TmdbMovieEnrichment?>());
        return new GetUserProposedMoviesHandler(
            _users.Object,
            _participants.Object,
            _events.Object,
            _movies.Object,
            _tmdb.Object,
            Options.Create(new MoviePickerOptions { TmdbApiKey = "key" }));
    }

    [Fact]
    public async Task PrivateProfile_ThrowsNotFound()
    {
        var handler = Build();
        _users.Setup(r => r.GetByHandleAsync("alice", It.IsAny<CancellationToken>())).ReturnsAsync(Alice(isPublic: false));

        await Assert.ThrowsAsync<NotFoundException>(() => handler.HandleAsync("alice", winningOnly: false));
    }

    [Fact]
    public async Task NoParticipation_ReturnsEmptyList()
    {
        var handler = Build();

        var res = await handler.HandleAsync("alice", winningOnly: false);

        Assert.Empty(res.Items);
    }

    [Fact]
    public async Task SameFilmProposedInSeveralNights_IsListedOnceWithItsProposalCount()
    {
        var handler = Build(
            participants: [Part("p1", "e1"), Part("p2", "e2"), Part("p3", "e3")],
            proposals:
            [
                Proposal("m1", "e1", "p1", tmdbId: 530385, daysAfterDay1: 0),
                Proposal("m2", "e2", "p2", tmdbId: 530385, daysAfterDay1: 7),
                Proposal("m3", "e3", "p3", tmdbId: 25237, daysAfterDay1: 14),
            ]);

        var res = await handler.HandleAsync("alice", winningOnly: false);

        Assert.Equal(3, res.Items.Sum(i => i.ProposalCount));
        Assert.Equal(2, res.Items.Count);
        var midsommar = Assert.Single(res.Items, i => i.TmdbId == 530385);
        Assert.Equal(2, midsommar.ProposalCount);
        Assert.Equal(Day1.AddDays(7), midsommar.LastProposedAt);
    }

    [Fact]
    public async Task Films_AreSortedByMostRecentProposalFirst()
    {
        var handler = Build(
            participants: [Part("p1", "e1"), Part("p2", "e2")],
            proposals:
            [
                Proposal("m1", "e1", "p1", tmdbId: 1, daysAfterDay1: 0),
                Proposal("m2", "e1", "p1", tmdbId: 2, daysAfterDay1: 1),
                Proposal("m3", "e2", "p2", tmdbId: 1, daysAfterDay1: 9),
            ]);

        var res = await handler.HandleAsync("alice", winningOnly: false);

        Assert.Equal([1, 2], res.Items.Select(i => i.TmdbId));
    }

    [Fact]
    public async Task WinningOnly_KeepsTheProposalsThatWonTheirNight()
    {
        var handler = Build(
            participants: [Part("p1", "e1"), Part("p2", "e2"), Part("p3", "e3")],
            proposals:
            [
                Proposal("m1", "e1", "p1", tmdbId: 530385, daysAfterDay1: 0),
                Proposal("m2", "e2", "p2", tmdbId: 530385, daysAfterDay1: 7),
                Proposal("m3", "e3", "p3", tmdbId: 25237, daysAfterDay1: 14),
            ],
            events: [Evt("e1", winnerMovieId: "m1"), Evt("e2", winnerMovieId: "other"), Evt("e3", winnerMovieId: "m3")]);

        var res = await handler.HandleAsync("alice", winningOnly: true);

        Assert.Equal(2, res.Items.Sum(i => i.ProposalCount));
        Assert.Equal([25237, 530385], res.Items.Select(i => i.TmdbId));
        Assert.All(res.Items, i => Assert.Equal(1, i.ProposalCount));
    }

    [Fact]
    public async Task Items_CarryTheTmdbFactsOfTheFilm()
    {
        var handler = Build(
            participants: [Part("p1", "e1")],
            proposals: [Proposal("m1", "e1", "p1", tmdbId: 7345, daysAfterDay1: 0)]);
        _tmdb.Setup(s => s.GetEnrichmentsAsync(
                It.IsAny<IReadOnlyCollection<(int, MovieMediaType)>>(),
                It.IsAny<string>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(new Dictionary<(int TmdbId, MovieMediaType MediaType), TmdbMovieEnrichment?>
            {
                [(7345, MovieMediaType.Movie)] = new TmdbMovieEnrichment(8.1, [], null, 158)
            });

        var res = await handler.HandleAsync("alice", winningOnly: false);

        var item = Assert.Single(res.Items);
        Assert.Equal(8.1, item.VoteAverage);
        Assert.Equal(158, item.RuntimeMinutes);
        Assert.Equal("/p7345.jpg", item.PosterPath);
    }
}
