using System.Globalization;
using System.Linq;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.AddMovie;
using MoviePicker.Api.Application.UseCases.CreateEvent;
using MoviePicker.Api.Application.UseCases.DeleteMovie;
using MoviePicker.Api.Application.UseCases.JoinEvent;
using MoviePicker.Api.Application.UseCases.SeenMarks;
using MoviePicker.Api.Application.UseCases.VoteMovie;
using MoviePicker.Api.Domain;
using MoviePicker.Api.Domain.Entities;

namespace MoviePicker.Api.Infrastructure.Development;

/// <summary>
/// Données de démo couvrant plusieurs cas d’usage (hôte, invité, films, votes, déjà vu, suppression, roue, clôture).
/// N’utilise pas les handlers qui exigent un <c>HttpContext</c> (patch config, lancement roue via cookie) : config / roue / clôture via <see cref="IEventRepository"/>.
/// </summary>
internal static class DevelopmentScenarioSeed
{
    internal const string ScenarioMultiTitle = "Scénario seed — Soirée multi-participants";
    internal const string ScenarioWheelTitle = "Scénario seed — Roue et clôture";

    internal static async Task TrySeedAsync(
        IServiceProvider sp,
        string primaryUserId,
        User alice,
        User bob,
        ILogger logger,
        CancellationToken ct)
    {
        var events = sp.GetRequiredService<IEventRepository>();
        var votes = sp.GetRequiredService<IVoteRepository>();

        await TrySeedMultiParticipantScenarioAsync(
            sp,
            events,
            primaryUserId,
            alice,
            bob,
            logger,
            ct).ConfigureAwait(false);

        await TrySeedWheelAndCloseScenarioAsync(sp, events, votes, bob, logger, ct).ConfigureAwait(false);
    }

    private static async Task TrySeedMultiParticipantScenarioAsync(
        IServiceProvider sp,
        IEventRepository events,
        string primaryUserId,
        User alice,
        User bob,
        ILogger logger,
        CancellationToken ct)
    {
        var existingAlice = await events.ListByCreatorUserIdAsync(alice.Id, 50, ct).ConfigureAwait(false);
        if (existingAlice.Any(e => e.Title == ScenarioMultiTitle))
        {
            logger.LogInformation("DevelopmentSeed : scénario multi-participants déjà présent — ignoré.");
            return;
        }

        var create = sp.GetRequiredService<ICreateEventHandler>();
        var join = sp.GetRequiredService<IJoinEventHandler>();
        var addMovie = sp.GetRequiredService<IAddMovieHandler>();
        var vote = sp.GetRequiredService<IVoteMovieHandler>();
        var markAsSeen = sp.GetRequiredService<IMarkAsSeenHandler>();
        var unmarkAsSeen = sp.GetRequiredService<IUnmarkAsSeenHandler>();
        var deleteMovie = sp.GetRequiredService<IDeleteMovieHandler>();

        var utc = DateTimeOffset.UtcNow;
        var created = await create
            .HandleAsync(
                new CreateEventRequest
                {
                    Title = ScenarioMultiTitle,
                    Date = FormatDate(utc.AddDays(3)),
                    Time = "20:00"
                },
                alice.Id,
                ct)
            .ConfigureAwait(false);

        var slug = created.Slug;
        var alicePart = created.CreatorParticipant?.Id
            ?? throw new InvalidOperationException("Seed : hôte sans participant après création de soirée.");

        await ApplyMultiScenarioConfigAsync(events, slug, ct).ConfigureAwait(false);

        var joinDev = await join
            .HandleAsync(slug, new JoinEventRequest { Pseudo = "Dev invité" }, primaryUserId, ct)
            .ConfigureAwait(false);
        var joinBob = await join
            .HandleAsync(slug, new JoinEventRequest { Pseudo = "Bob invité" }, bob.Id, ct)
            .ConfigureAwait(false);
        var devPart = joinDev.Participant.Id;
        var bobPart = joinBob.Participant.Id;

        var mAlice = await addMovie
            .HandleAsync(
                slug,
                new AddMovieRequest
                {
                    TmdbId = 550,
                    Title = "Fight Club",
                    Year = "1999",
                    PosterPath = null,
                    ParticipantId = alicePart
                },
                ct)
            .ConfigureAwait(false);

        var mDev = await addMovie
            .HandleAsync(
                slug,
                new AddMovieRequest
                {
                    TmdbId = 27205,
                    Title = "Inception",
                    Year = "2010",
                    PosterPath = null,
                    ParticipantId = devPart
                },
                ct)
            .ConfigureAwait(false);

        var mBob = await addMovie
            .HandleAsync(
                slug,
                new AddMovieRequest
                {
                    TmdbId = 120,
                    Title = "The Lord of the Rings: The Fellowship of the Ring",
                    Year = "2001",
                    PosterPath = null,
                    ParticipantId = bobPart
                },
                ct)
            .ConfigureAwait(false);

        var mJunk = await addMovie
            .HandleAsync(
                slug,
                new AddMovieRequest
                {
                    TmdbId = 603,
                    Title = "The Matrix",
                    Year = "1999",
                    PosterPath = null,
                    ParticipantId = bobPart
                },
                ct)
            .ConfigureAwait(false);

        await vote
            .HandleAsync(slug, mAlice.Id, new VoteRequest { ParticipantId = bobPart, Value = 1 }, ct)
            .ConfigureAwait(false);
        await vote
            .HandleAsync(slug, mDev.Id, new VoteRequest { ParticipantId = alicePart, Value = 1 }, ct)
            .ConfigureAwait(false);
        await vote
            .HandleAsync(slug, mBob.Id, new VoteRequest { ParticipantId = devPart, Value = -1 }, ct)
            .ConfigureAwait(false);

        await markAsSeen
            .HandleAsync(
                slug,
                mAlice.Id,
                new MarkAsSeenRequest { ParticipantId = devPart },
                ct)
            .ConfigureAwait(false);
        await unmarkAsSeen
            .HandleAsync(slug, mAlice.Id, devPart, ct)
            .ConfigureAwait(false);

        await deleteMovie.HandleAsync(slug, mJunk.Id, bobPart, ct).ConfigureAwait(false);

        logger.LogInformation(
            "DevelopmentSeed : scénario multi-participants créé (slug={Slug}, hôte Alice).",
            slug);
    }

    private static async Task ApplyMultiScenarioConfigAsync(IEventRepository events, string slug, CancellationToken ct)
    {
        var evt = await events.GetByIdOrSlugAsync(slug, ct).ConfigureAwait(false)
            ?? throw new InvalidOperationException("Soirée seed introuvable après création.");

        var cfg = new EventConfig
        {
            Theme = "Science-fiction & thrillers",
            EndDate = null,
            MaxProposalsPerParticipant = 5,
            WheelMode = WheelMode.WeightedByVotes,
            RichSharePreview = true
        };

        await events.UpdateAsync(CloneEvent(evt, config: cfg), ct).ConfigureAwait(false);
    }

    private static async Task TrySeedWheelAndCloseScenarioAsync(
        IServiceProvider sp,
        IEventRepository events,
        IVoteRepository votes,
        User bob,
        ILogger logger,
        CancellationToken ct)
    {
        var existingBob = await events.ListByCreatorUserIdAsync(bob.Id, 50, ct).ConfigureAwait(false);
        if (existingBob.Any(e => e.Title == ScenarioWheelTitle))
        {
            logger.LogInformation("DevelopmentSeed : scénario roue & clôture déjà présent — ignoré.");
            return;
        }

        var create = sp.GetRequiredService<ICreateEventHandler>();
        var addMovie = sp.GetRequiredService<IAddMovieHandler>();
        var vote = sp.GetRequiredService<IVoteMovieHandler>();

        var utc = DateTimeOffset.UtcNow;
        var created = await create
            .HandleAsync(
                new CreateEventRequest
                {
                    Title = ScenarioWheelTitle,
                    Date = FormatDate(utc.AddDays(5)),
                    Time = "19:00"
                },
                bob.Id,
                ct)
            .ConfigureAwait(false);

        var slug = created.Slug;
        var bobPart = created.CreatorParticipant?.Id
            ?? throw new InvalidOperationException("Seed : hôte sans participant après création de soirée.");

        var m1 = await addMovie
            .HandleAsync(
                slug,
                new AddMovieRequest
                {
                    TmdbId = 862,
                    Title = "Toy Story",
                    Year = "1995",
                    PosterPath = null,
                    ParticipantId = bobPart
                },
                ct)
            .ConfigureAwait(false);

        var m2 = await addMovie
            .HandleAsync(
                slug,
                new AddMovieRequest
                {
                    TmdbId = 324857,
                    Title = "Spider-Man: Into the Spider-Verse",
                    Year = "2018",
                    PosterPath = null,
                    ParticipantId = bobPart
                },
                ct)
            .ConfigureAwait(false);

        await vote
            .HandleAsync(slug, m1.Id, new VoteRequest { ParticipantId = bobPart, Value = 1 }, ct)
            .ConfigureAwait(false);
        await vote
            .HandleAsync(slug, m2.Id, new VoteRequest { ParticipantId = bobPart, Value = -1 }, ct)
            .ConfigureAwait(false);

        var evt = await events.GetByIdOrSlugAsync(slug, ct).ConfigureAwait(false)
            ?? throw new InvalidOperationException("Soirée roue seed introuvable.");

        var movies = await sp.GetRequiredService<IMovieRepository>().ListByEventIdAsync(evt.Id, ct).ConfigureAwait(false);
        var scores = await votes.AggregateScoresByMovieIdsAsync(movies.Select(m => m.Id).ToList(), ct).ConfigureAwait(false);
        var winner = WheelWinnerPicker.Pick(
            movies,
            id => scores.TryGetValue(id, out var a) ? a.Score : 0,
            WheelMode.WeightedByVotes,
            Random.Shared);

        var now = DateTimeOffset.UtcNow;
        var withWinner = CloneEvent(evt, winnerMovieId: winner.Id, updatedAt: now);
        await events.UpdateAsync(withWinner, ct).ConfigureAwait(false);

        var closed = CloneEvent(withWinner, closedAt: now, updatedAt: now);
        await events.UpdateAsync(closed, ct).ConfigureAwait(false);

        logger.LogInformation(
            "DevelopmentSeed : scénario roue & clôture créé (slug={Slug}, gagnant={WinnerId}).",
            slug,
            winner.Id);
    }

    private static Event CloneEvent(
        Event e,
        EventConfig? config = null,
        DateTimeOffset? closedAt = null,
        string? winnerMovieId = null,
        DateTimeOffset? updatedAt = null) =>
        e with
        {
            Config = config ?? e.Config,
            ClosedAt = closedAt ?? e.ClosedAt,
            WinnerMovieId = winnerMovieId ?? e.WinnerMovieId,
            UpdatedAt = updatedAt ?? DateTimeOffset.UtcNow
        };

    private static string FormatDate(DateTimeOffset utc) =>
        utc.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture);
}
