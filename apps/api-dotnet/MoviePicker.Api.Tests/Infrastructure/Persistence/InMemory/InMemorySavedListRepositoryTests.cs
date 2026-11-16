using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Infrastructure.Persistence.InMemory;
using Xunit;

namespace MoviePicker.Api.Tests.Infrastructure.Persistence.InMemory;

public sealed class InMemorySavedListRepositoryTests
{
    private static readonly DateTimeOffset Now = new(2026, 11, 13, 20, 0, 0, TimeSpan.Zero);

    private readonly InMemorySavedListRepository _sut = new();

    private static SavedListTitle Title(int tmdbId) => new() { TmdbId = tmdbId, Title = $"Film {tmdbId}", Year = "1999", GenreIds = [18] };

    [Fact]
    public async Task RefreshSnapshotAsync_RewritesTheNameAndTheFilmsOfTheOwnersSavedList_Only()
    {
        var saved = await _sut.AddIfAbsentAsync(new SavedList
        {
            OwnerId = "u1",
            SourceType = ListSourceType.MemberList,
            SourceId = "abc",
            SourceOwnerId = "creator-1",
            Name = "Hitchcock",
            CreatedAt = Now,
            Snapshot = [Title(539)]
        });

        var byAStranger = await _sut.RefreshSnapshotAsync("u2", saved.Id, "creator-1", "Volée", []);
        var unknown = await _sut.RefreshSnapshotAsync("u1", "unknown", "creator-1", "Volée", []);
        var refreshed = await _sut.RefreshSnapshotAsync("u1", saved.Id, "creator-1", "Tout Hitchcock", [Title(539), Title(426)]);

        Assert.False(byAStranger);
        Assert.False(unknown);
        Assert.True(refreshed);
        var stored = (await _sut.GetAsync("u1", saved.Id))!;
        Assert.Equal("Tout Hitchcock", stored.Name);
        Assert.Equal([539, 426], stored.Snapshot.Select(title => title.TmdbId));
    }

    [Fact]
    public void SameFactsAs_ComparesEveryFactOfTheTitle()
    {
        var title = Title(539) with { PosterPath = "/p.jpg", VoteAverage = 8.1, RuntimeMinutes = 109 };

        Assert.True(title.SameFactsAs(title with { GenreIds = [18] }));
        Assert.False(title.SameFactsAs(title with { GenreIds = [18, 53] }));
        Assert.False(title.SameFactsAs(title with { MediaType = MovieMediaType.Tv }));
        Assert.False(title.SameFactsAs(title with { Title = "Psychose" }));
        Assert.False(title.SameFactsAs(title with { Year = "1960" }));
        Assert.False(title.SameFactsAs(title with { PosterPath = null }));
        Assert.False(title.SameFactsAs(title with { VoteAverage = 8.2 }));
        Assert.False(title.SameFactsAs(title with { RuntimeMinutes = null }));
        Assert.False(title.SameFactsAs(title with { TmdbId = 540 }));
    }

    [Fact]
    public async Task ForgetListsOfCreatorAsync_EmptiesEverySaveOfTheListsOfThatCreator_Only()
    {
        SavedList Saved(string owner, ListSourceType type, string sourceId, string? creator) => new()
        {
            OwnerId = owner,
            SourceType = type,
            SourceId = sourceId,
            SourceOwnerId = creator,
            Name = "Gardée",
            CreatedAt = Now,
            Snapshot = [Title(539)]
        };
        var first = await _sut.AddIfAbsentAsync(Saved("u1", ListSourceType.MemberList, "gone", "leaving"));
        var second = await _sut.AddIfAbsentAsync(Saved("u2", ListSourceType.MemberList, "deleted-before", "leaving"));
        var other = await _sut.AddIfAbsentAsync(Saved("u1", ListSourceType.MemberList, "kept", "staying"));
        var saga = await _sut.AddIfAbsentAsync(Saved("u1", ListSourceType.TmdbCollection, "gone", null));

        var forgotten = await _sut.ForgetListsOfCreatorAsync("leaving");

        Assert.Equal(2, forgotten);
        foreach (var (owner, id) in new[] { ("u1", first.Id), ("u2", second.Id) })
        {
            var stored = (await _sut.GetAsync(owner, id))!;
            Assert.Equal((string.Empty, 0, (string?)null), (stored.Name, stored.Snapshot.Count, stored.SourceOwnerId));
        }

        var untouched = (await _sut.GetAsync("u1", other.Id))!;
        Assert.Equal(("Gardée", 1, "staying"), (untouched.Name, untouched.Snapshot.Count, untouched.SourceOwnerId));
        Assert.Equal("Gardée", (await _sut.GetAsync("u1", saga.Id))!.Name);
        Assert.Equal(0, await _sut.ForgetListsOfCreatorAsync("leaving"));
    }

    [Fact]
    public async Task RefreshSnapshotAsync_OfASaveForgottenSinceItWasRead_WritesNothing()
    {
        var saved = await _sut.AddIfAbsentAsync(new SavedList
        {
            OwnerId = "u1",
            SourceType = ListSourceType.MemberList,
            SourceId = "abc",
            SourceOwnerId = "leaving",
            Name = "Hitchcock",
            CreatedAt = Now,
            Snapshot = [Title(539)]
        });
        await _sut.ForgetListsOfCreatorAsync("leaving");

        var refreshed = await _sut.RefreshSnapshotAsync("u1", saved.Id, saved.SourceOwnerId, "Hitchcock", [Title(539), Title(426)]);

        Assert.False(refreshed);
        var stored = (await _sut.GetAsync("u1", saved.Id))!;
        Assert.Equal((string.Empty, 0), (stored.Name, stored.Snapshot.Count));
    }
}
