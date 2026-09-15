using Microsoft.Extensions.DependencyInjection;
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
}
