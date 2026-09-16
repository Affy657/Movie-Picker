using Microsoft.Extensions.DependencyInjection;
using MongoDB.Bson;
using MongoDB.Driver;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Domain.Exceptions;
using Xunit;

namespace MoviePicker.Api.IntegrationTests;

public sealed class RepositoryContractTests : IClassFixture<MoviePickerApplicationFactory>
{
    private readonly MoviePickerApplicationFactory _factory;

    public RepositoryContractTests(MoviePickerApplicationFactory factory)
    {
        _factory = factory;
        _ = _factory.CreateClient();
    }

    private static readonly DateTimeOffset Now = new(2026, 9, 15, 12, 0, 0, TimeSpan.Zero);

    private static Event NewEvent(string title) => new()
    {
        Id = string.Empty,
        Title = title,
        Date = "2026-12-24",
        Time = "20:30",
        HostToken = Guid.NewGuid().ToString("N"),
        Slug = "contract-" + Guid.NewGuid().ToString("N")[..10],
        CreatedAt = Now,
        UpdatedAt = Now
    };

    private static User NewUser(string prefix) => new()
    {
        Email = $"{prefix}-{Guid.NewGuid():N}@example.com",
        DisplayName = prefix,
        Handle = (prefix + Guid.NewGuid().ToString("N"))[..20],
        CreatedAt = Now,
        UpdatedAt = Now
    };

    [Fact]
    public async Task EventUpdate_WithTheVersionJustRead_SucceedsAndIncrementsVersion()
    {
        using var scope = _factory.Services.CreateScope();
        var events = scope.ServiceProvider.GetRequiredService<IEventRepository>();
        var created = await events.AddAsync(NewEvent("Version 0"));

        var updated = await events.UpdateAsync(created with { Title = "Version 1" });

        Assert.Equal(created.Version + 1, updated.Version);
        var reloaded = await events.GetByIdOrSlugAsync(created.Id);
        Assert.Equal("Version 1", reloaded!.Title);
        Assert.Equal(updated.Version, reloaded.Version);
    }

    [Fact]
    public async Task EventUpdate_WithAStaleCopy_ThrowsConflictAndKeepsTheFirstWrite()
    {
        using var scope = _factory.Services.CreateScope();
        var events = scope.ServiceProvider.GetRequiredService<IEventRepository>();
        var created = await events.AddAsync(NewEvent("Original"));
        var hostA = await events.GetByIdOrSlugAsync(created.Id);
        var hostB = await events.GetByIdOrSlugAsync(created.Id);

        await events.UpdateAsync(hostA! with { Title = "Écrit par A" });
        var ex = await Assert.ThrowsAsync<ConflictException>(() =>
            events.UpdateAsync(hostB! with { Title = "Écrit par B" }));

        Assert.Equal("concurrent_update", ex.Reason);
        var reloaded = await events.GetByIdOrSlugAsync(created.Id);
        Assert.Equal("Écrit par A", reloaded!.Title);
    }

    [Fact]
    public async Task EventUpdate_AfterATargetedUpdate_ThrowsConflictForTheStaleCopy()
    {
        using var scope = _factory.Services.CreateScope();
        var events = scope.ServiceProvider.GetRequiredService<IEventRepository>();
        var created = await events.AddAsync(NewEvent("Nettoyage"));
        var stale = await events.GetByIdOrSlugAsync(created.Id);

        Assert.True(await events.MarkWatchlistCleanedAsync(created.Id, Now.AddHours(1)));

        await Assert.ThrowsAsync<ConflictException>(() =>
            events.UpdateAsync(stale! with { Title = "Écrasement" }));
        var reloaded = await events.GetByIdOrSlugAsync(created.Id);
        Assert.NotNull(reloaded!.WatchlistCleanedAt);
        Assert.Equal("Nettoyage", reloaded.Title);
    }

    [Fact]
    public async Task EventMarkChanged_IncrementsTheWriteSequence()
    {
        using var scope = _factory.Services.CreateScope();
        var events = scope.ServiceProvider.GetRequiredService<IEventRepository>();
        var created = await events.AddAsync(NewEvent("Changed"));

        await events.MarkChangedAsync(created.Id);
        await events.MarkChangedAsync(created.Id);

        var reloaded = await events.GetByIdOrSlugAsync(created.Id);
        Assert.Equal(created.WriteSeq + 2, reloaded!.WriteSeq);
        Assert.Equal(created.Version, reloaded.Version);
    }

    [Fact]
    public async Task EventMarkChanged_OnAMissingEvent_ThrowsNotFound()
    {
        using var scope = _factory.Services.CreateScope();
        var events = scope.ServiceProvider.GetRequiredService<IEventRepository>();

        await Assert.ThrowsAsync<NotFoundException>(() => events.MarkChangedAsync(ObjectId.GenerateNewId().ToString()));
    }

    [Fact]
    public async Task EventUpdate_IncrementsTheWriteSequence_AndNeverRewindsIt()
    {
        using var scope = _factory.Services.CreateScope();
        var events = scope.ServiceProvider.GetRequiredService<IEventRepository>();
        var created = await events.AddAsync(NewEvent("Seq"));
        var read = await events.GetByIdOrSlugAsync(created.Id);

        await events.MarkChangedAsync(created.Id);
        await events.UpdateAsync(read! with { Title = "Seq 2" });

        var reloaded = await events.GetByIdOrSlugAsync(created.Id);
        Assert.Equal("Seq 2", reloaded!.Title);
        Assert.Equal(read.WriteSeq + 2, reloaded.WriteSeq);
    }

    [Fact]
    public async Task EventTargetedUpdates_IncrementTheWriteSequence()
    {
        using var scope = _factory.Services.CreateScope();
        var events = scope.ServiceProvider.GetRequiredService<IEventRepository>();
        var created = await events.AddAsync(NewEvent("Targeted") with { CreatorUserId = ObjectId.GenerateNewId().ToString() });

        Assert.True(await events.MarkWatchlistCleanedAsync(created.Id, Now.AddHours(1)));
        var afterCleanup = await events.GetByIdOrSlugAsync(created.Id);
        Assert.Equal(1, await events.AnonymizeCreatorAsync(created.CreatorUserId!));
        var afterAnonymize = await events.GetByIdOrSlugAsync(created.Id);

        Assert.Equal(created.WriteSeq + 1, afterCleanup!.WriteSeq);
        Assert.Equal(created.WriteSeq + 2, afterAnonymize!.WriteSeq);
    }

    [Fact]
    public async Task EventUpdate_OnAMissingEvent_ThrowsNotFound()
    {
        using var scope = _factory.Services.CreateScope();
        var events = scope.ServiceProvider.GetRequiredService<IEventRepository>();
        var ghost = NewEvent("Fantôme") with { Id = "64f000000000000000000001" };

        await Assert.ThrowsAsync<NotFoundException>(() => events.UpdateAsync(ghost));
    }

    [Fact]
    public async Task UserUpdate_WithAStaleCopy_ThrowsConflictAndKeepsTheFirstWrite()
    {
        using var scope = _factory.Services.CreateScope();
        var users = scope.ServiceProvider.GetRequiredService<IUserRepository>();
        var created = await users.AddAsync(NewUser("stale"));
        var copyA = await users.GetByIdAsync(created.Id);
        var copyB = await users.GetByIdAsync(created.Id);

        var savedA = await users.UpdateAsync(copyA! with { Bio = "A" });
        var ex = await Assert.ThrowsAsync<ConflictException>(() =>
            users.UpdateAsync(copyB! with { Bio = "B" }));

        Assert.Equal("concurrent_update", ex.Reason);
        Assert.Equal(created.Version + 1, savedA.Version);
        var reloaded = await users.GetByIdAsync(created.Id);
        Assert.Equal("A", reloaded!.Bio);
    }

    [Fact]
    public async Task UserUpdate_AfterMarkSupporter_ThrowsConflictForTheStaleCopy()
    {
        using var scope = _factory.Services.CreateScope();
        var users = scope.ServiceProvider.GetRequiredService<IUserRepository>();
        var created = await users.AddAsync(NewUser("supporter"));
        var stale = await users.GetByIdAsync(created.Id);

        Assert.True(await users.MarkSupporterAsync(created.Id, Now));

        await Assert.ThrowsAsync<ConflictException>(() =>
            users.UpdateAsync(stale! with { Bio = "Écrasement" }));
        var reloaded = await users.GetByIdAsync(created.Id);
        Assert.NotNull(reloaded!.SupporterSince);
    }

    [Fact]
    public async Task ListOpenEventsStartingBetween_ReturnsOnlyOpenEventsInsideTheWindow()
    {
        using var scope = _factory.Services.CreateScope();
        var events = scope.ServiceProvider.GetRequiredService<IEventRepository>();
        var marker = Guid.NewGuid().ToString("N")[..8];
        var inside = await events.AddAsync(NewEvent("inside-" + marker) with { Date = "2040-03-10", Time = "20:00" });
        await events.AddAsync(NewEvent("before-" + marker) with { Date = "2040-03-01", Time = "20:00" });
        await events.AddAsync(NewEvent("after-" + marker) with { Date = "2040-03-20", Time = "20:00" });
        await events.AddAsync(NewEvent("closed-" + marker) with { Date = "2040-03-10", Time = "20:00", ClosedAt = Now });

        var found = await events.ListOpenEventsStartingBetweenAsync(
            new DateTimeOffset(2040, 3, 5, 0, 0, 0, TimeSpan.Zero),
            new DateTimeOffset(2040, 3, 15, 0, 0, 0, TimeSpan.Zero));

        var mine = found.Where(e => e.Title.EndsWith(marker, StringComparison.Ordinal)).ToList();
        Assert.Equal([inside.Id], mine.Select(e => e.Id));
    }

    [Fact]
    public async Task CountByWinnerMovieIds_CountsTheEventsWhoseWinnersListNamesTheMovie()
    {
        using var scope = _factory.Services.CreateScope();
        var events = scope.ServiceProvider.GetRequiredService<IEventRepository>();
        var movieId = ObjectId.GenerateNewId().ToString();
        var otherMovieId = ObjectId.GenerateNewId().ToString();
        EventWinner[] Won(string id) => [new EventWinner { MovieId = id, Method = WinnerPickMethod.Wheel, PickedAt = Now }];
        await events.AddAsync(NewEvent("won-once") with { Winners = Won(movieId) });
        await events.AddAsync(NewEvent("won-twice") with { Winners = Won(movieId) });
        await events.AddAsync(NewEvent("won-other") with { Winners = Won(otherMovieId) });
        await events.AddAsync(NewEvent("no-winner"));

        Assert.Equal(2, await events.CountByWinnerMovieIdsAsync([movieId]));
        Assert.Equal(3, await events.CountByWinnerMovieIdsAsync([movieId, otherMovieId]));
        Assert.Equal(0, await events.CountByWinnerMovieIdsAsync([ObjectId.GenerateNewId().ToString()]));
    }

    [Fact]
    public async Task ListAwaitingWatchlistCleanup_ReturnsFinishedEventsWithAWinnerNotYetCleaned()
    {
        using var scope = _factory.Services.CreateScope();
        var events = scope.ServiceProvider.GetRequiredService<IEventRepository>();
        var marker = Guid.NewGuid().ToString("N")[..8];
        var winners = new[] { new EventWinner { MovieId = ObjectId.GenerateNewId().ToString(), Method = WinnerPickMethod.Wheel, PickedAt = Now } };
        var closed = await events.AddAsync(NewEvent("closed-" + marker) with { Winners = winners, ClosedAt = Now });
        var autoClosed = await events.AddAsync(NewEvent("auto-" + marker) with { Winners = winners, Date = "2020-01-01" });
        var cleaned = await events.AddAsync(NewEvent("cleaned-" + marker) with { Winners = winners, ClosedAt = Now });
        Assert.True(await events.MarkWatchlistCleanedAsync(cleaned.Id, Now));
        await events.AddAsync(NewEvent("no-winner-" + marker) with { ClosedAt = Now });
        await events.AddAsync(NewEvent("upcoming-" + marker) with { Winners = winners, Date = "2040-01-01" });

        var found = await events.ListAwaitingWatchlistCleanupAsync(Now, 1000);

        var mine = found.Where(e => e.Title.EndsWith(marker, StringComparison.Ordinal)).Select(e => e.Id).ToHashSet();
        HashSet<string> expected = [closed.Id, autoClosed.Id];
        Assert.Equal(expected, mine);
    }

    [Fact]
    public async Task ListAllByCreatorUserId_ReturnsEveryCreatedEvent_EvenBeyondTwoHundred()
    {
        using var scope = _factory.Services.CreateScope();
        var events = scope.ServiceProvider.GetRequiredService<IEventRepository>();
        var creator = MongoDB.Bson.ObjectId.GenerateNewId().ToString();
        for (var i = 0; i < 205; i++)
            await events.AddAsync(NewEvent($"Soirée {i}") with { CreatorUserId = creator });

        var all = await events.ListAllByCreatorUserIdAsync(creator);

        Assert.Equal(205, all.Count);
    }

    [Fact]
    public async Task CascadeDeletes_OnlyRemoveTheListedMovies()
    {
        using var scope = _factory.Services.CreateScope();
        var events = scope.ServiceProvider.GetRequiredService<IEventRepository>();
        var participants = scope.ServiceProvider.GetRequiredService<IParticipantRepository>();
        var movies = scope.ServiceProvider.GetRequiredService<IMovieRepository>();
        var votes = scope.ServiceProvider.GetRequiredService<IVoteRepository>();
        var seenMarks = scope.ServiceProvider.GetRequiredService<ISeenMarkRepository>();

        var evt = await events.AddAsync(NewEvent("Cascade"));
        var participant = await participants.AddAsync(new Participant
        {
            Id = string.Empty,
            EventId = evt.Id,
            Pseudo = "Alice",
            CreatedAt = Now,
            UpdatedAt = Now
        });
        var kept = await movies.InsertAsync(NewMovie(evt.Id, participant.Id, 1, "Gardé"));
        var removedA = await movies.InsertAsync(NewMovie(evt.Id, participant.Id, 2, "Retiré A"));
        var removedB = await movies.InsertAsync(NewMovie(evt.Id, participant.Id, 3, "Retiré B"));
        foreach (var movie in new[] { kept, removedA, removedB })
        {
            await votes.UpsertAsync(new Vote { EventId = evt.Id, MovieId = movie.Id, ParticipantId = participant.Id, Value = 1 });
            await seenMarks.AddAsync(new SeenMark { EventId = evt.Id, MovieId = movie.Id, ParticipantId = participant.Id, CreatedAt = Now, UpdatedAt = Now });
        }
        string[] removedIds = [removedA.Id, removedB.Id];

        Assert.Equal(2, await votes.DeleteByMovieIdsAsync(removedIds));
        Assert.Equal(2, await seenMarks.DeleteByMovieIdsAsync(evt.Id, removedIds));
        Assert.Equal(2, await movies.DeleteByIdsAsync(removedIds));

        var remaining = await movies.ListByEventIdAsync(evt.Id);
        Assert.Equal([kept.Id], remaining.Select(m => m.Id));
        var remainingVotes = await votes.GetParticipantVotesByEventAsync(evt.Id, participant.Id);
        Assert.Equal([kept.Id], remainingVotes.Keys);
        var remainingSeen = await seenMarks.AggregateByMovieIdsAsync(evt.Id, [kept.Id, removedA.Id, removedB.Id]);
        Assert.Equal([kept.Id], remainingSeen.Keys);
        Assert.Equal(0, await votes.DeleteByMovieIdsAsync([]));
    }

    private static Movie NewMovie(string eventId, string participantId, int tmdbId, string title) => new()
    {
        Id = string.Empty,
        EventId = eventId,
        ParticipantId = participantId,
        TmdbId = tmdbId,
        Title = title,
        Year = "2020",
        CreatedAt = Now,
        UpdatedAt = Now
    };

    private async Task<BsonDocument> ReadRawAsync(string collection, string id)
    {
        using var scope = _factory.Services.CreateScope();
        var database = scope.ServiceProvider.GetRequiredService<IMongoDatabase>();
        return await database
            .GetCollection<BsonDocument>(collection)
            .Find(Builders<BsonDocument>.Filter.Eq("_id", ObjectId.Parse(id)))
            .SingleAsync();
    }

    private async Task SetRawFieldAsync(string collection, string id, string field, string value)
    {
        using var scope = _factory.Services.CreateScope();
        var database = scope.ServiceProvider.GetRequiredService<IMongoDatabase>();
        await database.GetCollection<BsonDocument>(collection).UpdateOneAsync(
            Builders<BsonDocument>.Filter.Eq("_id", ObjectId.Parse(id)),
            Builders<BsonDocument>.Update.Set(field, value));
    }

    [MongoFact]
    public async Task EventUpdate_KeepsTheFieldsWrittenByANewerApiVersion()
    {
        using var scope = _factory.Services.CreateScope();
        var events = scope.ServiceProvider.GetRequiredService<IEventRepository>();
        var created = await events.AddAsync(NewEvent("Rolled back"));
        await SetRawFieldAsync("events", created.Id, "fieldFromANewerVersion", "kept");

        await events.UpdateAsync(created with { Title = "Rewritten by the older version" });

        var stored = await ReadRawAsync("events", created.Id);
        Assert.Equal("kept", stored["fieldFromANewerVersion"].AsString);
        Assert.Equal("Rewritten by the older version", stored["title"].AsString);
    }

    [MongoFact]
    public async Task EventUpdate_ClearingAnOptionalField_RemovesItFromTheDocument()
    {
        using var scope = _factory.Services.CreateScope();
        var events = scope.ServiceProvider.GetRequiredService<IEventRepository>();
        var created = await events.AddAsync(NewEvent("Announced") with { WinnerAnnouncedAt = Now });
        Assert.True((await ReadRawAsync("events", created.Id)).Contains("winnerAnnouncedAt"));

        await events.UpdateAsync(created with { WinnerAnnouncedAt = null });

        var stored = await ReadRawAsync("events", created.Id);
        Assert.False(stored.Contains("winnerAnnouncedAt"));
    }

    [MongoFact]
    public async Task UserUpdate_KeepsTheFieldsWrittenByANewerApiVersion()
    {
        using var scope = _factory.Services.CreateScope();
        var users = scope.ServiceProvider.GetRequiredService<IUserRepository>();
        var created = await users.AddAsync(NewUser("rollback"));
        await SetRawFieldAsync("users", created.Id, "fieldFromANewerVersion", "kept");

        await users.UpdateAsync(created with { Bio = "Rewritten by the older version" });

        var stored = await ReadRawAsync("users", created.Id);
        Assert.Equal("kept", stored["fieldFromANewerVersion"].AsString);
        Assert.Equal("Rewritten by the older version", stored["bio"].AsString);
    }

    [MongoFact]
    public async Task UserUpdate_ClearingAnOptionalField_RemovesItFromTheDocument()
    {
        using var scope = _factory.Services.CreateScope();
        var users = scope.ServiceProvider.GetRequiredService<IUserRepository>();
        var created = await users.AddAsync(NewUser("bio") with { Bio = "Written" });
        Assert.True((await ReadRawAsync("users", created.Id)).Contains("bio"));

        await users.UpdateAsync(created with { Bio = null });

        var stored = await ReadRawAsync("users", created.Id);
        Assert.False(stored.Contains("bio"));
    }
}
