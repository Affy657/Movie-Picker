using Microsoft.Extensions.DependencyInjection;
using MongoDB.Bson;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Domain.Entities;
using Xunit;

namespace MoviePicker.Api.IntegrationTests;

public sealed class MyEventPreviewReadsTests : IClassFixture<MoviePickerApplicationFactory>
{
    private static readonly DateTimeOffset Start = new(2026, 9, 15, 12, 0, 0, TimeSpan.Zero);

    private readonly MoviePickerApplicationFactory _factory;

    public MyEventPreviewReadsTests(MoviePickerApplicationFactory factory)
    {
        _factory = factory;
        _ = _factory.CreateClient();
    }

    private static string NewId() => ObjectId.GenerateNewId().ToString();

    private static Movie Proposal(string id, string eventId, string title, DateTimeOffset createdAt, int tmdbId) => new()
    {
        Id = id,
        EventId = eventId,
        ParticipantId = NewId(),
        TmdbId = tmdbId,
        Title = title,
        Year = "2001",
        PosterPath = $"/posters/{tmdbId}.jpg",
        PitchNote = "A long pitch that the preview never needs",
        GenreIds = [18, 53],
        CreatedAt = createdAt,
        UpdatedAt = createdAt
    };

    private static Participant Guest(string eventId, string pseudo, DateTimeOffset joinedAt, string? userId = null) => new()
    {
        EventId = eventId,
        Pseudo = pseudo,
        UserId = userId,
        CreatedAt = joinedAt,
        UpdatedAt = joinedAt
    };

    [Fact]
    public async Task TopVotedMovies_RankEachNightByScore_ThenProposalTime_AndBringOnlyTheBestOnes()
    {
        using var scope = _factory.Services.CreateScope();
        var movies = scope.ServiceProvider.GetRequiredService<IMovieRepository>();
        var votes = scope.ServiceProvider.GetRequiredService<IVoteRepository>();
        var night = NewId();
        var otherNight = NewId();
        var notAsked = NewId();
        var early = await movies.InsertAsync(Proposal(NewId(), night, "early", Start, 1));
        var liked = await movies.InsertAsync(Proposal(NewId(), night, "liked", Start.AddMinutes(1), 2));
        var tied = await movies.InsertAsync(Proposal(NewId(), night, "tied", Start.AddMinutes(2), 3));
        await movies.InsertAsync(Proposal(NewId(), night, "tied later id", Start.AddMinutes(2), 4));
        var disliked = await movies.InsertAsync(Proposal(NewId(), night, "disliked", Start.AddMinutes(3), 5));
        var balanced = await movies.InsertAsync(Proposal(NewId(), night, "balanced", Start.AddMinutes(4), 6));
        await movies.InsertAsync(Proposal(NewId(), otherNight, "other night", Start, 7));
        await movies.InsertAsync(Proposal(NewId(), notAsked, "not asked", Start, 8));
        await votes.UpsertAsync(new Vote { EventId = night, MovieId = liked.Id, ParticipantId = NewId(), Value = 1 });
        await votes.UpsertAsync(new Vote { EventId = night, MovieId = liked.Id, ParticipantId = NewId(), Value = 1 });
        await votes.UpsertAsync(new Vote { EventId = night, MovieId = disliked.Id, ParticipantId = NewId(), Value = -1 });
        await votes.UpsertAsync(new Vote { EventId = night, MovieId = balanced.Id, ParticipantId = NewId(), Value = 1 });
        await votes.UpsertAsync(new Vote { EventId = night, MovieId = balanced.Id, ParticipantId = NewId(), Value = -1 });

        var top = await movies.ListTopVotedByEventIdsAsync([night, otherNight, NewId()], 3);

        Assert.Equal(
            [liked.Title, early.Title, tied.Title],
            top.Where(preview => preview.EventId == night).Select(preview => preview.Title));
        Assert.Equal("/posters/2.jpg", top.First(preview => preview.EventId == night).PosterPath);
        Assert.Equal(["other night"], top.Where(preview => preview.EventId == otherNight).Select(preview => preview.Title));
        Assert.DoesNotContain(top, preview => preview.EventId == notAsked);
        Assert.Empty(await movies.ListTopVotedByEventIdsAsync([], 3));
        Assert.Empty(await movies.ListTopVotedByEventIdsAsync(["not-an-object-id"], 3));
    }

    [Fact]
    public async Task FirstParticipants_AreTheEarliestJoinersOfEachNight()
    {
        using var scope = _factory.Services.CreateScope();
        var participants = scope.ServiceProvider.GetRequiredService<IParticipantRepository>();
        var night = NewId();
        var otherNight = NewId();
        await participants.AddAsync(Guest(night, "Fifth", Start.AddMinutes(5)));
        await participants.AddAsync(Guest(night, "First", Start, userId: NewId()));
        await participants.AddAsync(Guest(night, "Third", Start.AddMinutes(3)));
        await participants.AddAsync(Guest(night, "Second", Start.AddMinutes(1)));
        await participants.AddAsync(Guest(night, "Fourth", Start.AddMinutes(4)));
        await participants.AddAsync(Guest(otherNight, "Alone", Start.AddMinutes(9)));
        await participants.AddAsync(Guest(NewId(), "Elsewhere", Start));

        var first = await participants.ListFirstByEventIdsAsync([night, otherNight], 4);

        Assert.Equal(
            ["First", "Second", "Third", "Fourth"],
            first.Where(participant => participant.EventId == night).Select(participant => participant.Pseudo));
        Assert.Equal(["Alone"], first.Where(participant => participant.EventId == otherNight).Select(participant => participant.Pseudo));
        Assert.Equal(5, first.Count);
        Assert.NotNull(first.Single(participant => participant.Pseudo == "First").UserId);
        Assert.Empty(await participants.ListFirstByEventIdsAsync([], 4));
    }

    [Fact]
    public async Task VotedNights_NameEachNightTheParticipantsVotedOnOnce()
    {
        using var scope = _factory.Services.CreateScope();
        var votes = scope.ServiceProvider.GetRequiredService<IVoteRepository>();
        var night = NewId();
        var otherNight = NewId();
        var me = NewId();
        var meElsewhere = NewId();
        await votes.UpsertAsync(new Vote { EventId = night, MovieId = NewId(), ParticipantId = me, Value = 1 });
        await votes.UpsertAsync(new Vote { EventId = night, MovieId = NewId(), ParticipantId = me, Value = -1 });
        await votes.UpsertAsync(new Vote { EventId = otherNight, MovieId = NewId(), ParticipantId = meElsewhere, Value = 1 });
        await votes.UpsertAsync(new Vote { EventId = NewId(), MovieId = NewId(), ParticipantId = NewId(), Value = 1 });

        var voted = await votes.ListEventIdsVotedByAsync([me, meElsewhere, NewId()]);

        Assert.Equal(new[] { night, otherNight }.Order(StringComparer.Ordinal), voted.Order(StringComparer.Ordinal));
        Assert.Empty(await votes.ListEventIdsVotedByAsync([]));
    }
}
