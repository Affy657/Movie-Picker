using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.AddMovie;
using MoviePicker.Api.Application.UseCases.CreateEvent;
using MoviePicker.Api.Application.UseCases.JoinEvent;
using MoviePicker.Api.Application.UseCases.VoteMovie;
using MoviePicker.Api.Domain.Entities;

namespace MoviePicker.Api.Infrastructure.Development;

internal static partial class DevelopmentScenarioSeed
{
    internal const string DevGroupRankingFirstNightTitle = "Jeudi ciné, épisode 1";

    private sealed record RankingFilm(string By, int TmdbId, string Title, string Year);

    private sealed record RankingNight(
        string Title,
        int DaysAgo,
        string Host,
        RankingFilm[] Films,
        (string Voter, int Film)[] Votes,
        (string Rater, int Value)[] WinnerRatings,
        (string Viewer, int Film)[] Seen);

    private static readonly RankingNight[] GroupRankingNights =
    [
        new(DevGroupRankingFirstNightTitle, 35, "dev",
            [new("dev", 949, "Heat", "1995"), new("alice", 1538, "Collateral", "2004"), new("bob", 64690, "Drive", "2011")],
            [("alice", 0), ("bob", 0), ("dev", 2)],
            [("dev", 8), ("alice", 9), ("bob", 7)],
            [("bob", 1)]),
        new("Jeudi ciné, épisode 2", 28, "alice",
            [new("alice", 496243, "Parasite", "2019"), new("dev", 146233, "Prisoners", "2013"), new("bob", 1949, "Zodiac", "2007")],
            [("dev", 0), ("bob", 0), ("alice", 2)],
            [("dev", 10), ("alice", 9), ("bob", 8)],
            [("dev", 2)]),
        new("Jeudi ciné, épisode 3", 21, "dev",
            [new("bob", 77, "Memento", "2000"), new("dev", 27205, "Inception", "2010"), new("alice", 329865, "Arrival", "2016")],
            [("dev", 0), ("alice", 1), ("bob", 2)],
            [("dev", 7), ("alice", 6), ("bob", 9)],
            [("alice", 1)]),
        new("Jeudi ciné, épisode 4", 14, "alice",
            [new("dev", 807, "Se7en", "1995"), new("alice", 670, "Oldboy", "2003"), new("bob", 275, "Fargo", "1996")],
            [("alice", 0), ("bob", 0), ("dev", 1)],
            [("dev", 9), ("alice", 8), ("bob", 8)],
            []),
        new("Jeudi ciné, épisode 5", 7, "dev",
            [new("alice", 194, "Amélie", "2001"), new("dev", 680, "Pulp Fiction", "1994"), new("bob", 603, "The Matrix", "1999")],
            [("dev", 0), ("bob", 1), ("alice", 0)],
            [("dev", 8), ("alice", 7), ("bob", 9)],
            [("bob", 2)]),
    ];

    private static async Task TrySeedGroupRankingNightsAsync(
        IServiceProvider sp,
        DevelopmentSeedActors actors,
        ILogger logger,
        CancellationToken ct)
    {
        var events = sp.GetRequiredService<IEventRepository>();
        if (await events.FindByCreatorAndTitleAsync(actors.Dev.Id, DevGroupRankingFirstNightTitle, ct).ConfigureAwait(false) is not null)
        {
            logger.LogInformation("DevelopmentSeed: group ranking nights already present, skipped.");
            return;
        }

        var group = (await sp.GetRequiredService<IFriendGroupRepository>().ListByOwnerAsync(actors.Dev.Id, ct).ConfigureAwait(false))
            .FirstOrDefault(candidate => candidate.Name == DevFriendGroupName);
        if (group is null)
            return;

        var people = new Dictionary<string, User>(StringComparer.Ordinal)
        {
            ["dev"] = actors.Dev,
            ["alice"] = actors.Alice,
            ["bob"] = actors.Bob
        };
        foreach (var night in GroupRankingNights)
            await SeedRankingNightAsync(sp, group.Id, people, night, ct).ConfigureAwait(false);

        logger.LogInformation(
            "DevelopmentSeed: {Count} finished nights of \"{Group}\" for the group ranking.",
            GroupRankingNights.Length,
            DevFriendGroupName);
    }

    private static async Task SeedRankingNightAsync(
        IServiceProvider sp,
        string groupId,
        Dictionary<string, User> people,
        RankingNight night,
        CancellationToken ct)
    {
        var events = sp.GetRequiredService<IEventRepository>();
        var host = people[night.Host];
        var utc = DateTimeOffset.UtcNow;
        var created = await sp.GetRequiredService<ICreateEventHandler>()
            .HandleAsync(
                new CreateEventRequest { Title = night.Title, Date = FormatDate(utc.AddDays(1)), Time = "21:00", GroupId = groupId },
                host.Id,
                ct)
            .ConfigureAwait(false);
        var participants = new Dictionary<string, string>(StringComparer.Ordinal)
        {
            [night.Host] = created.CreatorParticipant?.Id
                ?? throw new InvalidOperationException("Seed: host without a participant after creating the movie night.")
        };
        var join = sp.GetRequiredService<IJoinEventHandler>();
        foreach (var (key, person) in people.Where(entry => entry.Key != night.Host))
        {
            var joined = await join
                .HandleAsync(created.Slug, new JoinEventRequest { Pseudo = person.DisplayName }, person.Id, ct)
                .ConfigureAwait(false);
            participants[key] = joined.Participant.Id;
        }

        var addMovie = sp.GetRequiredService<IAddMovieHandler>();
        var films = new List<MovieWithScoreResponse>();
        foreach (var film in night.Films)
        {
            films.Add(await AddMovieAsync(
                addMovie, created.Slug, film.TmdbId, film.Title, film.Year, participants[film.By], people[film.By].Id, ct).ConfigureAwait(false));
        }

        var vote = sp.GetRequiredService<IVoteMovieHandler>();
        var httpContext = sp.GetRequiredService<IHttpContextAccessor>();
        foreach (var (voter, film) in night.Votes)
            await VoteAsync(vote, httpContext, created.Slug, films[film].Id, participants[voter], people[voter].Id, 1, ct).ConfigureAwait(false);

        var evt = await events.GetByIdOrSlugAsync(created.Slug, ct).ConfigureAwait(false)
            ?? throw new InvalidOperationException($"Seed group ranking night not found: {created.Slug}");
        var closed = utc.AddDays(-night.DaysAgo);
        foreach (var (viewer, film) in night.Seen)
        {
            await sp.GetRequiredService<ISeenMarkRepository>()
                .AddAsync(new SeenMark { EventId = evt.Id, MovieId = films[film].Id, ParticipantId = participants[viewer], CreatedAt = closed, UpdatedAt = closed }, ct)
                .ConfigureAwait(false);
        }
        foreach (var (rater, value) in night.WinnerRatings)
        {
            await sp.GetRequiredService<IMovieRatingRepository>()
                .UpsertAsync(new MovieRating { EventId = evt.Id, MovieId = films[0].Id, ParticipantId = participants[rater], Value = value, CreatedAt = closed, UpdatedAt = closed }, ct)
                .ConfigureAwait(false);
        }

        await events.UpdateAsync(evt with
        {
            Date = FormatDate(closed),
            Time = "21:00",
            Winners = [SeedWinner(films[0].Id, closed)],
            ClosedAt = closed.AddHours(3),
            UpdatedAt = DateTimeOffset.UtcNow
        }, ct).ConfigureAwait(false);
    }
}
