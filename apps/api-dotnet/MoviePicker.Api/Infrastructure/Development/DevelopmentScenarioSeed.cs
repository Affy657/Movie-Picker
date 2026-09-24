using System.Globalization;
using System.Linq;
using System.Security.Claims;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.AddMovie;
using MoviePicker.Api.Application.UseCases.AnnounceWheelWinner;
using MoviePicker.Api.Application.UseCases.Auth;
using MoviePicker.Api.Application.UseCases.CreateEvent;
using MoviePicker.Api.Application.UseCases.DeleteMovie;
using MoviePicker.Api.Application.UseCases.EventTemplates;
using MoviePicker.Api.Application.UseCases.Favorites;
using MoviePicker.Api.Application.UseCases.Follow;
using MoviePicker.Api.Application.UseCases.JoinEvent;
using MoviePicker.Api.Application.UseCases.LaunchWheel;
using MoviePicker.Api.Application.UseCases.Notifications;
using MoviePicker.Api.Application.UseCases.RecurringEvents;
using MoviePicker.Api.Application.UseCases.SeenMarks;
using MoviePicker.Api.Application.UseCases.VoteMovie;
using MoviePicker.Api.Application.UseCases.Watchlist;
using MoviePicker.Api.Domain;
using MoviePicker.Api.Domain.Entities;

namespace MoviePicker.Api.Infrastructure.Development;

internal sealed record DevelopmentSeedActors(User Dev, User Alice, User Bob, User Carla, User David, User Zoe);

internal static class DevelopmentScenarioSeed
{
    private const string ScenarioPrefix = "Scénario seed — ";

    internal const string ScenarioMultiTitle = ScenarioPrefix + "Soirée multi-participants";
    internal const string ScenarioWheelTitle = ScenarioPrefix + "Roue et clôture";
    internal const string ScenarioFullCapacityTitle = ScenarioPrefix + "Capacité atteinte";
    internal const string ScenarioRemoveParticipantsTitle = ScenarioPrefix + "Retirer / quitter (hôte = dev)";
    internal const string ScenarioWheelLaunchedTitle = ScenarioPrefix + "Roue tirée (modifications gelées)";
    internal const string ScenarioPastTitle = ScenarioPrefix + "Soirée passée (archivée)";
    internal const string ScenarioPendingTitle = ScenarioPrefix + "Soirée en suspens";
    internal const string ScenarioEmptyTitle = ScenarioPrefix + "Soirée vide (fraîche)";
    internal const string ScenarioDeletedTitle = ScenarioPrefix + "Soirée annulée";
    internal const string ScenarioVoteLimitTitle = ScenarioPrefix + "Limite de votes (un vote chacun, dev à quota)";
    internal const string ScenarioMultiWinnerTitle = ScenarioPrefix + "Marathon à trois gagnants (deux tirés)";
    internal const string ScenarioTrilogyFinishedTitle = ScenarioPrefix + "Trilogie terminée, trois gagnants";
    internal const string ScenarioRecurringTitle = ScenarioPrefix + "Ciné-club hebdomadaire (série)";

    internal const string ShowcaseLiveTitle = "Vitrine seed — En direct maintenant";
    internal const string ShowcaseNoThemeTitle = "Vitrine seed — Sans thème ni limite";
    internal const string ShowcaseFarFutureLongTitle =
        "Vitrine seed — Dans plusieurs mois avec un titre vraiment très long pour tester la troncature de la carte";
    internal const string ShowcaseJoinedOnlyTitle = "Vitrine seed — Rejointe, pas organisée";
    internal const string ShowcasePendingHostTitle = "Vitrine seed — En suspens (organisée par moi)";
    internal const string ShowcasePendingNoMovieTitle = "Vitrine seed — En suspens, aucun film proposé";
    internal const string ShowcaseFinishedThisMonthTitle = "Vitrine seed — Terminée avec gagnant (récente)";
    internal const string ShowcaseFinishedNoMovieTitle = "Vitrine seed — Terminée sans film choisi";
    internal const string ShowcaseFinishedJoinedOnlyTitle = "Vitrine seed — Terminée, rejointe seulement";

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
            await RunStepAsync(logger, "watchlists", () => TrySeedWatchlistsAsync(sp, actors, logger, ct)).ConfigureAwait(false);
            await RunStepAsync(logger, "favoris", () => TrySeedFavoritesAsync(sp, actors, logger, ct)).ConfigureAwait(false);

            await RunStepAsync(logger, "multi-participants", () => TrySeedMultiParticipantScenarioAsync(sp, actors, logger, ct)).ConfigureAwait(false);
            await RunStepAsync(logger, "wheel and closing", () => TrySeedWheelAndCloseScenarioAsync(sp, actors, logger, ct)).ConfigureAwait(false);
            await RunStepAsync(logger, "full capacity", () => TrySeedFullCapacityScenarioAsync(sp, actors, logger, ct)).ConfigureAwait(false);
            await RunStepAsync(logger, "retrait/quitter", () => TrySeedRemoveParticipantsScenarioAsync(sp, actors, logger, ct)).ConfigureAwait(false);
            await RunStepAsync(logger, "wheel spun (not closed)", () => TrySeedWheelLaunchedNotClosedScenarioAsync(sp, actors, logger, ct)).ConfigureAwait(false);
            await RunStepAsync(logger, "past movie night", () => TrySeedPastEventScenarioAsync(sp, actors, logger, ct)).ConfigureAwait(false);
            await RunStepAsync(logger, "pending movie night", () => TrySeedPendingEventScenarioAsync(sp, actors, logger, ct)).ConfigureAwait(false);
            await RunStepAsync(logger, "empty movie night", () => TrySeedEmptyEventScenarioAsync(sp, actors, logger, ct)).ConfigureAwait(false);
            await RunStepAsync(logger, "cancelled movie night", () => TrySeedDeletedEventScenarioAsync(sp, actors, logger, ct)).ConfigureAwait(false);
            await RunStepAsync(logger, "movie night templates", () => TrySeedEventTemplatesAsync(sp, actors, logger, ct)).ConfigureAwait(false);
            await RunStepAsync(logger, "limite de votes", () => TrySeedVoteLimitScenarioAsync(sp, actors, logger, ct)).ConfigureAwait(false);
            await RunStepAsync(logger, "plusieurs gagnants (en cours)", () => TrySeedMultiWinnerScenarioAsync(sp, actors, logger, ct)).ConfigureAwait(false);
            await RunStepAsync(logger, "finished trilogy", () => TrySeedTrilogyFinishedScenarioAsync(sp, actors, logger, ct)).ConfigureAwait(false);
            await RunStepAsync(logger, "weekly series", () => TrySeedRecurringSeriesScenarioAsync(sp, actors, logger, ct)).ConfigureAwait(false);
            await RunStepAsync(logger, "rappels", () => TrySeedReminderNotificationsAsync(sp, actors, logger, ct)).ConfigureAwait(false);

            await RunStepAsync(logger, "vitrine — en direct", () => TrySeedShowcaseLiveScenarioAsync(sp, actors, logger, ct)).ConfigureAwait(false);
            await RunStepAsync(logger, "showcase, no theme", () => TrySeedShowcaseNoThemeScenarioAsync(sp, actors, logger, ct)).ConfigureAwait(false);
            await RunStepAsync(logger, "vitrine — lointaine, titre long", () => TrySeedShowcaseFarFutureLongTitleScenarioAsync(sp, actors, logger, ct)).ConfigureAwait(false);
            await RunStepAsync(logger, "vitrine — rejointe seulement", () => TrySeedShowcaseJoinedOnlyScenarioAsync(sp, actors, logger, ct)).ConfigureAwait(false);
            await RunStepAsync(logger, "showcase, pending (host=dev)", () => TrySeedShowcasePendingHostScenarioAsync(sp, actors, logger, ct)).ConfigureAwait(false);
            await RunStepAsync(logger, "vitrine — en suspens, aucun film", () => TrySeedShowcasePendingNoMovieScenarioAsync(sp, actors, logger, ct)).ConfigureAwait(false);
            await RunStepAsync(logger, "showcase, recently finished", () => TrySeedShowcaseFinishedThisMonthScenarioAsync(sp, actors, logger, ct)).ConfigureAwait(false);
            await RunStepAsync(logger, "showcase, finished without a movie", () => TrySeedShowcaseFinishedNoMovieScenarioAsync(sp, actors, logger, ct)).ConfigureAwait(false);
            await RunStepAsync(logger, "showcase, finished, joined only", () => TrySeedShowcaseFinishedJoinedOnlyScenarioAsync(sp, actors, logger, ct)).ConfigureAwait(false);
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
            logger.LogError(ex, "DevelopmentSeed: step \"{Step}\" failed, skipped, startup continues.", step);
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
                AccentColor = "default",
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
                Bio = "SF, thrillers et popcorn. Watchlist masquée, pour tester le réglage.",
                IsProfilePublic = true,
                IsWatchlistPublic = false
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

        await profile.HandleAsync(
            actors.Zoe.Id,
            new PatchUserProfileRequest
            {
                UiTheme = "system",
                AccentColor = "purple",
                AvatarId = "glow",
                Bio = "Cinéphile du dimanche. Personne ne me suit : la recherche « zoe » ou « lefevre », sans accent, doit me trouver.",
                IsProfilePublic = true
            },
            ct).ConfigureAwait(false);

        await prefs.HandleAsync(
            actors.Bob.Id,
            new PatchNotificationPreferencesRequest
            {
                Preferences = [new NotificationTypePreferencePatch { Type = "movieadded", Enabled = false }]
            },
            ct).ConfigureAwait(false);

        await prefs.HandleAsync(
            actors.David.Id,
            new PatchNotificationPreferencesRequest
            {
                Preferences =
                [
                    new NotificationTypePreferencePatch { Type = "participantjoined", Enabled = false },
                    new NotificationTypePreferencePatch { Type = "eventdeleted", Enabled = false }
                ]
            },
            ct).ConfigureAwait(false);

        logger.LogInformation("DevelopmentSeed: profiles enriched (6 accounts, themes/accents/bios/visibility/preferences).");
    }

    private static async Task TrySeedWatchlistsAsync(
        IServiceProvider sp,
        DevelopmentSeedActors actors,
        ILogger logger,
        CancellationToken ct)
    {
        var watchlist = sp.GetRequiredService<IAddToWatchlistHandler>();

        (int TmdbId, string Title, string Year)[] aliceMovies =
        [
            (27205, "Inception", "2010"),
            (157336, "Interstellar", "2014"),
            (329865, "Premier Contact", "2016"),
            (438631, "Dune", "2021"),
            (872585, "Oppenheimer", "2023")
        ];
        foreach (var (tmdbId, title, year) in aliceMovies)
        {
            await watchlist
                .HandleAsync(actors.Alice.Id, new AddWatchlistItemRequest { TmdbId = tmdbId, Title = title, Year = year }, ct)
                .ConfigureAwait(false);
        }

        (int TmdbId, string Title, string Year)[] bobMovies =
        [
            (603, "Matrix", "1999"),
            (78, "Blade Runner", "1982")
        ];
        foreach (var (tmdbId, title, year) in bobMovies)
        {
            await watchlist
                .HandleAsync(actors.Bob.Id, new AddWatchlistItemRequest { TmdbId = tmdbId, Title = title, Year = year }, ct)
                .ConfigureAwait(false);
        }

        (int TmdbId, string Title, string Year)[] devMovies =
        [
            (693134, "Dune : deuxième partie", "2024"),
            (1022789, "Vice-versa 2", "2024"),
            (872585, "Oppenheimer", "2023")
        ];
        foreach (var (tmdbId, title, year) in devMovies)
        {
            await watchlist
                .HandleAsync(actors.Dev.Id, new AddWatchlistItemRequest { TmdbId = tmdbId, Title = title, Year = year }, ct)
                .ConfigureAwait(false);
        }

        (int TmdbId, string Title, string Year)[] zoeMovies =
        [
            (194, "Le Fabuleux Destin d'Amélie Poulain", "2001"),
            (77338, "Intouchables", "2011")
        ];
        foreach (var (tmdbId, title, year) in zoeMovies)
        {
            await watchlist
                .HandleAsync(actors.Zoe.Id, new AddWatchlistItemRequest { TmdbId = tmdbId, Title = title, Year = year }, ct)
                .ConfigureAwait(false);
        }

        logger.LogInformation("DevelopmentSeed: watchlists (Alice public, 5 films; Bob hidden, 2 films; dev, 3 films; Zoé public, 2 films).");
    }

    private static async Task TrySeedFavoritesAsync(
        IServiceProvider sp,
        DevelopmentSeedActors actors,
        ILogger logger,
        CancellationToken ct)
    {
        var favorites = sp.GetRequiredService<IAddFavoriteHandler>();

        AddFavoriteRequest[] aliceFavorites =
        [
            new() { TmdbId = 27205, Title = "Inception", Year = "2010" },
            new() { TmdbId = 157336, Title = "Interstellar", Year = "2014" },
            new() { TmdbId = 1920, MediaType = MovieMediaType.Tv, Title = "Twin Peaks", Year = "1990" }
        ];
        foreach (var favorite in aliceFavorites)
            await favorites.HandleAsync(actors.Alice.Id, favorite, ct).ConfigureAwait(false);

        await favorites
            .HandleAsync(actors.Zoe.Id, new AddFavoriteRequest { TmdbId = 194, Title = "Le Fabuleux Destin d'Amélie Poulain", Year = "2001" }, ct)
            .ConfigureAwait(false);

        logger.LogInformation("DevelopmentSeed: favorites (Alice three with a series, Zoé one, dev none for the invitation).");
    }

    private static async Task TrySeedFollowsAsync(
        IServiceProvider sp,
        DevelopmentSeedActors actors,
        ILogger logger,
        CancellationToken ct)
    {
        var follow = sp.GetRequiredService<IFollowUserHandler>();

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
                    "DevelopmentSeed: follow {Follower} -> {Target} skipped.",
                    follower.Handle,
                    target.Handle);
            }
        }

        logger.LogInformation("DevelopmentSeed: follow graph seeded (generates NewFollower notifications).");
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
            logger.LogInformation("DevelopmentSeed: multi-participant scenario already present, skipped.");
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
            ?? throw new InvalidOperationException("Seed: host without a participant after creating the movie night.");

        await ApplyConfigAsync(
            events,
            slug,
            new EventConfig
            {
                Theme = "Science-fiction & thrillers",
                ThemeColor = 265,
                MaxProposalsPerParticipant = 5,
                MaxParticipants = 8,
                MaxVotesPerParticipant = 2,
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

        logger.LogInformation("DevelopmentSeed: multi-participant scenario created (slug={Slug}, host Alice, 4 participants).", slug);
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
            logger.LogInformation("DevelopmentSeed: wheel and closing scenario already present, skipped.");
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
            ?? throw new InvalidOperationException("Seed: host without a participant after creating the movie night.");

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
            ?? throw new InvalidOperationException("Seed wheel movie night not found.");

        var movies = await sp.GetRequiredService<IMovieRepository>().ListByEventIdAsync(evt.Id, ct).ConfigureAwait(false);
        var scores = await votes.AggregateScoresByMovieIdsAsync(movies.Select(m => m.Id).ToList(), ct).ConfigureAwait(false);
        var winner = WheelWinnerPicker.Pick(
            movies,
            id => scores.TryGetValue(id, out var a) ? a.Score : 0,
            WheelMode.WeightedByVotes,
            Random.Shared);

        var now = DateTimeOffset.UtcNow;
        var withWinner = await events
            .UpdateAsync(CloneEvent(evt, winnerMovieId: winner.Id, updatedAt: now), ct)
            .ConfigureAwait(false);
        var closed = CloneEvent(withWinner, closedAt: now, updatedAt: now);
        await events.UpdateAsync(closed, ct).ConfigureAwait(false);

        await AddMoviePickedNotificationsAsync(sp, closed, winner.Title, ct).ConfigureAwait(false);

        logger.LogInformation(
            "DevelopmentSeed: wheel and closing scenario created (slug={Slug}, winner={WinnerId}, MoviePicked notifications).",
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
            logger.LogInformation("DevelopmentSeed: full capacity scenario already present, skipped.");
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
            ?? throw new InvalidOperationException("Seed: host without a participant after creating the movie night.");

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

        logger.LogInformation("DevelopmentSeed: full capacity scenario created (slug={Slug}, 3/3 participants, host Bob).", slug);
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
            logger.LogInformation("DevelopmentSeed: remove/leave scenario already present, skipped.");
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
            ?? throw new InvalidOperationException("Seed: host without a participant after creating the movie night.");

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

        logger.LogInformation("DevelopmentSeed: remove/leave scenario created (slug={Slug}, host=dev, participants=3).", slug);
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
            logger.LogInformation("DevelopmentSeed: wheel spun (not closed) scenario already present, skipped.");
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
            ?? throw new InvalidOperationException("Seed: host without a participant after creating the movie night.");

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
            ?? throw new InvalidOperationException("Seed wheel-spun movie night not found.");

        var movies = await sp.GetRequiredService<IMovieRepository>().ListByEventIdAsync(evt.Id, ct).ConfigureAwait(false);
        var scores = await votes.AggregateScoresByMovieIdsAsync(movies.Select(m => m.Id).ToList(), ct).ConfigureAwait(false);
        var winner = WheelWinnerPicker.Pick(
            movies,
            id => scores.TryGetValue(id, out var a) ? a.Score : 0,
            WheelMode.WeightedByVotes,
            Random.Shared);

        var withWinner = CloneEvent(evt, winnerMovieId: winner.Id, updatedAt: DateTimeOffset.UtcNow);
        await events.UpdateAsync(withWinner, ct).ConfigureAwait(false);

        logger.LogInformation("DevelopmentSeed: wheel spun (not closed) scenario created (slug={Slug}, winner={WinnerId}).", slug, winner.Id);
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
            logger.LogInformation("DevelopmentSeed: past movie night scenario already present, skipped.");
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
                    Title = ScenarioPastTitle,
                    Date = FormatDate(utc.AddDays(1)),
                    Time = "20:00"
                },
                actors.Alice.Id,
                ct)
            .ConfigureAwait(false);

        var slug = created.Slug;
        var alicePart = created.CreatorParticipant?.Id
            ?? throw new InvalidOperationException("Seed: host without a participant after creating the movie night.");

        var joinBob = await join
            .HandleAsync(slug, new JoinEventRequest { Pseudo = "Bob (compte)" }, actors.Bob.Id, ct)
            .ConfigureAwait(false);

        var m1 = await AddMovieAsync(addMovie, slug, 11, "Star Wars", "1977", alicePart, actors.Alice.Id, ct).ConfigureAwait(false);
        var m2 = await AddMovieAsync(addMovie, slug, 1891, "The Empire Strikes Back", "1980", joinBob.Participant.Id, actors.Bob.Id, ct).ConfigureAwait(false);
        var httpContext = sp.GetRequiredService<IHttpContextAccessor>();
        await VoteAsync(vote, httpContext, slug, m1.Id, joinBob.Participant.Id, actors.Bob.Id, 1, ct).ConfigureAwait(false);
        await VoteAsync(vote, httpContext, slug, m2.Id, alicePart, actors.Alice.Id, 1, ct).ConfigureAwait(false);

        var evt = await events.GetByIdOrSlugAsync(slug, ct).ConfigureAwait(false)
            ?? throw new InvalidOperationException("Seed past movie night not found.");

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
            Winners = [SeedWinner(winner.Id, utc.AddDays(-3))],
            ClosedAt = utc.AddDays(-3),
            UpdatedAt = now
        };
        await events.UpdateAsync(past, ct).ConfigureAwait(false);

        logger.LogInformation("DevelopmentSeed: past movie night scenario created (slug={Slug}, read-only).", slug);
    }

    private static async Task TrySeedPendingEventScenarioAsync(
        IServiceProvider sp,
        DevelopmentSeedActors actors,
        ILogger logger,
        CancellationToken ct)
    {
        var events = sp.GetRequiredService<IEventRepository>();
        var existing = await events.FindByCreatorAndTitleAsync(actors.Bob.Id, ScenarioPendingTitle, ct).ConfigureAwait(false);
        if (existing is not null)
        {
            logger.LogInformation("DevelopmentSeed: pending movie night scenario already present, skipped.");
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
                    Title = ScenarioPendingTitle,
                    Date = FormatDate(utc.AddDays(1)),
                    Time = "20:00"
                },
                actors.Bob.Id,
                ct)
            .ConfigureAwait(false);

        var slug = created.Slug;
        var bobPart = created.CreatorParticipant?.Id
            ?? throw new InvalidOperationException("Seed: host without a participant after creating the movie night.");

        await ApplyConfigAsync(
            events,
            slug,
            new EventConfig
            {
                Theme = "Horreur",
                ThemeColor = 0,
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

        var evt = await events.GetByIdOrSlugAsync(slug, ct).ConfigureAwait(false)
            ?? throw new InvalidOperationException("Seed pending movie night not found.");

        var startedParis = TimeZoneInfo.ConvertTime(utc.AddHours(-3), EventSchedule.ParisTimeZone);
        var now = DateTimeOffset.UtcNow;
        var pending = evt with
        {
            Date = startedParis.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture),
            Time = startedParis.ToString("HH:mm", CultureInfo.InvariantCulture),
            UpdatedAt = now
        };
        await events.UpdateAsync(pending, ct).ConfigureAwait(false);

        logger.LogInformation("DevelopmentSeed: pending movie night scenario created (slug={Slug}, started -3h, no movie picked).", slug);
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
            logger.LogInformation("DevelopmentSeed: empty movie night scenario already present, skipped.");
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

        logger.LogInformation("DevelopmentSeed: empty movie night scenario created (slug={Slug}, no movie).", created.Slug);
    }

    private static async Task TrySeedDeletedEventScenarioAsync(
        IServiceProvider sp,
        DevelopmentSeedActors actors,
        ILogger logger,
        CancellationToken ct)
    {
        var notifs = sp.GetRequiredService<IUserNotificationRepository>();
        var devInbox = await notifs.ListByUserIdAsync(actors.Dev.Id, 50, offset: 0, ct: ct).ConfigureAwait(false);
        if (devInbox.Any(n => n.Type == UserNotificationType.EventDeleted
            && string.Equals(n.EventTitle, ScenarioDeletedTitle, StringComparison.Ordinal)))
        {
            logger.LogInformation("DevelopmentSeed: cancelled movie night scenario already present, skipped.");
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
            ?? throw new InvalidOperationException("Seed cancelled movie night not found.");

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
            foreach (var u in recipients.Where(u => u.NotifiesOn(UserNotificationType.EventDeleted)))
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

        await votesRepo.DeleteByEventIdAsync(evt.Id, ct).ConfigureAwait(false);
        await seenRepo.DeleteByEventIdAsync(evt.Id, ct).ConfigureAwait(false);
        await moviesRepo.DeleteByEventIdAsync(evt.Id, ct).ConfigureAwait(false);
        await participantsRepo.DeleteByEventIdAsync(evt.Id, ct).ConfigureAwait(false);
        await events.DeleteAsync(evt.Id, ct).ConfigureAwait(false);

        logger.LogInformation("DevelopmentSeed: cancelled movie night scenario created (EventDeleted notifications, movie night deleted).");
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
            logger.LogInformation("DevelopmentSeed: no upcoming movie night for reminders, skipped.");
            return;
        }

        if (await notifs.ExistsAsync(actors.Dev.Id, UserNotificationType.EventReminder24h, target.Id, ct).ConfigureAwait(false))
        {
            logger.LogInformation("DevelopmentSeed: reminders already present, skipped.");
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

        logger.LogInformation("DevelopmentSeed: reminders (24h + 1h) added for movie night {Slug}.", target.Slug);
    }

    private static async Task TrySeedShowcaseLiveScenarioAsync(
        IServiceProvider sp,
        DevelopmentSeedActors actors,
        ILogger logger,
        CancellationToken ct)
    {
        var events = sp.GetRequiredService<IEventRepository>();
        var existing = await events.FindByCreatorAndTitleAsync(actors.Dev.Id, ShowcaseLiveTitle, ct).ConfigureAwait(false);
        if (existing is not null)
        {
            logger.LogInformation("DevelopmentSeed: live showcase already present, skipped.");
            return;
        }

        var create = sp.GetRequiredService<ICreateEventHandler>();
        var join = sp.GetRequiredService<IJoinEventHandler>();
        var addMovie = sp.GetRequiredService<IAddMovieHandler>();

        var utc = DateTimeOffset.UtcNow;
        var startedParis = TimeZoneInfo.ConvertTime(utc.AddMinutes(-30), EventSchedule.ParisTimeZone);
        var created = await create
            .HandleAsync(
                new CreateEventRequest
                {
                    Title = ShowcaseLiveTitle,
                    Date = startedParis.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture),
                    Time = startedParis.ToString("HH:mm", CultureInfo.InvariantCulture)
                },
                actors.Dev.Id,
                ct)
            .ConfigureAwait(false);

        var slug = created.Slug;
        var devPart = created.CreatorParticipant?.Id
            ?? throw new InvalidOperationException("Seed: host without a participant after creating the movie night.");

        await ApplyConfigAsync(
            events,
            slug,
            new EventConfig { Theme = "Comédie", MaxProposalsPerParticipant = 4, WheelMode = WheelMode.WeightedByVotes },
            ct).ConfigureAwait(false);

        var joinAlice = await join
            .HandleAsync(slug, new JoinEventRequest { Pseudo = "Alice invitée" }, actors.Alice.Id, ct)
            .ConfigureAwait(false);

        await AddMovieAsync(addMovie, slug, 105, "Back to the Future", "1985", devPart, actors.Dev.Id, ct).ConfigureAwait(false);
        await AddMovieAsync(addMovie, slug, 13, "Forrest Gump", "1994", joinAlice.Participant.Id, actors.Alice.Id, ct).ConfigureAwait(false);

        logger.LogInformation("DevelopmentSeed: live showcase created (slug={Slug}, host=dev, started 30 min ago).", slug);
    }

    private static async Task TrySeedShowcaseNoThemeScenarioAsync(
        IServiceProvider sp,
        DevelopmentSeedActors actors,
        ILogger logger,
        CancellationToken ct)
    {
        var events = sp.GetRequiredService<IEventRepository>();
        var existing = await events.FindByCreatorAndTitleAsync(actors.Dev.Id, ShowcaseNoThemeTitle, ct).ConfigureAwait(false);
        if (existing is not null)
        {
            logger.LogInformation("DevelopmentSeed: no-theme showcase already present, skipped.");
            return;
        }

        var create = sp.GetRequiredService<ICreateEventHandler>();
        var utc = DateTimeOffset.UtcNow;
        var created = await create
            .HandleAsync(
                new CreateEventRequest
                {
                    Title = ShowcaseNoThemeTitle,
                    Date = FormatDate(utc.AddDays(5)),
                    Time = "18:45"
                },
                actors.Dev.Id,
                ct)
            .ConfigureAwait(false);

        logger.LogInformation("DevelopmentSeed: no-theme showcase created (slug={Slug}, no config).", created.Slug);
    }

    private static async Task TrySeedShowcaseFarFutureLongTitleScenarioAsync(
        IServiceProvider sp,
        DevelopmentSeedActors actors,
        ILogger logger,
        CancellationToken ct)
    {
        var events = sp.GetRequiredService<IEventRepository>();
        var existing = await events.FindByCreatorAndTitleAsync(actors.Dev.Id, ShowcaseFarFutureLongTitle, ct).ConfigureAwait(false);
        if (existing is not null)
        {
            logger.LogInformation("DevelopmentSeed: far-away, long-title showcase already present, skipped.");
            return;
        }

        var create = sp.GetRequiredService<ICreateEventHandler>();
        var utc = DateTimeOffset.UtcNow;
        var created = await create
            .HandleAsync(
                new CreateEventRequest
                {
                    Title = ShowcaseFarFutureLongTitle,
                    Date = FormatDate(utc.AddDays(95)),
                    Time = "19:00"
                },
                actors.Dev.Id,
                ct)
            .ConfigureAwait(false);

        await ApplyConfigAsync(
            events,
            created.Slug,
            new EventConfig { Theme = "Rétrospective — cinéma muet et premiers essais couleur", MaxParticipants = 4 },
            ct).ConfigureAwait(false);

        logger.LogInformation("DevelopmentSeed: far-away, long-title showcase created (slug={Slug}, +95 days).", created.Slug);
    }

    private static async Task TrySeedShowcaseJoinedOnlyScenarioAsync(
        IServiceProvider sp,
        DevelopmentSeedActors actors,
        ILogger logger,
        CancellationToken ct)
    {
        var events = sp.GetRequiredService<IEventRepository>();
        var existing = await events.FindByCreatorAndTitleAsync(actors.Alice.Id, ShowcaseJoinedOnlyTitle, ct).ConfigureAwait(false);
        if (existing is not null)
        {
            logger.LogInformation("DevelopmentSeed: joined-only showcase already present, skipped.");
            return;
        }

        var create = sp.GetRequiredService<ICreateEventHandler>();
        var join = sp.GetRequiredService<IJoinEventHandler>();

        var utc = DateTimeOffset.UtcNow;
        var created = await create
            .HandleAsync(
                new CreateEventRequest
                {
                    Title = ShowcaseJoinedOnlyTitle,
                    Date = FormatDate(utc.AddDays(2)),
                    Time = "20:15"
                },
                actors.Alice.Id,
                ct)
            .ConfigureAwait(false);

        var slug = created.Slug;
        await ApplyConfigAsync(
            events,
            slug,
            new EventConfig { Theme = "Comédie romantique" },
            ct).ConfigureAwait(false);

        await join.HandleAsync(slug, new JoinEventRequest { Pseudo = "Dev invité" }, actors.Dev.Id, ct).ConfigureAwait(false);

        logger.LogInformation("DevelopmentSeed: joined-only showcase created (slug={Slug}, host=Alice, dev=participant).", slug);
    }

    private static async Task TrySeedShowcasePendingHostScenarioAsync(
        IServiceProvider sp,
        DevelopmentSeedActors actors,
        ILogger logger,
        CancellationToken ct)
    {
        var events = sp.GetRequiredService<IEventRepository>();
        var existing = await events.FindByCreatorAndTitleAsync(actors.Dev.Id, ShowcasePendingHostTitle, ct).ConfigureAwait(false);
        if (existing is not null)
        {
            logger.LogInformation("DevelopmentSeed: pending (host=dev) showcase already present, skipped.");
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
                    Title = ShowcasePendingHostTitle,
                    Date = FormatDate(utc.AddDays(1)),
                    Time = "20:00"
                },
                actors.Dev.Id,
                ct)
            .ConfigureAwait(false);

        var slug = created.Slug;
        var devPart = created.CreatorParticipant?.Id
            ?? throw new InvalidOperationException("Seed: host without a participant after creating the movie night.");

        await ApplyConfigAsync(
            events,
            slug,
            new EventConfig { Theme = "Thriller", MaxProposalsPerParticipant = 3, MaxParticipants = 5 },
            ct).ConfigureAwait(false);

        var joinBob = await join
            .HandleAsync(slug, new JoinEventRequest { Pseudo = "Bob invité" }, actors.Bob.Id, ct)
            .ConfigureAwait(false);

        await AddMovieAsync(addMovie, slug, 807, "Se7en", "1995", devPart, actors.Dev.Id, ct).ConfigureAwait(false);
        await AddMovieAsync(addMovie, slug, 274, "The Silence of the Lambs", "1991", joinBob.Participant.Id, actors.Bob.Id, ct).ConfigureAwait(false);

        var evt = await events.GetByIdOrSlugAsync(slug, ct).ConfigureAwait(false)
            ?? throw new InvalidOperationException("Pending showcase movie night not found.");

        var startedParis = TimeZoneInfo.ConvertTime(utc.AddHours(-3), EventSchedule.ParisTimeZone);
        var now = DateTimeOffset.UtcNow;
        var pending = evt with
        {
            Date = startedParis.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture),
            Time = startedParis.ToString("HH:mm", CultureInfo.InvariantCulture),
            UpdatedAt = now
        };
        await events.UpdateAsync(pending, ct).ConfigureAwait(false);

        logger.LogInformation("DevelopmentSeed: pending (host=dev) showcase created (slug={Slug}, started -3h).", slug);
    }

    private static async Task TrySeedShowcasePendingNoMovieScenarioAsync(
        IServiceProvider sp,
        DevelopmentSeedActors actors,
        ILogger logger,
        CancellationToken ct)
    {
        var events = sp.GetRequiredService<IEventRepository>();
        var existing = await events.FindByCreatorAndTitleAsync(actors.Dev.Id, ShowcasePendingNoMovieTitle, ct).ConfigureAwait(false);
        if (existing is not null)
        {
            logger.LogInformation("DevelopmentSeed: pending, no-movie showcase already present, skipped.");
            return;
        }

        var create = sp.GetRequiredService<ICreateEventHandler>();
        var join = sp.GetRequiredService<IJoinEventHandler>();

        var utc = DateTimeOffset.UtcNow;
        var created = await create
            .HandleAsync(
                new CreateEventRequest
                {
                    Title = ShowcasePendingNoMovieTitle,
                    Date = FormatDate(utc.AddDays(1)),
                    Time = "20:00"
                },
                actors.Dev.Id,
                ct)
            .ConfigureAwait(false);

        var slug = created.Slug;

        await ApplyConfigAsync(
            events,
            slug,
            new EventConfig { Theme = "Au choix", MaxParticipants = 6 },
            ct).ConfigureAwait(false);

        await join.HandleAsync(slug, new JoinEventRequest { Pseudo = "Bob invité" }, actors.Bob.Id, ct).ConfigureAwait(false);

        var evt = await events.GetByIdOrSlugAsync(slug, ct).ConfigureAwait(false)
            ?? throw new InvalidOperationException("Pending, no-movie showcase movie night not found.");

        var startedParis = TimeZoneInfo.ConvertTime(utc.AddHours(-3), EventSchedule.ParisTimeZone);
        var now = DateTimeOffset.UtcNow;
        var pending = evt with
        {
            Date = startedParis.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture),
            Time = startedParis.ToString("HH:mm", CultureInfo.InvariantCulture),
            UpdatedAt = now
        };
        await events.UpdateAsync(pending, ct).ConfigureAwait(false);

        logger.LogInformation("DevelopmentSeed: pending, no-movie showcase created (slug={Slug}, started -3h, 0 proposal).", slug);
    }

    private static async Task TrySeedShowcaseFinishedThisMonthScenarioAsync(
        IServiceProvider sp,
        DevelopmentSeedActors actors,
        ILogger logger,
        CancellationToken ct)
    {
        var events = sp.GetRequiredService<IEventRepository>();
        var existing = await events.FindByCreatorAndTitleAsync(actors.Dev.Id, ShowcaseFinishedThisMonthTitle, ct).ConfigureAwait(false);
        if (existing is not null)
        {
            logger.LogInformation("DevelopmentSeed: recently finished showcase already present, skipped.");
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
                    Title = ShowcaseFinishedThisMonthTitle,
                    Date = FormatDate(utc.AddDays(1)),
                    Time = "20:00"
                },
                actors.Dev.Id,
                ct)
            .ConfigureAwait(false);

        var slug = created.Slug;
        var devPart = created.CreatorParticipant?.Id
            ?? throw new InvalidOperationException("Seed: host without a participant after creating the movie night.");

        var joinAlice = await join
            .HandleAsync(slug, new JoinEventRequest { Pseudo = "Alice invitée" }, actors.Alice.Id, ct)
            .ConfigureAwait(false);

        var winnerMovie = await AddMovieAsync(addMovie, slug, 155, "The Dark Knight", "2008", devPart, actors.Dev.Id, ct).ConfigureAwait(false);
        await AddMovieAsync(addMovie, slug, 496243, "Parasite", "2019", joinAlice.Participant.Id, actors.Alice.Id, ct).ConfigureAwait(false);

        var evt = await events.GetByIdOrSlugAsync(slug, ct).ConfigureAwait(false)
            ?? throw new InvalidOperationException("Recently finished showcase movie night not found.");

        var now = DateTimeOffset.UtcNow;
        var closedDate = utc.AddDays(-5);
        var finished = evt with
        {
            Date = FormatDate(closedDate),
            Time = "20:00",
            Winners = [SeedWinner(winnerMovie.Id, closedDate)],
            ClosedAt = closedDate,
            UpdatedAt = now
        };
        await events.UpdateAsync(finished, ct).ConfigureAwait(false);

        logger.LogInformation("DevelopmentSeed: recently finished showcase created (slug={Slug}, 5 days ago, winner={WinnerId}).", slug, winnerMovie.Id);
    }

    private static async Task TrySeedShowcaseFinishedNoMovieScenarioAsync(
        IServiceProvider sp,
        DevelopmentSeedActors actors,
        ILogger logger,
        CancellationToken ct)
    {
        var events = sp.GetRequiredService<IEventRepository>();
        var existing = await events.FindByCreatorAndTitleAsync(actors.Dev.Id, ShowcaseFinishedNoMovieTitle, ct).ConfigureAwait(false);
        if (existing is not null)
        {
            logger.LogInformation("DevelopmentSeed: finished-without-movie showcase already present, skipped.");
            return;
        }

        var create = sp.GetRequiredService<ICreateEventHandler>();
        var utc = DateTimeOffset.UtcNow;
        var created = await create
            .HandleAsync(
                new CreateEventRequest
                {
                    Title = ShowcaseFinishedNoMovieTitle,
                    Date = FormatDate(utc.AddDays(1)),
                    Time = "20:00"
                },
                actors.Dev.Id,
                ct)
            .ConfigureAwait(false);

        var slug = created.Slug;
        var evt = await events.GetByIdOrSlugAsync(slug, ct).ConfigureAwait(false)
            ?? throw new InvalidOperationException("Finished-without-movie showcase movie night not found.");

        var now = DateTimeOffset.UtcNow;
        var closedDate = utc.AddDays(-62);
        var finished = evt with
        {
            Date = FormatDate(closedDate),
            Time = "20:00",
            ClosedAt = closedDate,
            UpdatedAt = now
        };
        await events.UpdateAsync(finished, ct).ConfigureAwait(false);

        logger.LogInformation("DevelopmentSeed: finished-without-movie showcase created (slug={Slug}, 2 months ago, no winner).", slug);
    }

    private static async Task TrySeedShowcaseFinishedJoinedOnlyScenarioAsync(
        IServiceProvider sp,
        DevelopmentSeedActors actors,
        ILogger logger,
        CancellationToken ct)
    {
        var events = sp.GetRequiredService<IEventRepository>();
        var existing = await events.FindByCreatorAndTitleAsync(actors.Carla.Id, ShowcaseFinishedJoinedOnlyTitle, ct).ConfigureAwait(false);
        if (existing is not null)
        {
            logger.LogInformation("DevelopmentSeed: finished, joined-only showcase already present, skipped.");
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
                    Title = ShowcaseFinishedJoinedOnlyTitle,
                    Date = FormatDate(utc.AddDays(1)),
                    Time = "19:30"
                },
                actors.Carla.Id,
                ct)
            .ConfigureAwait(false);

        var slug = created.Slug;
        var carlaPart = created.CreatorParticipant?.Id
            ?? throw new InvalidOperationException("Seed: host without a participant after creating the movie night.");

        var joinDev = await join
            .HandleAsync(slug, new JoinEventRequest { Pseudo = "Dev invité" }, actors.Dev.Id, ct)
            .ConfigureAwait(false);

        var winnerMovie = await AddMovieAsync(addMovie, slug, 424, "Schindler's List", "1993", carlaPart, actors.Carla.Id, ct).ConfigureAwait(false);
        await AddMovieAsync(addMovie, slug, 129, "Spirited Away", "2001", joinDev.Participant.Id, actors.Dev.Id, ct).ConfigureAwait(false);

        var evt = await events.GetByIdOrSlugAsync(slug, ct).ConfigureAwait(false)
            ?? throw new InvalidOperationException("Finished, joined-only showcase movie night not found.");

        var now = DateTimeOffset.UtcNow;
        var closedDate = utc.AddDays(-124);
        var finished = evt with
        {
            Date = FormatDate(closedDate),
            Time = "19:30",
            Winners = [SeedWinner(winnerMovie.Id, closedDate)],
            ClosedAt = closedDate,
            UpdatedAt = now
        };
        await events.UpdateAsync(finished, ct).ConfigureAwait(false);

        logger.LogInformation("DevelopmentSeed: finished, joined-only showcase created (slug={Slug}, host=Carla, dev=participant, 4 months ago).", slug);
    }

    private static async Task TrySeedEventTemplatesAsync(
        IServiceProvider sp,
        DevelopmentSeedActors actors,
        ILogger logger,
        CancellationToken ct)
    {
        var list = sp.GetRequiredService<IListEventTemplatesHandler>();
        var create = sp.GetRequiredService<ICreateEventTemplateHandler>();

        var devTemplates = new SaveEventTemplateRequest[]
        {
            new()
            {
                Name = "Ciné-club du vendredi",
                Theme = "Un classique par semaine",
                MaxProposalsPerParticipant = 3,
                MaxParticipants = 8,
                MaxVotesPerParticipant = 2,
                WheelMode = WheelMode.WeightedByVotes,
                RichSharePreview = true,
                AllowSeries = false,
                WinnerCount = 1
            },
            new()
            {
                Name = "Marathon du samedi",
                Theme = "Trois films d'affilée",
                MaxProposalsPerParticipant = 5,
                MaxParticipants = 12,
                WheelMode = WheelMode.StrictRandom,
                RichSharePreview = true,
                AllowSeries = false,
                WinnerCount = 3
            },
            new()
            {
                Name = "Séries en famille",
                Theme = "Un épisode ou deux",
                MaxProposalsPerParticipant = 2,
                MaxParticipants = 6,
                WheelMode = WheelMode.WeightedByVotes,
                RichSharePreview = false,
                AllowSeries = true,
                WinnerCount = 1
            }
        };
        var aliceTemplates = new SaveEventTemplateRequest[]
        {
            new()
            {
                Name = "Comédies entre amis",
                Theme = "Comédie & feel-good",
                MaxProposalsPerParticipant = 4,
                MaxParticipants = 10,
                MaxVotesPerParticipant = 3,
                WheelMode = WheelMode.WeightedByVotes,
                RichSharePreview = true,
                AllowSeries = false,
                WinnerCount = 1
            }
        };

        var created = 0;
        foreach (var (owner, templates) in new[] { (actors.Dev, devTemplates), (actors.Alice, aliceTemplates) })
        {
            var existing = (await list.HandleAsync(owner.Id, ct).ConfigureAwait(false)).Items
                .Select(t => t.Name)
                .ToHashSet(StringComparer.OrdinalIgnoreCase);
            foreach (var template in templates.Where(t => !existing.Contains(t.Name!)))
            {
                await create.HandleAsync(owner.Id, template, ct).ConfigureAwait(false);
                created++;
            }
        }

        logger.LogInformation("DevelopmentSeed: movie night templates (dev 3, Alice 1, {Created} created).", created);
    }

    private static async Task TrySeedVoteLimitScenarioAsync(
        IServiceProvider sp,
        DevelopmentSeedActors actors,
        ILogger logger,
        CancellationToken ct)
    {
        var events = sp.GetRequiredService<IEventRepository>();
        var existing = await events.FindByCreatorAndTitleAsync(actors.Bob.Id, ScenarioVoteLimitTitle, ct).ConfigureAwait(false);
        if (existing is not null)
        {
            logger.LogInformation("DevelopmentSeed: vote limit scenario already present, skipped.");
            return;
        }

        var create = sp.GetRequiredService<ICreateEventHandler>();
        var join = sp.GetRequiredService<IJoinEventHandler>();
        var addMovie = sp.GetRequiredService<IAddMovieHandler>();
        var vote = sp.GetRequiredService<IVoteMovieHandler>();
        var httpContext = sp.GetRequiredService<IHttpContextAccessor>();

        var utc = DateTimeOffset.UtcNow;
        var created = await create
            .HandleAsync(
                new CreateEventRequest
                {
                    Title = ScenarioVoteLimitTitle,
                    Date = FormatDate(utc.AddDays(3)),
                    Time = "21:00"
                },
                actors.Bob.Id,
                ct)
            .ConfigureAwait(false);

        var slug = created.Slug;
        var bobPart = created.CreatorParticipant?.Id
            ?? throw new InvalidOperationException("Seed: host without a participant after creating the movie night.");

        await ApplyConfigAsync(
            events,
            slug,
            new EventConfig
            {
                Theme = "Un seul vote chacun",
                ThemeColor = 200,
                MaxProposalsPerParticipant = 2,
                MaxParticipants = 6,
                MaxVotesPerParticipant = 1,
                WheelMode = WheelMode.WeightedByVotes,
                RichSharePreview = true
            },
            ct).ConfigureAwait(false);

        var joinDev = await join
            .HandleAsync(slug, new JoinEventRequest { Pseudo = "Dev invité" }, actors.Dev.Id, ct)
            .ConfigureAwait(false);
        var joinAlice = await join
            .HandleAsync(slug, new JoinEventRequest { Pseudo = "Alice invitée" }, actors.Alice.Id, ct)
            .ConfigureAwait(false);
        var joinZoe = await join
            .HandleAsync(slug, new JoinEventRequest { Pseudo = "Zoé invitée" }, actors.Zoe.Id, ct)
            .ConfigureAwait(false);
        var devPart = joinDev.Participant.Id;
        var alicePart = joinAlice.Participant.Id;

        await AddMovieAsync(addMovie, slug, 289, "Casablanca", "1942", bobPart, actors.Bob.Id, ct).ConfigureAwait(false);
        var mDev = await AddMovieAsync(addMovie, slug, 238, "The Godfather", "1972", devPart, actors.Dev.Id, ct).ConfigureAwait(false);
        var mAlice = await AddMovieAsync(addMovie, slug, 278, "The Shawshank Redemption", "1994", alicePart, actors.Alice.Id, ct).ConfigureAwait(false);
        await AddMovieAsync(addMovie, slug, 497, "The Green Mile", "1999", joinZoe.Participant.Id, actors.Zoe.Id, ct).ConfigureAwait(false);

        await VoteAsync(vote, httpContext, slug, mAlice.Id, devPart, actors.Dev.Id, 1, ct).ConfigureAwait(false);
        await VoteAsync(vote, httpContext, slug, mDev.Id, alicePart, actors.Alice.Id, 1, ct).ConfigureAwait(false);

        logger.LogInformation("DevelopmentSeed: vote limit scenario created (slug={Slug}, host Bob, 1 vote per participant, dev and Alice at quota).", slug);
    }

    private static async Task TrySeedMultiWinnerScenarioAsync(
        IServiceProvider sp,
        DevelopmentSeedActors actors,
        ILogger logger,
        CancellationToken ct)
    {
        var events = sp.GetRequiredService<IEventRepository>();
        var existing = await events.FindByCreatorAndTitleAsync(actors.Dev.Id, ScenarioMultiWinnerTitle, ct).ConfigureAwait(false);
        if (existing is not null)
        {
            logger.LogInformation("DevelopmentSeed: multiple winners scenario already present, skipped.");
            return;
        }

        var create = sp.GetRequiredService<ICreateEventHandler>();
        var join = sp.GetRequiredService<IJoinEventHandler>();
        var addMovie = sp.GetRequiredService<IAddMovieHandler>();
        var vote = sp.GetRequiredService<IVoteMovieHandler>();
        var launchWheel = sp.GetRequiredService<ILaunchWheelHandler>();
        var announce = sp.GetRequiredService<IAnnounceWheelWinnerHandler>();
        var httpContext = sp.GetRequiredService<IHttpContextAccessor>();

        var utc = DateTimeOffset.UtcNow;
        var created = await create
            .HandleAsync(
                new CreateEventRequest
                {
                    Title = ScenarioMultiWinnerTitle,
                    Date = FormatDate(utc.AddDays(2)),
                    Time = "18:00"
                },
                actors.Dev.Id,
                ct)
            .ConfigureAwait(false);

        var slug = created.Slug;
        var devPart = created.CreatorParticipant?.Id
            ?? throw new InvalidOperationException("Seed: host without a participant after creating the movie night.");

        await ApplyConfigAsync(
            events,
            slug,
            new EventConfig
            {
                Theme = "Marathon années 80",
                ThemeColor = 30,
                MaxProposalsPerParticipant = 4,
                MaxParticipants = 8,
                WheelMode = WheelMode.WeightedByVotes,
                RichSharePreview = true,
                WinnerCount = 3
            },
            ct).ConfigureAwait(false);

        var joinAlice = await join
            .HandleAsync(slug, new JoinEventRequest { Pseudo = "Alice invitée" }, actors.Alice.Id, ct)
            .ConfigureAwait(false);
        var joinBob = await join
            .HandleAsync(slug, new JoinEventRequest { Pseudo = "Bob invité" }, actors.Bob.Id, ct)
            .ConfigureAwait(false);
        var joinDavid = await join
            .HandleAsync(slug, new JoinEventRequest { Pseudo = "David invité" }, actors.David.Id, ct)
            .ConfigureAwait(false);
        var alicePart = joinAlice.Participant.Id;
        var bobPart = joinBob.Participant.Id;
        var davidPart = joinDavid.Participant.Id;

        var mBttf = await AddMovieAsync(addMovie, slug, 105, "Back to the Future", "1985", devPart, actors.Dev.Id, ct).ConfigureAwait(false);
        var mGhost = await AddMovieAsync(addMovie, slug, 620, "Ghostbusters", "1984", devPart, actors.Dev.Id, ct).ConfigureAwait(false);
        var mDieHard = await AddMovieAsync(addMovie, slug, 562, "Die Hard", "1988", alicePart, actors.Alice.Id, ct).ConfigureAwait(false);
        await AddMovieAsync(addMovie, slug, 601, "E.T. the Extra-Terrestrial", "1982", alicePart, actors.Alice.Id, ct).ConfigureAwait(false);
        var mTerminator = await AddMovieAsync(addMovie, slug, 218, "The Terminator", "1984", bobPart, actors.Bob.Id, ct).ConfigureAwait(false);
        var mAliens = await AddMovieAsync(addMovie, slug, 679, "Aliens", "1986", davidPart, actors.David.Id, ct).ConfigureAwait(false);

        await VoteAsync(vote, httpContext, slug, mBttf.Id, alicePart, actors.Alice.Id, 1, ct).ConfigureAwait(false);
        await VoteAsync(vote, httpContext, slug, mBttf.Id, bobPart, actors.Bob.Id, 1, ct).ConfigureAwait(false);
        await VoteAsync(vote, httpContext, slug, mDieHard.Id, davidPart, actors.David.Id, 1, ct).ConfigureAwait(false);
        await VoteAsync(vote, httpContext, slug, mTerminator.Id, devPart, actors.Dev.Id, 1, ct).ConfigureAwait(false);
        await VoteAsync(vote, httpContext, slug, mAliens.Id, devPart, actors.Dev.Id, 1, ct).ConfigureAwait(false);
        await VoteAsync(vote, httpContext, slug, mGhost.Id, alicePart, actors.Alice.Id, -1, ct).ConfigureAwait(false);

        ActAs(httpContext, actors.Dev.Id);
        await launchWheel.HandleAsync(slug, ct).ConfigureAwait(false);
        await launchWheel.HandleAsync(slug, ct).ConfigureAwait(false);
        await announce.HandleAsync(slug, ct).ConfigureAwait(false);

        logger.LogInformation("DevelopmentSeed: multiple winners scenario created (slug={Slug}, host=dev, 2 winners drawn out of 3, announced).", slug);
    }

    private static async Task TrySeedTrilogyFinishedScenarioAsync(
        IServiceProvider sp,
        DevelopmentSeedActors actors,
        ILogger logger,
        CancellationToken ct)
    {
        var events = sp.GetRequiredService<IEventRepository>();
        var existing = await events.FindByCreatorAndTitleAsync(actors.Alice.Id, ScenarioTrilogyFinishedTitle, ct).ConfigureAwait(false);
        if (existing is not null)
        {
            logger.LogInformation("DevelopmentSeed: finished trilogy scenario already present, skipped.");
            return;
        }

        var create = sp.GetRequiredService<ICreateEventHandler>();
        var join = sp.GetRequiredService<IJoinEventHandler>();
        var addMovie = sp.GetRequiredService<IAddMovieHandler>();
        var vote = sp.GetRequiredService<IVoteMovieHandler>();
        var httpContext = sp.GetRequiredService<IHttpContextAccessor>();

        var utc = DateTimeOffset.UtcNow;
        var created = await create
            .HandleAsync(
                new CreateEventRequest
                {
                    Title = ScenarioTrilogyFinishedTitle,
                    Date = FormatDate(utc.AddDays(1)),
                    Time = "19:00"
                },
                actors.Alice.Id,
                ct)
            .ConfigureAwait(false);

        var slug = created.Slug;
        var alicePart = created.CreatorParticipant?.Id
            ?? throw new InvalidOperationException("Seed: host without a participant after creating the movie night.");

        await ApplyConfigAsync(
            events,
            slug,
            new EventConfig
            {
                Theme = "Trilogie du Seigneur des anneaux",
                ThemeColor = 120,
                MaxProposalsPerParticipant = 2,
                MaxParticipants = 6,
                WheelMode = WheelMode.StrictRandom,
                RichSharePreview = true,
                WinnerCount = 3
            },
            ct).ConfigureAwait(false);

        var joinDev = await join
            .HandleAsync(slug, new JoinEventRequest { Pseudo = "Dev invité" }, actors.Dev.Id, ct)
            .ConfigureAwait(false);
        var joinBob = await join
            .HandleAsync(slug, new JoinEventRequest { Pseudo = "Bob invité" }, actors.Bob.Id, ct)
            .ConfigureAwait(false);
        var devPart = joinDev.Participant.Id;
        var bobPart = joinBob.Participant.Id;

        var mFellowship = await AddMovieAsync(addMovie, slug, 120, "The Lord of the Rings: The Fellowship of the Ring", "2001", alicePart, actors.Alice.Id, ct).ConfigureAwait(false);
        var mTowers = await AddMovieAsync(addMovie, slug, 121, "The Lord of the Rings: The Two Towers", "2002", devPart, actors.Dev.Id, ct).ConfigureAwait(false);
        var mReturn = await AddMovieAsync(addMovie, slug, 122, "The Lord of the Rings: The Return of the King", "2003", bobPart, actors.Bob.Id, ct).ConfigureAwait(false);
        await AddMovieAsync(addMovie, slug, 49051, "The Hobbit: An Unexpected Journey", "2012", devPart, actors.Dev.Id, ct).ConfigureAwait(false);

        await VoteAsync(vote, httpContext, slug, mFellowship.Id, devPart, actors.Dev.Id, 1, ct).ConfigureAwait(false);
        await VoteAsync(vote, httpContext, slug, mTowers.Id, bobPart, actors.Bob.Id, 1, ct).ConfigureAwait(false);
        await VoteAsync(vote, httpContext, slug, mReturn.Id, alicePart, actors.Alice.Id, 1, ct).ConfigureAwait(false);

        var evt = await events.GetByIdOrSlugAsync(slug, ct).ConfigureAwait(false)
            ?? throw new InvalidOperationException("Seed trilogy movie night not found.");

        var closedDate = utc.AddDays(-10);
        var finished = evt with
        {
            Date = FormatDate(closedDate),
            Time = "19:00",
            Winners =
            [
                SeedWinner(mFellowship.Id, closedDate.AddMinutes(30)),
                SeedWinner(mTowers.Id, closedDate.AddMinutes(32)),
                SeedWinner(mReturn.Id, closedDate.AddMinutes(35), WinnerPickMethod.Manual)
            ],
            WinnerAnnouncedAt = closedDate.AddMinutes(35),
            ClosedAt = closedDate.AddHours(4),
            UpdatedAt = DateTimeOffset.UtcNow
        };
        await events.UpdateAsync(finished, ct).ConfigureAwait(false);

        logger.LogInformation("DevelopmentSeed: finished trilogy scenario created (slug={Slug}, host Alice, 3 winners, 10 days ago).", slug);
    }

    private static async Task TrySeedRecurringSeriesScenarioAsync(
        IServiceProvider sp,
        DevelopmentSeedActors actors,
        ILogger logger,
        CancellationToken ct)
    {
        var events = sp.GetRequiredService<IEventRepository>();
        var existing = await events.FindByCreatorAndTitleAsync(actors.Dev.Id, ScenarioRecurringTitle, ct).ConfigureAwait(false);
        if (existing is not null)
        {
            logger.LogInformation("DevelopmentSeed: weekly series scenario already present, skipped.");
            return;
        }

        var create = sp.GetRequiredService<ICreateEventHandler>();
        var join = sp.GetRequiredService<IJoinEventHandler>();
        var addMovie = sp.GetRequiredService<IAddMovieHandler>();
        var vote = sp.GetRequiredService<IVoteMovieHandler>();
        var votes = sp.GetRequiredService<IVoteRepository>();
        var pass = sp.GetRequiredService<IRecurringEventPass>();
        var httpContext = sp.GetRequiredService<IHttpContextAccessor>();

        var utc = DateTimeOffset.UtcNow;
        var created = await create
            .HandleAsync(
                new CreateEventRequest
                {
                    Title = ScenarioRecurringTitle,
                    Date = FormatDate(utc.AddDays(1)),
                    Time = "20:30"
                },
                actors.Dev.Id,
                ct)
            .ConfigureAwait(false);

        var slug = created.Slug;
        var devPart = created.CreatorParticipant?.Id
            ?? throw new InvalidOperationException("Seed: host without a participant after creating the movie night.");

        await ApplyConfigAsync(
            events,
            slug,
            new EventConfig
            {
                Theme = "Un classique par semaine",
                ThemeColor = 330,
                MaxProposalsPerParticipant = 3,
                MaxParticipants = 8,
                MaxVotesPerParticipant = 2,
                WheelMode = WheelMode.WeightedByVotes,
                RichSharePreview = true
            },
            ct).ConfigureAwait(false);

        var joinAlice = await join
            .HandleAsync(slug, new JoinEventRequest { Pseudo = "Alice invitée" }, actors.Alice.Id, ct)
            .ConfigureAwait(false);
        var joinBob = await join
            .HandleAsync(slug, new JoinEventRequest { Pseudo = "Bob invité" }, actors.Bob.Id, ct)
            .ConfigureAwait(false);
        var alicePart = joinAlice.Participant.Id;
        var bobPart = joinBob.Participant.Id;

        var mAmelie = await AddMovieAsync(addMovie, slug, 194, "Le Fabuleux Destin d'Amélie Poulain", "2001", alicePart, actors.Alice.Id, ct).ConfigureAwait(false);
        var mHaine = await AddMovieAsync(addMovie, slug, 406, "La Haine", "1995", devPart, actors.Dev.Id, ct).ConfigureAwait(false);
        var mIntouchables = await AddMovieAsync(addMovie, slug, 77338, "Intouchables", "2011", bobPart, actors.Bob.Id, ct).ConfigureAwait(false);

        await VoteAsync(vote, httpContext, slug, mAmelie.Id, devPart, actors.Dev.Id, 1, ct).ConfigureAwait(false);
        await VoteAsync(vote, httpContext, slug, mHaine.Id, bobPart, actors.Bob.Id, 1, ct).ConfigureAwait(false);
        await VoteAsync(vote, httpContext, slug, mIntouchables.Id, alicePart, actors.Alice.Id, 1, ct).ConfigureAwait(false);

        var evt = await events.GetByIdOrSlugAsync(slug, ct).ConfigureAwait(false)
            ?? throw new InvalidOperationException("Seed series movie night not found.");

        var movies = await sp.GetRequiredService<IMovieRepository>().ListByEventIdAsync(evt.Id, ct).ConfigureAwait(false);
        var scores = await votes.AggregateScoresByMovieIdsAsync(movies.Select(m => m.Id).ToList(), ct).ConfigureAwait(false);
        var winner = WheelWinnerPicker.Pick(
            movies,
            id => scores.TryGetValue(id, out var a) ? a.Score : 0,
            WheelMode.WeightedByVotes,
            Random.Shared);

        var lastWeek = utc.AddDays(-6);
        var lastWeekParis = TimeZoneInfo.ConvertTime(lastWeek, EventSchedule.ParisTimeZone);
        var previous = evt with
        {
            Date = lastWeekParis.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture),
            Time = "20:30",
            Recurrence = RecurrenceFrequency.Weekly,
            Winners = [SeedWinner(winner.Id, lastWeek)],
            WinnerAnnouncedAt = lastWeek,
            ClosedAt = lastWeek.AddHours(3),
            UpdatedAt = DateTimeOffset.UtcNow
        };
        await events.UpdateAsync(previous, ct).ConfigureAwait(false);

        var result = await pass.RunForCreatorAsync(actors.Dev.Id, ct).ConfigureAwait(false);
        if (result.Created == 0)
            throw new InvalidOperationException("Seed: the recurrence pass created no next occurrence.");

        logger.LogInformation(
            "DevelopmentSeed: weekly series scenario created (slug={Slug}, occurrence closed 6 days ago, next one created by the recurrence pass).",
            slug);
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
        foreach (var u in users.Where(u => u.NotifiesOn(UserNotificationType.MoviePicked)))
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
            ?? throw new InvalidOperationException("Seed movie night not found after creation.");

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
            Winners = winnerMovieId is null
                ? e.Winners
                : [SeedWinner(winnerMovieId, updatedAt ?? DateTimeOffset.UtcNow)],
            UpdatedAt = updatedAt ?? DateTimeOffset.UtcNow
        };
    }

    private static EventWinner SeedWinner(
        string movieId,
        DateTimeOffset pickedAt,
        WinnerPickMethod method = WinnerPickMethod.Wheel) => new()
        {
            MovieId = movieId,
            Method = method,
            PickedAt = pickedAt
        };

    private static void EnsureConfigBounds(EventConfig cfg)
    {
        if (cfg.MaxParticipants is int maxP && (maxP < 1 || maxP > EventConfig.MaxParticipantsCap))
        {
            throw new ArgumentOutOfRangeException(
                nameof(cfg),
                maxP,
                $"DevelopmentSeed: MaxParticipants must be between 1 and {EventConfig.MaxParticipantsCap}.");
        }

        if (cfg.MaxProposalsPerParticipant is int maxProp && (maxProp < 1 || maxProp > EventConfig.MaxProposalsPerParticipantCap))
        {
            throw new ArgumentOutOfRangeException(
                nameof(cfg),
                maxProp,
                $"DevelopmentSeed: MaxProposalsPerParticipant must be between 1 and {EventConfig.MaxProposalsPerParticipantCap}.");
        }
    }

    private static string FormatDate(DateTimeOffset utc) =>
        utc.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture);
}
