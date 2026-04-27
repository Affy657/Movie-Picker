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
    internal const string ScenarioFullCapacityTitle = "Scénario seed — Capacité atteinte";
    /// <summary>
    /// Scénario dédié au flux retrait/quitter : l'utilisateur dev est hôte et la
    /// soirée mélange participants connectés (Alice, Bob) et invité (Charlie sans
    /// compte). Permet de tester côté hôte la suppression des deux variantes.
    /// </summary>
    internal const string ScenarioRemoveParticipantsTitle = "Scénario seed — Retirer / quitter (hôte = dev)";
    /// <summary>
    /// Scénario figeant l'état "roue tirée mais soirée pas encore close" :
    /// matérialise la garde <c>WinnerMovieId</c> dans <c>RemoveParticipantHandler</c>
    /// (HTTP 409 « déjà été lancée »), distincte du 409 « soirée close ».
    /// </summary>
    internal const string ScenarioWheelLaunchedTitle = "Scénario seed — Roue tirée (modifications gelées)";

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

        await TrySeedFullCapacityScenarioAsync(sp, events, primaryUserId, alice, bob, logger, ct).ConfigureAwait(false);

        await TrySeedRemoveParticipantsScenarioAsync(sp, events, primaryUserId, alice, bob, logger, ct).ConfigureAwait(false);

        await TrySeedWheelLaunchedNotClosedScenarioAsync(sp, events, votes, primaryUserId, alice, bob, logger, ct).ConfigureAwait(false);
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
        var existing = await events.FindByCreatorAndTitleAsync(alice.Id, ScenarioMultiTitle, ct).ConfigureAwait(false);
        if (existing is not null)
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
            MaxParticipants = 8,
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
        var existing = await events.FindByCreatorAndTitleAsync(bob.Id, ScenarioWheelTitle, ct).ConfigureAwait(false);
        if (existing is not null)
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

    private static async Task TrySeedFullCapacityScenarioAsync(
        IServiceProvider sp,
        IEventRepository events,
        string primaryUserId,
        User alice,
        User bob,
        ILogger logger,
        CancellationToken ct)
    {
        var existing = await events.FindByCreatorAndTitleAsync(bob.Id, ScenarioFullCapacityTitle, ct).ConfigureAwait(false);
        if (existing is not null)
        {
            logger.LogInformation("DevelopmentSeed : scénario capacité atteinte déjà présent — ignoré.");
            return;
        }

        var create = sp.GetRequiredService<ICreateEventHandler>();
        var join = sp.GetRequiredService<IJoinEventHandler>();
        var addMovie = sp.GetRequiredService<IAddMovieHandler>();

        var utc = DateTimeOffset.UtcNow;
        var created = await create
            .HandleAsync(
                new CreateEventRequest
                {
                    Title = ScenarioFullCapacityTitle,
                    Date = FormatDate(utc.AddDays(2)),
                    Time = "21:00"
                },
                bob.Id,
                ct)
            .ConfigureAwait(false);

        var slug = created.Slug;
        var bobPart = created.CreatorParticipant?.Id
            ?? throw new InvalidOperationException("Seed : hôte sans participant après création de soirée.");

        // Applique la config : capacité = 3 (hôte inclus) — la soirée sera pleine après 2 joins.
        var evt = await events.GetByIdOrSlugAsync(slug, ct).ConfigureAwait(false)
            ?? throw new InvalidOperationException("Soirée seed (capacité) introuvable après création.");

        var cfg = new EventConfig
        {
            Theme = "Comédie & feel-good",
            EndDate = null,
            MaxProposalsPerParticipant = 3,
            MaxParticipants = 3,
            WheelMode = WheelMode.StrictRandom,
            RichSharePreview = false
        };

        await events.UpdateAsync(CloneEvent(evt, config: cfg), ct).ConfigureAwait(false);

        var joinDev = await join
            .HandleAsync(slug, new JoinEventRequest { Pseudo = "Dev invité" }, primaryUserId, ct)
            .ConfigureAwait(false);
        await join
            .HandleAsync(slug, new JoinEventRequest { Pseudo = "Alice invitée" }, alice.Id, ct)
            .ConfigureAwait(false);

        await addMovie
            .HandleAsync(
                slug,
                new AddMovieRequest
                {
                    TmdbId = 105,
                    Title = "Back to the Future",
                    Year = "1985",
                    PosterPath = null,
                    ParticipantId = bobPart
                },
                ct)
            .ConfigureAwait(false);

        await addMovie
            .HandleAsync(
                slug,
                new AddMovieRequest
                {
                    TmdbId = 13,
                    Title = "Forrest Gump",
                    Year = "1994",
                    PosterPath = null,
                    ParticipantId = joinDev.Participant.Id
                },
                ct)
            .ConfigureAwait(false);

        logger.LogInformation(
            "DevelopmentSeed : scénario capacité atteinte créé (slug={Slug}, 3/3 participants, hôte Bob).",
            slug);
    }

    /// <summary>
    /// Seed dédié au flux « retirer / quitter ». L'utilisateur dev est créateur,
    /// donc dès la connexion il a directement le rôle hôte sur cette soirée et
    /// peut tester la suppression d'un participant connecté (Alice, Bob) ou
    /// invité (Charlie, sans userId). Lui-même apparaît en hôte non-retirable.
    /// </summary>
    private static async Task TrySeedRemoveParticipantsScenarioAsync(
        IServiceProvider sp,
        IEventRepository events,
        string primaryUserId,
        User alice,
        User bob,
        ILogger logger,
        CancellationToken ct)
    {
        var existing = await events
            .FindByCreatorAndTitleAsync(primaryUserId, ScenarioRemoveParticipantsTitle, ct)
            .ConfigureAwait(false);
        if (existing is not null)
        {
            logger.LogInformation("DevelopmentSeed : scénario retrait/quitter déjà présent — ignoré.");
            return;
        }

        var create = sp.GetRequiredService<ICreateEventHandler>();
        var join = sp.GetRequiredService<IJoinEventHandler>();
        var addMovie = sp.GetRequiredService<IAddMovieHandler>();
        var vote = sp.GetRequiredService<IVoteMovieHandler>();

        var utc = DateTimeOffset.UtcNow;
        var created = await create
            .HandleAsync(
                new CreateEventRequest
                {
                    Title = ScenarioRemoveParticipantsTitle,
                    Date = FormatDate(utc.AddDays(4)),
                    Time = "20:30"
                },
                primaryUserId,
                ct)
            .ConfigureAwait(false);

        var slug = created.Slug;
        var devPart = created.CreatorParticipant?.Id
            ?? throw new InvalidOperationException("Seed : hôte sans participant après création de soirée.");

        await ApplyMultiScenarioConfigAsync(events, slug, ct).ConfigureAwait(false);

        var joinAlice = await join
            .HandleAsync(slug, new JoinEventRequest { Pseudo = "Alice (compte)" }, alice.Id, ct)
            .ConfigureAwait(false);
        var joinBob = await join
            .HandleAsync(slug, new JoinEventRequest { Pseudo = "Bob (compte)" }, bob.Id, ct)
            .ConfigureAwait(false);
        // Charlie : participant invité, sans userId — testera le retrait d'un guest côté hôte.
        var joinCharlie = await join
            .HandleAsync(slug, new JoinEventRequest { Pseudo = "Charlie (invité)" }, authenticatedUserId: null, ct)
            .ConfigureAwait(false);

        var alicePart = joinAlice.Participant.Id;
        var bobPart = joinBob.Participant.Id;
        var charliePart = joinCharlie.Participant.Id;

        var mAlice = await addMovie
            .HandleAsync(
                slug,
                new AddMovieRequest
                {
                    TmdbId = 157336,
                    Title = "Interstellar",
                    Year = "2014",
                    PosterPath = null,
                    ParticipantId = alicePart
                },
                ct)
            .ConfigureAwait(false);

        var mBob = await addMovie
            .HandleAsync(
                slug,
                new AddMovieRequest
                {
                    TmdbId = 49026,
                    Title = "The Dark Knight Rises",
                    Year = "2012",
                    PosterPath = null,
                    ParticipantId = bobPart
                },
                ct)
            .ConfigureAwait(false);

        var mCharlie = await addMovie
            .HandleAsync(
                slug,
                new AddMovieRequest
                {
                    TmdbId = 680,
                    Title = "Pulp Fiction",
                    Year = "1994",
                    PosterPath = null,
                    ParticipantId = charliePart
                },
                ct)
            .ConfigureAwait(false);

        await vote.HandleAsync(slug, mAlice.Id, new VoteRequest { ParticipantId = devPart, Value = 1 }, ct).ConfigureAwait(false);
        await vote.HandleAsync(slug, mBob.Id, new VoteRequest { ParticipantId = alicePart, Value = 1 }, ct).ConfigureAwait(false);
        await vote.HandleAsync(slug, mCharlie.Id, new VoteRequest { ParticipantId = bobPart, Value = -1 }, ct).ConfigureAwait(false);

        logger.LogInformation(
            "DevelopmentSeed : scénario retrait/quitter créé (slug={Slug}, hôte=dev, participants=4 dont 1 invité).",
            slug);
    }

    /// <summary>
    /// Seed reproduisant l'état « roue tirée, soirée encore ouverte ». La soirée
    /// reste consultable et la liste des films est intacte, mais toute tentative
    /// de retrait/sortie de participant doit retourner HTTP 409 (la modification
    /// du panel briserait le film gagnant déjà choisi). Distinct de
    /// <see cref="ScenarioWheelTitle"/> qui ferme la soirée.
    /// </summary>
    private static async Task TrySeedWheelLaunchedNotClosedScenarioAsync(
        IServiceProvider sp,
        IEventRepository events,
        IVoteRepository votes,
        string primaryUserId,
        User alice,
        User bob,
        ILogger logger,
        CancellationToken ct)
    {
        var existing = await events
            .FindByCreatorAndTitleAsync(primaryUserId, ScenarioWheelLaunchedTitle, ct)
            .ConfigureAwait(false);
        if (existing is not null)
        {
            logger.LogInformation("DevelopmentSeed : scénario roue tirée (non close) déjà présent — ignoré.");
            return;
        }

        var create = sp.GetRequiredService<ICreateEventHandler>();
        var join = sp.GetRequiredService<IJoinEventHandler>();
        var addMovie = sp.GetRequiredService<IAddMovieHandler>();
        var vote = sp.GetRequiredService<IVoteMovieHandler>();

        var utc = DateTimeOffset.UtcNow;
        var created = await create
            .HandleAsync(
                new CreateEventRequest
                {
                    Title = ScenarioWheelLaunchedTitle,
                    Date = FormatDate(utc.AddDays(6)),
                    Time = "20:00"
                },
                primaryUserId,
                ct)
            .ConfigureAwait(false);

        var slug = created.Slug;
        var devPart = created.CreatorParticipant?.Id
            ?? throw new InvalidOperationException("Seed : hôte sans participant après création de soirée.");

        var joinAlice = await join
            .HandleAsync(slug, new JoinEventRequest { Pseudo = "Alice (compte)" }, alice.Id, ct)
            .ConfigureAwait(false);
        var joinBob = await join
            .HandleAsync(slug, new JoinEventRequest { Pseudo = "Bob (compte)" }, bob.Id, ct)
            .ConfigureAwait(false);

        var m1 = await addMovie
            .HandleAsync(
                slug,
                new AddMovieRequest
                {
                    TmdbId = 18,
                    Title = "The Fifth Element",
                    Year = "1997",
                    PosterPath = null,
                    ParticipantId = devPart
                },
                ct)
            .ConfigureAwait(false);

        var m2 = await addMovie
            .HandleAsync(
                slug,
                new AddMovieRequest
                {
                    TmdbId = 78,
                    Title = "Blade Runner",
                    Year = "1982",
                    PosterPath = null,
                    ParticipantId = joinAlice.Participant.Id
                },
                ct)
            .ConfigureAwait(false);

        var m3 = await addMovie
            .HandleAsync(
                slug,
                new AddMovieRequest
                {
                    TmdbId = 335984,
                    Title = "Blade Runner 2049",
                    Year = "2017",
                    PosterPath = null,
                    ParticipantId = joinBob.Participant.Id
                },
                ct)
            .ConfigureAwait(false);

        await vote.HandleAsync(slug, m1.Id, new VoteRequest { ParticipantId = devPart, Value = 1 }, ct).ConfigureAwait(false);
        await vote.HandleAsync(slug, m2.Id, new VoteRequest { ParticipantId = joinAlice.Participant.Id, Value = 1 }, ct).ConfigureAwait(false);
        await vote.HandleAsync(slug, m3.Id, new VoteRequest { ParticipantId = joinBob.Participant.Id, Value = 1 }, ct).ConfigureAwait(false);

        var evt = await events.GetByIdOrSlugAsync(slug, ct).ConfigureAwait(false)
            ?? throw new InvalidOperationException("Soirée roue tirée seed introuvable.");

        var movies = await sp.GetRequiredService<IMovieRepository>().ListByEventIdAsync(evt.Id, ct).ConfigureAwait(false);
        var scores = await votes.AggregateScoresByMovieIdsAsync(movies.Select(m => m.Id).ToList(), ct).ConfigureAwait(false);
        var winner = WheelWinnerPicker.Pick(
            movies,
            id => scores.TryGetValue(id, out var a) ? a.Score : 0,
            WheelMode.WeightedByVotes,
            Random.Shared);

        var withWinner = CloneEvent(evt, winnerMovieId: winner.Id, updatedAt: DateTimeOffset.UtcNow);
        await events.UpdateAsync(withWinner, ct).ConfigureAwait(false);

        logger.LogInformation(
            "DevelopmentSeed : scénario roue tirée (non close) créé (slug={Slug}, gagnant={WinnerId}).",
            slug,
            winner.Id);
    }

    private static Event CloneEvent(
        Event e,
        EventConfig? config = null,
        DateTimeOffset? closedAt = null,
        string? winnerMovieId = null,
        DateTimeOffset? updatedAt = null)
    {
        if (config is not null)
            EnsureConfigBounds(config);

        return e with
        {
            Config = config ?? e.Config,
            ClosedAt = closedAt ?? e.ClosedAt,
            WinnerMovieId = winnerMovieId ?? e.WinnerMovieId,
            UpdatedAt = updatedAt ?? DateTimeOffset.UtcNow
        };
    }

    /// <summary>
    /// Garde-fou : le seed contourne <c>PatchEventConfigHandler</c>, donc on revérifie ici les bornes
    /// du domaine pour ne pas persister des valeurs hors plage en base de dev (et faire échouer vite
    /// le démarrage si un futur scénario les enfreint).
    /// </summary>
    private static void EnsureConfigBounds(EventConfig cfg)
    {
        if (cfg.MaxParticipants is int maxP && (maxP < 1 || maxP > EventConfig.MaxParticipantsCap))
        {
            throw new ArgumentOutOfRangeException(
                nameof(cfg),
                maxP,
                $"DevelopmentSeed : MaxParticipants doit être entre 1 et {EventConfig.MaxParticipantsCap}.");
        }

        if (cfg.MaxProposalsPerParticipant < 1 || cfg.MaxProposalsPerParticipant > EventConfig.MaxProposalsPerParticipantCap)
        {
            throw new ArgumentOutOfRangeException(
                nameof(cfg),
                cfg.MaxProposalsPerParticipant,
                $"DevelopmentSeed : MaxProposalsPerParticipant doit être entre 1 et {EventConfig.MaxProposalsPerParticipantCap}.");
        }
    }

    private static string FormatDate(DateTimeOffset utc) =>
        utc.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture);
}
