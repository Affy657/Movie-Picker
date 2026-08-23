using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Infrastructure.Persistence.InMemory;
using Xunit;

namespace MoviePicker.Api.Tests.Infrastructure.Persistence.InMemory;

public sealed class InMemoryMovieRepositoryTests
{
    private readonly InMemoryMovieRepository _repo = new();

    private static Movie Mk(
        string id = "",
        string eventId = "evt1",
        string participantId = "p1",
        int tmdbId = 100,
        MovieMediaType mediaType = MovieMediaType.Movie,
        string title = "Inception",
        IReadOnlyList<int>? genreIds = null,
        DateTimeOffset? createdAt = null) => new()
        {
            Id = id,
            EventId = eventId,
            ParticipantId = participantId,
            TmdbId = tmdbId,
            MediaType = mediaType,
            Title = title,
            Year = "2010",
            GenreIds = genreIds ?? [],
            CreatedAt = createdAt ?? DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow
        };

    [Fact]
    public async Task InsertAsync_GeneratesId_WhenEmpty()
    {
        var created = await _repo.InsertAsync(Mk());

        Assert.False(string.IsNullOrEmpty(created.Id));
        Assert.Equal(24, created.Id.Length);
    }

    [Fact]
    public async Task InsertAsync_KeepsProvidedId()
    {
        var created = await _repo.InsertAsync(Mk(id: "mov-fixed"));

        Assert.Equal("mov-fixed", created.Id);
        Assert.Equal(created, await _repo.GetByIdAsync("mov-fixed"));
    }

    [Fact]
    public async Task GetByIdAsync_ReturnsNull_WhenMissing()
    {
        Assert.Null(await _repo.GetByIdAsync("nope"));
    }

    [Fact]
    public async Task GetByIdAndEventIdAsync_MatchesEvent()
    {
        var created = await _repo.InsertAsync(Mk(eventId: "evt1"));

        Assert.NotNull(await _repo.GetByIdAndEventIdAsync(created.Id, "evt1"));
        Assert.Null(await _repo.GetByIdAndEventIdAsync(created.Id, "other"));
        Assert.Null(await _repo.GetByIdAndEventIdAsync("missing", "evt1"));
    }

    [Fact]
    public async Task ListByEventIdAsync_ReturnsInserted_AndEmptyForUnknown()
    {
        await _repo.InsertAsync(Mk(eventId: "evt1"));
        await _repo.InsertAsync(Mk(eventId: "evt1"));

        Assert.Equal(2, (await _repo.ListByEventIdAsync("evt1")).Count);
        Assert.Empty(await _repo.ListByEventIdAsync("evtX"));
    }

    [Fact]
    public async Task ExistsByEventAndTmdbIdAsync_DiscriminatesTmdbIdAndMediaType()
    {
        await _repo.InsertAsync(Mk(tmdbId: 42, mediaType: MovieMediaType.Movie));

        Assert.True(await _repo.ExistsByEventAndTmdbIdAsync("evt1", 42, MovieMediaType.Movie));
        Assert.False(await _repo.ExistsByEventAndTmdbIdAsync("evt1", 42, MovieMediaType.Tv));
        Assert.False(await _repo.ExistsByEventAndTmdbIdAsync("evt1", 99, MovieMediaType.Movie));
    }

    [Fact]
    public async Task ExistsByEventAndTitleCaseInsensitiveAsync_IgnoresCaseAndTrims()
    {
        await _repo.InsertAsync(Mk(title: "Inception"));

        Assert.True(await _repo.ExistsByEventAndTitleCaseInsensitiveAsync("evt1", "  inception  "));
        Assert.False(await _repo.ExistsByEventAndTitleCaseInsensitiveAsync("evt1", "Tenet"));
    }

    [Fact]
    public async Task CountByEventAndParticipantAsync_CountsOnlyMatching()
    {
        await _repo.InsertAsync(Mk(participantId: "p1"));
        await _repo.InsertAsync(Mk(participantId: "p1"));
        await _repo.InsertAsync(Mk(participantId: "p2"));

        Assert.Equal(2, await _repo.CountByEventAndParticipantAsync("evt1", "p1"));
        Assert.Equal(0, await _repo.CountByEventAndParticipantAsync("evt1", "p9"));
    }

    [Fact]
    public async Task DeleteAsync_RemovesFromBothIndexes()
    {
        var created = await _repo.InsertAsync(Mk());

        await _repo.DeleteAsync(created.Id);

        Assert.Null(await _repo.GetByIdAsync(created.Id));
        Assert.Empty(await _repo.ListByEventIdAsync("evt1"));
    }

    [Fact]
    public async Task DeleteAsync_NoThrow_WhenMissing()
    {
        await _repo.DeleteAsync("ghost");
        Assert.Null(await _repo.GetByIdAsync("ghost"));
    }

    [Fact]
    public async Task UpdatePitchNoteAsync_UpdatesNote()
    {
        var created = await _repo.InsertAsync(Mk());

        await _repo.UpdatePitchNoteAsync(created.Id, "Un thriller onirique");

        var reloaded = await _repo.GetByIdAsync(created.Id);
        Assert.Equal("Un thriller onirique", reloaded!.PitchNote);
        var inList = (await _repo.ListByEventIdAsync("evt1")).Single();
        Assert.Equal("Un thriller onirique", inList.PitchNote);
    }

    [Fact]
    public async Task UpdatePitchNoteAsync_NoOp_WhenMissing()
    {
        await _repo.UpdatePitchNoteAsync("ghost", "x");
        Assert.Null(await _repo.GetByIdAsync("ghost"));
    }

    [Fact]
    public async Task UpdateWheelExclusionAsync_TogglesFlag()
    {
        var created = await _repo.InsertAsync(Mk());

        await _repo.UpdateWheelExclusionAsync(created.Id, true);

        Assert.True((await _repo.GetByIdAsync(created.Id))!.ExcludedFromWheel);
        Assert.True((await _repo.ListByEventIdAsync("evt1")).Single().ExcludedFromWheel);

        await _repo.UpdateWheelExclusionAsync(created.Id, false);

        Assert.False((await _repo.GetByIdAsync(created.Id))!.ExcludedFromWheel);
        Assert.False((await _repo.ListByEventIdAsync("evt1")).Single().ExcludedFromWheel);
    }

    [Fact]
    public async Task UpdateWheelExclusionAsync_NoOp_WhenMissing()
    {
        await _repo.UpdateWheelExclusionAsync("ghost", true);
        Assert.Null(await _repo.GetByIdAsync("ghost"));
    }

    [Fact]
    public async Task UpdateGenresAsync_UpdatesGenres()
    {
        var created = await _repo.InsertAsync(Mk());

        await _repo.UpdateGenresAsync(created.Id, [28, 878]);

        var reloaded = await _repo.GetByIdAsync(created.Id);
        Assert.Equal([28, 878], reloaded!.GenreIds);
    }

    [Fact]
    public async Task UpdateGenresAsync_NoOp_WhenMissing()
    {
        await _repo.UpdateGenresAsync("ghost", [1]);
        Assert.Null(await _repo.GetByIdAsync("ghost"));
    }

    [Fact]
    public async Task ListByParticipantIdsAsync_FiltersBlanksAndUnknown()
    {
        var a = await _repo.InsertAsync(Mk(participantId: "p1"));
        await _repo.InsertAsync(Mk(participantId: "p2"));

        Assert.Empty(await _repo.ListByParticipantIdsAsync([]));
        Assert.Empty(await _repo.ListByParticipantIdsAsync(["", "   "]));
        var byP1 = await _repo.ListByParticipantIdsAsync(["p1"]);
        Assert.Equal(a.Id, byP1.Single().Id);
    }

    [Fact]
    public async Task ListByParticipantIdsPagedAsync_FiltersBlanksAndUnknown()
    {
        Assert.Empty(await _repo.ListByParticipantIdsPagedAsync([], 0, 10));
        Assert.Empty(await _repo.ListByParticipantIdsPagedAsync(["", "   "], 0, 10));
    }

    [Fact]
    public async Task ListByParticipantIdsPagedAsync_OrdersByCreatedAtDescending_AndPagesResults()
    {
        var t0 = DateTimeOffset.UtcNow.AddDays(-2);
        var older = await _repo.InsertAsync(Mk(participantId: "p1", createdAt: t0));
        var newer = await _repo.InsertAsync(Mk(participantId: "p1", createdAt: t0.AddDays(1)));
        var newest = await _repo.InsertAsync(Mk(participantId: "p1", createdAt: t0.AddDays(2)));
        await _repo.InsertAsync(Mk(participantId: "p2", createdAt: t0.AddDays(3)));

        var page1 = await _repo.ListByParticipantIdsPagedAsync(["p1"], 0, 2);
        Assert.Equal([newest.Id, newer.Id], page1.Select(m => m.Id));

        var page2 = await _repo.ListByParticipantIdsPagedAsync(["p1"], 2, 2);
        Assert.Equal([older.Id], page2.Select(m => m.Id));
    }

    [Fact]
    public async Task CountByParticipantIdsAsync_CountsOnlyMatching()
    {
        await _repo.InsertAsync(Mk(participantId: "p1"));
        await _repo.InsertAsync(Mk(participantId: "p1"));
        await _repo.InsertAsync(Mk(participantId: "p2"));

        Assert.Equal(2, await _repo.CountByParticipantIdsAsync(["p1"]));
        Assert.Equal(0, await _repo.CountByParticipantIdsAsync([]));
    }

    [Fact]
    public async Task ListMissingGenresAsync_RespectsLimitAndFilter()
    {
        await _repo.InsertAsync(Mk(genreIds: [12]));
        await _repo.InsertAsync(Mk(genreIds: []));
        await _repo.InsertAsync(Mk(genreIds: []));

        Assert.Empty(await _repo.ListMissingGenresAsync(0));
        Assert.Single(await _repo.ListMissingGenresAsync(1));
        Assert.Equal(2, (await _repo.ListMissingGenresAsync(10)).Count);
    }

    [Fact]
    public async Task ListIdsByEventAndParticipantAsync_ReturnsMatchingIds()
    {
        var a = await _repo.InsertAsync(Mk(participantId: "p1"));
        await _repo.InsertAsync(Mk(participantId: "p2"));

        var ids = await _repo.ListIdsByEventAndParticipantAsync("evt1", "p1");
        Assert.Equal([a.Id], ids);
    }

    [Fact]
    public async Task CountByEventIdAsync_ReturnsZero_WhenUnknown()
    {
        await _repo.InsertAsync(Mk(eventId: "evt1"));

        Assert.Equal(1, await _repo.CountByEventIdAsync("evt1"));
        Assert.Equal(0, await _repo.CountByEventIdAsync("evtX"));
    }

    [Fact]
    public async Task CountByEventIdsAsync_ZeroFillsAllRequestedIds()
    {
        await _repo.InsertAsync(Mk(eventId: "evt1"));
        await _repo.InsertAsync(Mk(eventId: "evt1"));

        var map = await _repo.CountByEventIdsAsync(["evt1", "evt2", "evt1"]);

        Assert.Equal(2, map["evt1"]);
        Assert.Equal(0, map["evt2"]);
    }

    [Fact]
    public async Task DeleteByEventIdAsync_RemovesAll_AndReturnsCount()
    {
        await _repo.InsertAsync(Mk(eventId: "evt1"));
        await _repo.InsertAsync(Mk(eventId: "evt1"));

        Assert.Equal(0L, await _repo.DeleteByEventIdAsync("  "));
        Assert.Equal(2L, await _repo.DeleteByEventIdAsync("evt1"));
        Assert.Empty(await _repo.ListByEventIdAsync("evt1"));
    }
}
