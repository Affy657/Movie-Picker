using System.Globalization;
using System.Linq;
using System.Security.Claims;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.AddMovie;
using MoviePicker.Api.Application.UseCases.Auth;
using MoviePicker.Api.Application.UseCases.CreateEvent;
using MoviePicker.Api.Application.UseCases.DeleteMovie;
using MoviePicker.Api.Application.UseCases.Follow;
using MoviePicker.Api.Application.UseCases.JoinEvent;
using MoviePicker.Api.Application.UseCases.Notifications;
using MoviePicker.Api.Application.UseCases.SeenMarks;
using MoviePicker.Api.Application.UseCases.VoteMovie;
using MoviePicker.Api.Domain;
using MoviePicker.Api.Domain.Entities;

namespace MoviePicker.Api.Infrastructure.Development;

internal sealed record DevelopmentSeedActors(User Dev, User Alice, User Bob, User Carla, User David);

internal static class DevelopmentScenarioSeed
{
    internal const string ScenarioMultiTitle = "Scénario seed — Soirée multi-participants";
    internal const string ScenarioWheelTitle = "Scénario seed — Roue et clôture";
    internal const string ScenarioFullCapacityTitle = "Scénario seed — Capacité atteinte";
    internal const string ScenarioRemoveParticipantsTitle = "Scénario seed — Retirer / quitter (hôte = dev)";
    internal const string ScenarioWheelLaunchedTitle = "Scénario seed — Roue tirée (modifications gelées)";
    internal const string ScenarioPastTitle = "Scénario seed — Soirée passée (archivée)";
    internal const string ScenarioDeadlineTitle = "Scénario seed — Soirée avec échéance";
    internal const string ScenarioEmptyTitle = "Scénario seed — Soirée vide (fraîche)";
    internal const string ScenarioDeletedTitle = "Scénario seed — Soirée annulée";

    internal static async Task TrySeedAsync(
        IServiceProvider sp,
        DevelopmentSeedActors actors,
        ILogger logger,
        CancellationToken ct)
    {
        var httpContext = sp.GetRequiredService<IHttpContextAccessor>();
        try
        {
            await RunStepAsync(logger, "profils enrichis", () => TryEnrichProfilesAsync(sp, actors, logger, ct)).ConfigureAwait(false);
            await RunStepAsync(logger, "follows", () => TrySeedFollowsAsync(sp, actors, logger, ct)).ConfigureAwait(false);

            await RunStepAsync(logger, "multi-participants", () => TrySeedMultiParticipantScenarioAsync(sp, actors, logger, ct)).ConfigureAwait(false);
            await RunStepAsync(logger, "roue & clôture", () => TrySeedWheelAndCloseScenarioAsync(sp, actors, logger, ct)).ConfigureAwait(false);
            await RunStepAsync(logger, "capacité atteinte", () => TrySeedFullCapacityScenarioAsync(sp, actors, logger, ct)).ConfigureAwait(false);
            await RunStepAsync(logger, "retrait/quitter", () => TrySeedRemoveParticipantsScenarioAsync(sp, actors, logger, ct)).ConfigureAwait(false);
            await RunStepAsync(logger, "roue tirée (non close)", () => TrySeedWheelLaunchedNotClosedScenarioAsync(sp, actors, logger, ct)).ConfigureAwait(false);
            await RunStepAsync(logger, "soirée passée", () => TrySeedPastEventScenarioAsync(sp, actors, logger, ct)).ConfigureAwait(false);
            await RunStepAsync(logger, "soirée avec échéance", () => TrySeedDeadlineEventScenarioAsync(sp, actors, logger, ct)).ConfigureAwait(false);
            await RunStepAsync(logger, "soirée vide", () => TrySeedEmptyEventScenarioAsync(sp, actors, logger, ct)).ConfigureAwait(false);
            await RunStepAsync(logger, "soirée annulée", () => TrySeedDeletedEventScenarioAsync(sp, actors, logger, ct)).ConfigureAwait(false);
            await RunStepAsync(logger, "rappels", () => TrySeedReminderNotificationsAsync(sp, actors, logger, ct)).ConfigureAwait(false);
        }
        finally
        {
            httpContext.HttpContext = null;
        }
    }

    private static async Task RunStepAsync(ILogger logger, string step, Func<Task> action)
    {
        try
        {
            await action().ConfigureAwait(false);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "DevelopmentSeed : étape « {Step} » échouée — ignorée, démarrage poursuivi.", step);
        }
    }

    private static void ActAs(IHttpContextAccessor httpContext, string userId)
    {
        var identity = new ClaimsIdentity(
            new[] { new Claim(ClaimTypes.NameIdentifier, userId) },
            authenticationType: "DevelopmentSeed");
        httpContext.HttpContext = new DefaultHttpContext { User = new ClaimsPrincipal(identity) };
    }

    private static async Task TryEnrichProfilesAsync(
        IServiceProvider sp,
        DevelopmentSeedActors actors,
        ILogger logger,
        CancellationToken ct)
    {
        var profile = sp.GetRequiredService<IPatchUserProfileHandler>();
        var prefs = sp.GetRequiredService<IPatchNotificationPreferencesHandler>();

        await profile.HandleAsync(
            actors.Dev.Id,
            new PatchUserProfileRequest
            {
                UiTheme = "dark",
                AccentColor = "indigo",
                AvatarId = "bolt",
                Bio = "Compte de dev principal — orga des soirées ciné.",
                IsProfilePublic = true
            },
            ct).ConfigureAwait(false);

        await profile.HandleAsync(
            actors.Alice.Id,
            new PatchUserProfileRequest
            {
                UiTheme = "light",
                AccentColor = "pink",
                AvatarId = "cute",
                Bio = "Team comédies & feel-good 🍿",
                IsProfilePublic = true
            },
            ct).ConfigureAwait(false);

        await profile.HandleAsync(
            actors.Bob.Id,
            new PatchUserProfileRequest
            {
                UiTheme = "system",
                AccentColor = "blue",
                AvatarId = "cool",
                Bio = "SF, thrillers et popcorn.",
                IsProfilePublic = true
            },
            ct).ConfigureAwait(false);

        await profile.HandleAsync(
            actors.Carla.Id,
            new PatchUserProfileRequest
            {
                UiTheme = "dark",
                AccentColor = "green",
                AvatarId = "halo",
                Bio = "Profil privé — sert à tester le 404 et l'impossibilité de suivre.",
                IsProfilePublic = false
            },
            ct).ConfigureAwait(false);

        await profile.HandleAsync(
            actors.David.Id,
            new PatchUserProfileRequest
            {
                UiTheme = "light",
                AccentColor = "orange",
                AvatarId = "zest",
                IsProfilePublic = true
            },
            ct).ConfigureAwait(false);

        // Variété de préférences de notification (le reste reste ON par défaut).
        await prefs.HandleAsync(
            actors.Bob.Id,
            new PatchNotificationPreferencesRequest { NotifyOnMovieAdded = false },
            ct).ConfigureAwait(false);

        await prefs.HandleAsync(
            actors.David.Id,
            new PatchNotificationPreferencesRequest
            {
                NotifyOnParticipantJoined = false,
                NotifyOnEventDeleted = false
            },
            ct).ConfigureAwait(false);

        logger.LogInformation("DevelopmentSeed : profils enrichis (5 comptes, thèmes/accents/bios/visibilité/préférences).");
    }

    private static async Task TrySeedFollowsAsync(
        IServiceProvider sp,
        DevelopmentSeedActors actors,
        ILogger logger,
        CancellationToken ct)
    {
        var follow = sp.GetRequiredService<IFollowUserHandler>();

        // (follower, cible publique) — Carla est privée donc jamais ciblée (suivre Carla = 404).
        var pairs = new (User Follower, User Target)[]
        {
            (actors.Dev, actors.Alice),
            (actors.Dev, actors.Bob),
            (actors.Dev, actors.David),
            (actors.Alice, actors.Dev),
            (actors.Alice, actors.Bob),
            (actors.Bob, actors.Dev),
            (actors.David, actors.Alice),
            (actors.Carla, actors.Dev)
        };

        foreach (var (follower, target) in pairs)
        {
            try
            {
                await follow.HandleAsync(follower.Id, target.Handle, ct).ConfigureAwait(false);
            }
            catch (Exception ex)
            {
                logger.LogWarning(
                    ex,
                    "DevelopmentSeed : follow {Follower} -> {Target} ignoré.",
                    follower.Handle,
                    target.Handle);
            }
        }

        logger.LogInformation("DevelopmentSeed : graphe de follows seedé (génère les notifs NewFollower).");
    }

    private static async Task TrySeedMultiParticipantScenarioAsync(
        IServiceProvider sp,
        DevelopmentSeedActors actors,
        ILogger logger,
        CancellationToken ct)
    {
        var events = sp.GetRequiredService<IEventRepository>();
        var existing = await events.FindByCreatorAndTitleAsync(actors.Alice.Id, ScenarioMultiTitle, ct).ConfigureAwait(false);
        if (existing is not null)
        {
            logger.LogInformation("DevelopmentSeed : scénario multi-participants déjà présent — ignoré.");
            return;
        }

        var create = sp.GetRequiredService<ICreateEventHandler>();
        var join = sp.GetRequiredService<IJoinEventHandler>();
        var addMovie = sp.GetRequiredService<IAddMovieHandler>();
        var vote = sp.GetRequiredService<IVoteMovieHandler>();
        var httpContext = sp.GetRequiredService<IHttpContextAccessor>();
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
                actors.Alice.Id,
                ct)
            .ConfigureAwait(false);

        var slug = created.Slug;
        var alicePart = created.CreatorParticipant?.Id
            ?? throw new InvalidOperationException("Seed : hôte sans participant après création de soirée.");

        await ApplyConfigAsync(
            events,
            slug,
            new EventConfig
            {
                Theme = "Science-fiction & thrillers",
                ThemeColor = 265,
                MaxProposalsPerParticipant = 5,
                MaxParticipants = 8,
                WheelMode = WheelMode.WeightedByVotes,
                RichSharePreview = true,
                AllowSeries = true
            },
            ct).ConfigureAwait(false);

        var joinDev = await join
            .HandleAsync(slug, new JoinEventRequest { Pseudo = "Dev invité" }, actors.Dev.Id, ct)
            .ConfigureAwait(false);
        var joinBob = await join
            .HandleAsync(slug, new JoinEventRequest { Pseudo = "Bob invité" }, actors.Bob.Id, ct)
            .ConfigureAwait(false);
        var joinCarla = await join
            .HandleAsync(slug, new JoinEventRequest { Pseudo = "Carla invitée" }, actors.Carla.Id, ct)
            .ConfigureAwait(false);
        var devPart = joinDev.Participant.Id;
        var bobPart = joinBob.Participant.Id;
        var carlaPart = joinCarla.Participant.Id;

        var mAlice = await AddMovieAsync(addMovie, slug, 550, "Fight Club", "1999", alicePart, actors.Alice.Id, ct).ConfigureAwait(false);
        var mDev = await AddMovieAsync(addMovie, slug, 27205, "Inception", "2010", devPart, actors.Dev.Id, ct).ConfigureAwait(false);
        var mBob = await AddMovieAsync(addMovie, slug, 120, "The Lord of the Rings: The Fellowship of the Ring", "2001", bobPart, actors.Bob.Id, ct).ConfigureAwait(false);
        var mCarla = await AddMovieAsync(addMovie, slug, 157336, "Interstellar", "2014", carlaPart, actors.Carla.Id, ct).ConfigureAwait(false);
        var mJunk = await AddMovieAsync(addMovie, slug, 603, "The Matrix", "1999", bobPart, actors.Bob.Id, ct).ConfigureAwait(false);

        await VoteAsync(vote, httpContext, slug, mAlice.Id, bobPart, actors.Bob.Id, 1, ct).ConfigureAwait(false);
        await VoteAsync(vote, httpContext, slug, mAlice.Id, carlaPart, actors.Carla.Id, 1, ct).ConfigureAwait(false);
        await VoteAsync(vote, httpContext, slug, mDev.Id, alicePart, actors.Alice.Id, 1, ct).ConfigureAwait(false);
        await VoteAsync(vote, httpContext, slug, mBob.Id, devPart, actors.Dev.Id, -1, ct).ConfigureAwait(false);
        await VoteAsync(vote, httpContext, slug, mCarla.Id, devPart, actors.Dev.Id, 1, ct).ConfigureAwait(false);

        ActAs(httpContext, actors.Dev.Id);
        await markAsSeen
            .HandleAsync(slug, mAlice.Id, new MarkAsSeenRequest { ParticipantId = devPart }, ct)
            .ConfigureAwait(false);
        await unmarkAsSeen.HandleAsync(slug, mAlice.Id, devPart, ct).ConfigureAwait(false);
        ActAs(httpContext, actors.Carla.Id);
        await markAsSeen
            .HandleAsync(slug, mBob.Id, new MarkAsSeenRequest { ParticipantId = carlaPart }, ct)
            .ConfigureAwait(false);

        ActAs(httpContext, actors.Bob.Id);
        await deleteMovie.HandleAsync(slug, mJunk.Id, bobPart, ct).ConfigureAwait(false);

        logger.LogInformation("DevelopmentSeed : scénario multi-participants créé (slug={Slug}, hôte Alice, 4 participants).", slug);
    }

    private static async Task TrySeedWheelAndCloseScenarioAsync(
        IServiceProvider sp,
        DevelopmentSeedActors actors,
        ILogger logger,
        CancellationToken ct)
    {
        var events = sp.GetRequiredService<IEventRepository>();
        var votes = sp.GetRequiredService<IVoteRepository>();
        var existing = await events.FindByCreatorAndTitleAsync(actors.Bob.Id, ScenarioWheelTitle, ct).ConfigureAwait(false);
        if (existing is not null)
        {
            logger.LogInformation("DevelopmentSeed : scénario roue & clôture déjà présent — ignoré.");
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
                    Title = ScenarioWheelTitle,
                    Date = FormatDate(utc.AddDays(5)),
                    Time = "19:00"
                },
                actors.Bob.Id,
                ct)
            .ConfigureAwait(false);

        var slug = created.Slug;
        var bobPart = created.CreatorParticipant?.Id
            ?? throw new InvalidOperationException("Seed : hôte sans participant après création de soirée.");

        var joinDev = await join
            .HandleAsync(slug, new JoinEventRequest { Pseudo = "Dev invité" }, actors.Dev.Id, ct)
            .ConfigureAwait(false);
        var joinAlice = await join
            .HandleAsync(slug, new JoinEventRequest { Pseudo = "Alice invitée" }, actors.Alice.Id, ct)
            .ConfigureAwait(false);

        var m1 = await AddMovieAsync(addMovie, slug, 862, "Toy Story", "1995", bobPart, actors.Bob.Id, ct).ConfigureAwait(false);
        var m2 = await AddMovieAsync(addMovie, slug, 324857, "Spider-Man: Into the Spider-Verse", "2018", joinDev.Participant.Id, actors.Dev.Id, ct).ConfigureAwait(false);
        var m3 = await AddMovieAsync(addMovie, slug, 12, "Finding Nemo", "2003", joinAlice.Participant.Id, actors.Alice.Id, ct).ConfigureAwait(false);

        var httpContext = sp.GetRequiredService<IHttpContextAccessor>();
        await VoteAsync(vote, httpContext, slug, m1.Id, bobPart, actors.Bob.Id, 1, ct).ConfigureAwait(false);
        await VoteAsync(vote, httpContext, slug, m1.Id, joinDev.Participant.Id, actors.Dev.Id, 1, ct).ConfigureAwait(false);
        await VoteAsync(vote, httpContext, slug, m2.Id, joinAlice.Participant.Id, actors.Alice.Id, 1, ct).ConfigureAwait(false);
        await VoteAsync(vote, httpContext, slug, m3.Id, bobPart, actors.Bob.Id, -1, ct).ConfigureAwait(false);

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

        await AddMoviePickedNotificationsAsync(sp, closed, winner.Title, ct).ConfigureAwait(false);

        logger.LogInformation(
            "DevelopmentSeed : scénario roue & clôture créé (slug={Slug}, gagnant={WinnerId}, notifs MoviePicked).",
            slug,
            winner.Id);
    }

    private static async Task TrySeedFullCapacityScenarioAsync(
        IServiceProvider sp,
        DevelopmentSeedActors actors,
        ILogger logger,
        CancellationToken ct)
    {
        var events = sp.GetRequiredService<IEventRepository>();
        var existing = await events.FindByCreatorAndTitleAsync(actors.Bob.Id, ScenarioFullCapacityTitle, ct).ConfigureAwait(false);
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
                actors.Bob.Id,
                ct)
            .ConfigureAwait(false);

        var slug = created.Slug;
        var bobPart = created.CreatorParticipant?.Id
            ?? throw new InvalidOperationException("Seed : hôte sans participant après création de soirée.");

        await ApplyConfigAsync(
            events,
            slug,
            new EventConfig
            {
                Theme = "Comédie & feel-good",
                MaxProposalsPerParticipant = 3,
                MaxParticipants = 3,
                WheelMode = WheelMode.StrictRandom,
                RichSharePreview = false
            },
            ct).ConfigureAwait(false);

        var joinDev = await join
            .HandleAsync(slug, new JoinEventRequest { Pseudo = "Dev invité" }, actors.Dev.Id, ct)
            .ConfigureAwait(false);
        await join
            .HandleAsync(slug, new JoinEventRequest { Pseudo = "Alice invitée" }, actors.Alice.Id, ct)
            .ConfigureAwait(false);

        await AddMovieAsync(addMovie, slug, 105, "Back to the Future", "1985", bobPart, actors.Bob.Id, ct).ConfigureAwait(false);
        await AddMovieAsync(addMovie, slug, 13, "Forrest Gump", "1994", joinDev.Participant.Id, actors.Dev.Id, ct).ConfigureAwait(false);

        logger.LogInformation("DevelopmentSeed : scénario capacité atteinte créé (slug={Slug}, 3/3 participants, hôte Bob).", slug);
    }

    private static async Task TrySeedRemoveParticipantsScenarioAsync(
        IServiceProvider sp,
        DevelopmentSeedActors actors,
        ILogger logger,
        CancellationToken ct)
    {
        var events = sp.GetRequiredService<IEventRepository>();
        var existing = await events.FindByCreatorAndTitleAsync(actors.Dev.Id, ScenarioRemoveParticipantsTitle, ct).ConfigureAwait(false);
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
                actors.Dev.Id,
                ct)
            .ConfigureAwait(false);

        var slug = created.Slug;
        var devPart = created.CreatorParticipant?.Id
            ?? throw new InvalidOperationException("Seed : hôte sans participant après création de soirée.");

        await ApplyConfigAsync(
            events,
            slug,
            new EventConfig
            {
                Theme = "Science-fiction & thrillers",
                MaxProposalsPerParticipant = 5,
                MaxParticipants = 8,
                WheelMode = WheelMode.WeightedByVotes,
                RichSharePreview = true
            },
            ct).ConfigureAwait(false);

        var joinAlice = await join
            .HandleAsync(slug, new JoinEventRequest { Pseudo = "Alice (compte)" }, actors.Alice.Id, ct)
            .ConfigureAwait(false);
        var joinBob = await join
            .HandleAsync(slug, new JoinEventRequest { Pseudo = "Bob (compte)" }, actors.Bob.Id, ct)
            .ConfigureAwait(false);
        var alicePart = joinAlice.Participant.Id;
        var bobPart = joinBob.Participant.Id;

        var mAlice = await AddMovieAsync(addMovie, slug, 157336, "Interstellar", "2014", alicePart, actors.Alice.Id, ct).ConfigureAwait(false);
        var mBob = await AddMovieAsync(addMovie, slug, 49026, "The Dark Knight Rises", "2012", bobPart, actors.Bob.Id, ct).ConfigureAwait(false);
        var mDev = await AddMovieAsync(addMovie, slug, 680, "Pulp Fiction", "1994", devPart, actors.Dev.Id, ct).ConfigureAwait(false);

        var httpContext = sp.GetRequiredService<IHttpContextAccessor>();
        await VoteAsync(vote, httpContext, slug, mAlice.Id, devPart, actors.Dev.Id, 1, ct).ConfigureAwait(false);
        await VoteAsync(vote, httpContext, slug, mBob.Id, alicePart, actors.Alice.Id, 1, ct).ConfigureAwait(false);
        await VoteAsync(vote, httpContext, slug, mDev.Id, bobPart, actors.Bob.Id, -1, ct).ConfigureAwait(false);

        logger.LogInformation("DevelopmentSeed : scénario retrait/quitter créé (slug={Slug}, hôte=dev, participants=3).", slug);
    }

    private static async Task TrySeedWheelLaunchedNotClosedScenarioAsync(
        IServiceProvider sp,
        DevelopmentSeedActors actors,
        ILogger logger,
        CancellationToken ct)
    {
        var events = sp.GetRequiredService<IEventRepository>();
        var votes = sp.GetRequiredService<IVoteRepository>();
        var existing = await events.FindByCreatorAndTitleAsync(actors.Dev.Id, ScenarioWheelLaunchedTitle, ct).ConfigureAwait(false);
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
                actors.Dev.Id,
                ct)
            .ConfigureAwait(false);

        var slug = created.Slug;
        var devPart = created.CreatorParticipant?.Id
            ?? throw new InvalidOperationException("Seed : hôte sans participant après création de soirée.");

        var joinAlice = await join
            .HandleAsync(slug, new JoinEventRequest { Pseudo = "Alice (compte)" }, actors.Alice.Id, ct)
            .ConfigureAwait(false);
        var joinBob = await join
            .HandleAsync(slug, new JoinEventRequest { Pseudo = "Bob (compte)" }, actors.Bob.Id, ct)
            .ConfigureAwait(false);

        var m1 = await AddMovieAsync(addMovie, slug, 18, "The Fifth Element", "1997", devPart, actors.Dev.Id, ct).ConfigureAwait(false);
        var m2 = await AddMovieAsync(addMovie, slug, 78, "Blade Runner", "1982", joinAlice.Participant.Id, actors.Alice.Id, ct).ConfigureAwait(false);
        var m3 = await AddMovieAsync(addMovie, slug, 335984, "Blade Runner 2049", "2017", joinBob.Participant.Id, actors.Bob.Id, ct).ConfigureAwait(false);

        var httpContext = sp.GetRequiredService<IHttpContextAccessor>();
        await VoteAsync(vote, httpContext, slug, m1.Id, devPart, actors.Dev.Id, 1, ct).ConfigureAwait(false);
        await VoteAsync(vote, httpContext, slug, m2.Id, joinAlice.Participant.Id, actors.Alice.Id, 1, ct).ConfigureAwait(false);
        await VoteAsync(vote, httpContext, slug, m3.Id, joinBob.Participant.Id, actors.Bob.Id, 1, ct).ConfigureAwait(false);

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

        logger.LogInformation("DevelopmentSeed : scénario roue tirée (non close) créé (slug={Slug}, gagnant={WinnerId}).", slug, winner.Id);
    }

    private static async Task TrySeedPastEventScenarioAsync(
        IServiceProvider sp,
        DevelopmentSeedActors actors,
        ILogger logger,
        CancellationToken ct)
    {
        var events = sp.GetRequiredService<IEventRepository>();
        var votes = sp.GetRequiredService<IVoteRepository>();
        var existing = await events.FindByCreatorAndTitleAsync(actors.Alice.Id, ScenarioPastTitle, ct).ConfigureAwait(false);
        if (existing is not null)
        {
            logger.LogInformation("DevelopmentSeed : scénario soirée passée déjà présent — ignoré.");
            return;
        }

        var create = sp.GetRequiredService<ICreateEventHandler>();
        var join = sp.GetRequiredService<IJoinEventHandler>();
        var addMovie = sp.GetRequiredService<IAddMovieHandler>();
        var vote = sp.GetRequiredService<IVoteMovieHandler>();

        var utc = DateTimeOffset.UtcNow;
        // Créée dans le futur pour pouvoir ajouter films/votes, puis datée dans le passé (lecture seule).
        var created = await create
            .HandleAsync(
                new CreateEventRequest
                {
                    Title = ScenarioPastTitle,
                    Date = FormatDate(utc.AddDays(1)),
                    Time = "20:00"
                },
                actors.Alice.Id,
                ct)
            .ConfigureAwait(false);

        var slug = created.Slug;
        var alicePart = created.CreatorParticipant?.Id
            ?? throw new InvalidOperationException("Seed : hôte sans participant après création de soirée.");

        var joinBob = await join
            .HandleAsync(slug, new JoinEventRequest { Pseudo = "Bob (compte)" }, actors.Bob.Id, ct)
            .ConfigureAwait(false);

        var m1 = await AddMovieAsync(addMovie, slug, 11, "Star Wars", "1977", alicePart, actors.Alice.Id, ct).ConfigureAwait(false);
        var m2 = await AddMovieAsync(addMovie, slug, 1891, "The Empire Strikes Back", "1980", joinBob.Participant.Id, actors.Bob.Id, ct).ConfigureAwait(false);
        var httpContext = sp.GetRequiredService<IHttpContextAccessor>();
        await VoteAsync(vote, httpContext, slug, m1.Id, joinBob.Participant.Id, actors.Bob.Id, 1, ct).ConfigureAwait(false);
        await VoteAsync(vote, httpContext, slug, m2.Id, alicePart, actors.Alice.Id, 1, ct).ConfigureAwait(false);

        var evt = await events.GetByIdOrSlugAsync(slug, ct).ConfigureAwait(false)
            ?? throw new InvalidOperationException("Soirée passée seed introuvable.");

        var movies = await sp.GetRequiredService<IMovieRepository>().ListByEventIdAsync(evt.Id, ct).ConfigureAwait(false);
        var scores = await votes.AggregateScoresByMovieIdsAsync(movies.Select(m => m.Id).ToList(), ct).ConfigureAwait(false);
        var winner = WheelWinnerPicker.Pick(
            movies,
            id => scores.TryGetValue(id, out var a) ? a.Score : 0,
            WheelMode.StrictRandom,
            Random.Shared);

        var now = DateTimeOffset.UtcNow;
        var past = evt with
        {
            Date = FormatDate(utc.AddDays(-3)),
            Time = "20:00",
            WinnerMovieId = winner.Id,
            ClosedAt = utc.AddDays(-3),
            UpdatedAt = now
        };
        await events.UpdateAsync(past, ct).ConfigureAwait(false);

        logger.LogInformation("DevelopmentSeed : scénario soirée passée créé (slug={Slug}, lecture seule).", slug);
    }

    private static async Task TrySeedDeadlineEventScenarioAsync(
        IServiceProvider sp,
        DevelopmentSeedActors actors,
        ILogger logger,
        CancellationToken ct)
    {
        var events = sp.GetRequiredService<IEventRepository>();
        var existing = await events.FindByCreatorAndTitleAsync(actors.Bob.Id, ScenarioDeadlineTitle, ct).ConfigureAwait(false);
        if (existing is not null)
        {
            logger.LogInformation("DevelopmentSeed : scénario soirée avec échéance déjà présent — ignoré.");
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
                    Title = ScenarioDeadlineTitle,
                    Date = FormatDate(utc.AddDays(10)),
                    Time = "20:00"
                },
                actors.Bob.Id,
                ct)
            .ConfigureAwait(false);

        var slug = created.Slug;
        var bobPart = created.CreatorParticipant?.Id
            ?? throw new InvalidOperationException("Seed : hôte sans participant après création de soirée.");

        await ApplyConfigAsync(
            events,
            slug,
            new EventConfig
            {
                Theme = "Horreur",
                ThemeColor = 0,
                EndDate = utc.AddDays(2),
                MaxProposalsPerParticipant = 3,
                MaxParticipants = 6,
                WheelMode = WheelMode.StrictRandom,
                RichSharePreview = true
            },
            ct).ConfigureAwait(false);

        var joinDev = await join
            .HandleAsync(slug, new JoinEventRequest { Pseudo = "Dev invité" }, actors.Dev.Id, ct)
            .ConfigureAwait(false);

        await AddMovieAsync(addMovie, slug, 694, "The Shining", "1980", bobPart, actors.Bob.Id, ct).ConfigureAwait(false);
        await AddMovieAsync(addMovie, slug, 539, "Psycho", "1960", joinDev.Participant.Id, actors.Dev.Id, ct).ConfigureAwait(false);

        logger.LogInformation("DevelopmentSeed : scénario soirée avec échéance créé (slug={Slug}, EndDate +2j).", slug);
    }

    private static async Task TrySeedEmptyEventScenarioAsync(
        IServiceProvider sp,
        DevelopmentSeedActors actors,
        ILogger logger,
        CancellationToken ct)
    {
        var events = sp.GetRequiredService<IEventRepository>();
        var existing = await events.FindByCreatorAndTitleAsync(actors.Dev.Id, ScenarioEmptyTitle, ct).ConfigureAwait(false);
        if (existing is not null)
        {
            logger.LogInformation("DevelopmentSeed : scénario soirée vide déjà présent — ignoré.");
            return;
        }

        var create = sp.GetRequiredService<ICreateEventHandler>();
        var utc = DateTimeOffset.UtcNow;
        var created = await create
            .HandleAsync(
                new CreateEventRequest
                {
                    Title = ScenarioEmptyTitle,
                    Date = FormatDate(utc.AddDays(12)),
                    Time = "19:30"
                },
                actors.Dev.Id,
                ct)
            .ConfigureAwait(false);

        await ApplyConfigAsync(
            events,
            created.Slug,
            new EventConfig
            {
                Theme = "Au choix",
                MaxProposalsPerParticipant = 4,
                MaxParticipants = 10,
                WheelMode = WheelMode.WeightedByVotes,
                RichSharePreview = true
            },
            ct).ConfigureAwait(false);

        logger.LogInformation("DevelopmentSeed : scénario soirée vide créé (slug={Slug}, aucun film).", created.Slug);
    }

    private static async Task TrySeedDeletedEventScenarioAsync(
        IServiceProvider sp,
        DevelopmentSeedActors actors,
        ILogger logger,
        CancellationToken ct)
    {
        var notifs = sp.GetRequiredService<IUserNotificationRepository>();
        var devInbox = await notifs.ListByUserIdAsync(actors.Dev.Id, 50, ct).ConfigureAwait(false);
        if (devInbox.Any(n => n.Type == UserNotificationType.EventDeleted
            && string.Equals(n.EventTitle, ScenarioDeletedTitle, StringComparison.Ordinal)))
        {
            logger.LogInformation("DevelopmentSeed : scénario soirée annulée déjà présent — ignoré.");
            return;
        }

        var events = sp.GetRequiredService<IEventRepository>();
        var create = sp.GetRequiredService<ICreateEventHandler>();
        var join = sp.GetRequiredService<IJoinEventHandler>();
        var usersRepo = sp.GetRequiredService<IUserRepository>();
        var participantsRepo = sp.GetRequiredService<IParticipantRepository>();
        var votesRepo = sp.GetRequiredService<IVoteRepository>();
        var seenRepo = sp.GetRequiredService<ISeenMarkRepository>();
        var moviesRepo = sp.GetRequiredService<IMovieRepository>();

        var utc = DateTimeOffset.UtcNow;
        var created = await create
            .HandleAsync(
                new CreateEventRequest
                {
                    Title = ScenarioDeletedTitle,
                    Date = FormatDate(utc.AddDays(8)),
                    Time = "20:00"
                },
                actors.David.Id,
                ct)
            .ConfigureAwait(false);

        var slug = created.Slug;
        await join.HandleAsync(slug, new JoinEventRequest { Pseudo = "Dev invité" }, actors.Dev.Id, ct).ConfigureAwait(false);
        await join.HandleAsync(slug, new JoinEventRequest { Pseudo = "Alice invitée" }, actors.Alice.Id, ct).ConfigureAwait(false);

        var evt = await events.GetByIdOrSlugAsync(slug, ct).ConfigureAwait(false)
            ?? throw new InvalidOperationException("Soirée annulée seed introuvable.");

        // Notifs EventDeleted aux participants (hors créateur) qui ont opté pour ce type — miroir de DeleteEventHandler.
        var participants = await participantsRepo.ListByEventIdAsync(evt.Id, ct).ConfigureAwait(false);
        var recipientIds = participants
            .Where(p => !string.IsNullOrEmpty(p.UserId) && p.UserId != actors.David.Id)
            .Select(p => p.UserId!)
            .Distinct()
            .ToList();
        if (recipientIds.Count > 0)
        {
            var recipients = await usersRepo.ListByIdsAsync(recipientIds, ct).ConfigureAwait(false);
            var now = DateTimeOffset.UtcNow;
            foreach (var u in recipients.Where(u => u.NotifyOnEventDeleted))
            {
                await notifs.AddAsync(new UserNotification
                {
                    UserId = u.Id,
                    Type = UserNotificationType.EventDeleted,
                    EventId = evt.Id,
                    EventTitle = evt.Title,
                    IsRead = false,
                    CreatedAt = now
                }, ct).ConfigureAwait(false);
            }
        }

        // Cascade de suppression (même ordre que DeleteEventHandler).
        await votesRepo.DeleteByEventIdAsync(evt.Id, ct).ConfigureAwait(false);
        await seenRepo.DeleteByEventIdAsync(evt.Id, ct).ConfigureAwait(false);
        await moviesRepo.DeleteByEventIdAsync(evt.Id, ct).ConfigureAwait(false);
        await participantsRepo.DeleteByEventIdAsync(evt.Id, ct).ConfigureAwait(false);
        await events.DeleteAsync(evt.Id, ct).ConfigureAwait(false);

        logger.LogInformation("DevelopmentSeed : scénario soirée annulée créé (notifs EventDeleted, soirée supprimée).");
    }

    private static async Task TrySeedReminderNotificationsAsync(
        IServiceProvider sp,
        DevelopmentSeedActors actors,
        ILogger logger,
        CancellationToken ct)
    {
        var notifs = sp.GetRequiredService<IUserNotificationRepository>();
        var events = sp.GetRequiredService<IEventRepository>();

        var devEvents = await events.ListByCreatorUserIdAsync(actors.Dev.Id, 20, ct).ConfigureAwait(false);
        var target = devEvents.FirstOrDefault(e => !e.IsFinished(DateTimeOffset.UtcNow));
        if (target is null)
        {
            logger.LogInformation("DevelopmentSeed : aucune soirée à venir pour les rappels — ignoré.");
            return;
        }

        if (await notifs.ExistsAsync(actors.Dev.Id, UserNotificationType.EventReminder24h, target.Id, ct).ConfigureAwait(false))
        {
            logger.LogInformation("DevelopmentSeed : rappels déjà présents — ignoré.");
            return;
        }

        var now = DateTimeOffset.UtcNow;
        await notifs.AddAsync(new UserNotification
        {
            UserId = actors.Dev.Id,
            Type = UserNotificationType.EventReminder24h,
            EventId = target.Id,
            EventSlug = target.Slug,
            EventTitle = target.Title,
            IsRead = false,
            CreatedAt = now.AddHours(-2)
        }, ct).ConfigureAwait(false);

        await notifs.AddAsync(new UserNotification
        {
            UserId = actors.Dev.Id,
            Type = UserNotificationType.EventReminder1h,
            EventId = target.Id,
            EventSlug = target.Slug,
            EventTitle = target.Title,
            IsRead = false,
            CreatedAt = now
        }, ct).ConfigureAwait(false);

        logger.LogInformation("DevelopmentSeed : rappels (24h + 1h) ajoutés pour la soirée {Slug}.", target.Slug);
    }

    private static async Task<MovieWithScoreResponse> AddMovieAsync(
        IAddMovieHandler addMovie,
        string slug,
        int tmdbId,
        string title,
        string year,
        string participantId,
        string callerUserId,
        CancellationToken ct) =>
        await addMovie
            .HandleAsync(
                slug,
                new AddMovieRequest
                {
                    TmdbId = tmdbId,
                    Title = title,
                    Year = year,
                    PosterPath = null,
                    ParticipantId = participantId
                },
                callerUserId,
                ct)
            .ConfigureAwait(false);

    private static async Task VoteAsync(
        IVoteMovieHandler vote,
        IHttpContextAccessor httpContext,
        string slug,
        string movieId,
        string participantId,
        string callerUserId,
        int value,
        CancellationToken ct)
    {
        ActAs(httpContext, callerUserId);
        await vote
            .HandleAsync(slug, movieId, new VoteRequest { ParticipantId = participantId, Value = value }, ct)
            .ConfigureAwait(false);
    }

    private static async Task AddMoviePickedNotificationsAsync(
        IServiceProvider sp,
        Event evt,
        string winnerTitle,
        CancellationToken ct)
    {
        var participantsRepo = sp.GetRequiredService<IParticipantRepository>();
        var usersRepo = sp.GetRequiredService<IUserRepository>();
        var notifs = sp.GetRequiredService<IUserNotificationRepository>();

        var participants = await participantsRepo.ListByEventIdAsync(evt.Id, ct).ConfigureAwait(false);
        var userIds = participants
            .Where(p => !string.IsNullOrEmpty(p.UserId))
            .Select(p => p.UserId!)
            .Distinct()
            .ToList();
        if (userIds.Count == 0)
            return;

        var users = await usersRepo.ListByIdsAsync(userIds, ct).ConfigureAwait(false);
        var now = DateTimeOffset.UtcNow;
        foreach (var u in users.Where(u => u.NotifyOnMoviePicked))
        {
            if (await notifs.ExistsAsync(u.Id, UserNotificationType.MoviePicked, evt.Id, ct).ConfigureAwait(false))
                continue;

            await notifs.AddAsync(new UserNotification
            {
                UserId = u.Id,
                Type = UserNotificationType.MoviePicked,
                EventId = evt.Id,
                EventSlug = evt.Slug,
                EventTitle = evt.Title,
                MovieTitle = winnerTitle,
                IsRead = false,
                CreatedAt = now
            }, ct).ConfigureAwait(false);
        }
    }

    private static async Task ApplyConfigAsync(IEventRepository events, string slug, EventConfig config, CancellationToken ct)
    {
        var evt = await events.GetByIdOrSlugAsync(slug, ct).ConfigureAwait(false)
            ?? throw new InvalidOperationException("Soirée seed introuvable après création.");

        await events.UpdateAsync(CloneEvent(evt, config: config), ct).ConfigureAwait(false);
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

    private static void EnsureConfigBounds(EventConfig cfg)
    {
        if (cfg.MaxParticipants is int maxP && (maxP < 1 || maxP > EventConfig.MaxParticipantsCap))
        {
            throw new ArgumentOutOfRangeException(
                nameof(cfg),
                maxP,
                $"DevelopmentSeed : MaxParticipants doit être entre 1 et {EventConfig.MaxParticipantsCap}.");
        }

        if (cfg.MaxProposalsPerParticipant is int maxProp && (maxProp < 1 || maxProp > EventConfig.MaxProposalsPerParticipantCap))
        {
            throw new ArgumentOutOfRangeException(
                nameof(cfg),
                maxProp,
                $"DevelopmentSeed : MaxProposalsPerParticipant doit être entre 1 et {EventConfig.MaxProposalsPerParticipantCap}.");
        }
    }

    private static string FormatDate(DateTimeOffset utc) =>
        utc.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture);
}
