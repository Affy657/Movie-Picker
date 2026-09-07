using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Infrastructure.Persistence.InMemory;
using Xunit;

namespace MoviePicker.Api.Tests.Infrastructure.Persistence;

public sealed class InMemoryMovieRepositoryRankingTests
{
    private static Movie Proposal(string id, string eventId, int tmdbId, string title = "Film") => new()
    {
        Id = id,
        EventId = eventId,
        ParticipantId = $"p-{id}",
        TmdbId = tmdbId,
        MediaType = MovieMediaType.Movie,
        Title = title,
        Year = "2024",
        GenreIds = [18],
        CreatedAt = DateTimeOffset.UtcNow,
        UpdatedAt = DateTimeOffset.UtcNow,
    };

    private static async Task<InMemoryMovieRepository> SeedAsync(params Movie[] movies)
    {
        var repo = new InMemoryMovieRepository();
        foreach (var movie in movies)
            await repo.InsertAsync(movie);
        return repo;
    }

    [Fact]
    public async Task ListMostProposedAsync_SkipsMoviesSeenInASingleEvent()
    {
        var repo = await SeedAsync(
            Proposal("m1", "e1", 100, "Solitaire"),
            Proposal("m2", "e1", 200, "Partagé"),
            Proposal("m3", "e2", 200, "Partagé"));

        var ranking = await repo.ListMostProposedAsync(2, 10);

        Assert.Single(ranking);
        Assert.Equal(200, ranking[0].TmdbId);
        Assert.Equal(2, ranking[0].EventCount);
    }

    [Fact]
    public async Task ListMostProposedAsync_CountsEventsNotProposals()
    {
        var repo = await SeedAsync(
            Proposal("m1", "e1", 300),
            Proposal("m2", "e1", 300),
            Proposal("m3", "e2", 300));

        var ranking = await repo.ListMostProposedAsync(2, 10);

        Assert.Equal(2, ranking[0].EventCount);
    }

    [Fact]
    public async Task ListMostProposedAsync_OrdersByEventCountDescending()
    {
        var repo = await SeedAsync(
            Proposal("m1", "e1", 400),
            Proposal("m2", "e2", 400),
            Proposal("m3", "e1", 500),
            Proposal("m4", "e2", 500),
            Proposal("m5", "e3", 500));

        var ranking = await repo.ListMostProposedAsync(2, 10);

        Assert.Equal(500, ranking[0].TmdbId);
        Assert.Equal(400, ranking[1].TmdbId);
    }

    [Fact]
    public async Task ListMostProposedAsync_HonoursLimit()
    {
        var repo = await SeedAsync(
            Proposal("m1", "e1", 600),
            Proposal("m2", "e2", 600),
            Proposal("m3", "e1", 700),
            Proposal("m4", "e2", 700));

        var ranking = await repo.ListMostProposedAsync(2, 1);

        Assert.Single(ranking);
    }

    [Fact]
    public async Task ListMostProposedAsync_ZeroLimit_ReturnsEmpty()
    {
        var repo = await SeedAsync(Proposal("m1", "e1", 800), Proposal("m2", "e2", 800));

        Assert.Empty(await repo.ListMostProposedAsync(2, 0));
    }
}
