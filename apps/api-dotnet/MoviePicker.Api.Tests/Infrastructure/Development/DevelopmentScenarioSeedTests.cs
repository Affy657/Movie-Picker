using System.Collections.Concurrent;
using System.Security.Claims;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.EventTemplates;
using MoviePicker.Api.Application.UseCases.MovieLists;
using MoviePicker.Api.Application.UseCases.Notifications;
using MoviePicker.Api.Application.UseCases.SearchUsers;
using MoviePicker.Api.Application.UseCases.VoteMovie;
using MoviePicker.Api.Configuration;
using MoviePicker.Api.Domain;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Domain.Exceptions;
using MoviePicker.Api.Infrastructure;
using MoviePicker.Api.Infrastructure.Development;
using Xunit;

namespace MoviePicker.Api.Tests.Infrastructure.Development;

public sealed class SeededDevelopmentFixture : IAsyncLifetime
{
    private sealed class DevelopmentEnv : IHostEnvironment
    {
        public string EnvironmentName { get; set; } = Environments.Development;
        public string ApplicationName { get; set; } = "Tests";
        public string ContentRootPath { get; set; } = AppContext.BaseDirectory;
        public IFileProvider ContentRootFileProvider { get; set; } = new NullFileProvider();
    }

    public sealed class CapturingLoggerProvider : ILoggerProvider
    {
        public ConcurrentQueue<(LogLevel Level, string Category, string Message)> Entries { get; } = new();

        public ILogger CreateLogger(string categoryName) => new CapturingLogger(categoryName, Entries);

        public void Dispose()
        {
        }

        private sealed class CapturingLogger(
            string category,
            ConcurrentQueue<(LogLevel, string, string)> entries) : ILogger
        {
            public IDisposable BeginScope<TState>(TState state) where TState : notnull => NullScope.Instance;

            public bool IsEnabled(LogLevel logLevel) => logLevel >= LogLevel.Warning;

            public void Log<TState>(
                LogLevel logLevel,
                EventId eventId,
                TState state,
                Exception? exception,
                Func<TState, Exception?, string> formatter)
            {
                if (IsEnabled(logLevel))
                    entries.Enqueue((logLevel, category, formatter(state, exception)));
            }

            private sealed class NullScope : IDisposable
            {
                public static readonly NullScope Instance = new();

                public void Dispose()
                {
                }
            }
        }
    }

    public ServiceProvider Provider { get; private set; } = null!;

    public CapturingLoggerProvider Logs { get; } = new();

    public async Task InitializeAsync()
    {
        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["DevelopmentSeed:Enabled"] = "true",
                ["DevelopmentSeed:Email"] = "dev@test.local",
                ["DevelopmentSeed:Password"] = "DevTest123!",
                ["DevelopmentSeed:DisplayName"] = "Utilisateur dev"
            })
            .Build();
        var services = new ServiceCollection();
        services.AddSingleton<IConfiguration>(configuration);
        services.AddSingleton<IHostEnvironment>(new DevelopmentEnv());
        services.AddLogging(builder => builder.AddProvider(Logs));
        services.AddMoviePicker(configuration, new DevelopmentEnv());
        Provider = services.BuildServiceProvider();
        await RunSeedAsync();
    }

    public Task RunSeedAsync()
    {
        var seed = new DevelopmentDataSeedHostedService(
            Provider.GetRequiredService<IServiceScopeFactory>(),
            new DevelopmentEnv(),
            Provider.GetRequiredService<IOptions<DevelopmentSeedOptions>>(),
            Provider.GetRequiredService<ILogger<DevelopmentDataSeedHostedService>>());
        return seed.StartAsync(CancellationToken.None);
    }

    public IEnumerable<(LogLevel Level, string Category, string Message)> SeedProblems() =>
        Logs.Entries.Where(e => e.Category.StartsWith("MoviePicker.Api.Infrastructure.Development", StringComparison.Ordinal));

    public Task<User> UserAsync(string email) =>
        Provider.GetRequiredService<IUserRepository>().GetByEmailAsync(email)
            .ContinueWith(t => t.Result ?? throw new InvalidOperationException($"Compte seed absent : {email}"));

    public async Task<Event> EventAsync(string creatorEmail, string title)
    {
        var creator = await UserAsync(creatorEmail);
        return await Provider.GetRequiredService<IEventRepository>().FindByCreatorAndTitleAsync(creator.Id, title)
            ?? throw new InvalidOperationException($"Seed movie night missing: {title}");
    }

    public async Task<IReadOnlyList<Event>> EventsTitledAsync(string creatorEmail, string title)
    {
        var creator = await UserAsync(creatorEmail);
        var all = await Provider.GetRequiredService<IEventRepository>().ListByCreatorUserIdAsync(creator.Id, 200);
        return all.Where(e => e.Title == title).ToList();
    }

    public void ActAs(string userId)
    {
        var identity = new ClaimsIdentity(
            [new Claim(ClaimTypes.NameIdentifier, userId)],
            authenticationType: "Tests");
        Provider.GetRequiredService<IHttpContextAccessor>().HttpContext =
            new DefaultHttpContext { User = new ClaimsPrincipal(identity) };
    }

    public Task DisposeAsync()
    {
        Provider.Dispose();
        return Task.CompletedTask;
    }
}

public sealed class DevelopmentScenarioSeedTests(SeededDevelopmentFixture fixture)
    : IClassFixture<SeededDevelopmentFixture>
{
    private const string Dev = "dev@test.local";
    private const string Alice = "alice@test.local";
    private const string Bob = "bob@test.local";

    [Fact]
    public void EveryStep_RunsWithoutWarningOrError()
    {
        Assert.Empty(fixture.SeedProblems());
    }

    [Fact]
    public async Task DevAccount_HasThreeEventTemplates_AndAliceOne()
    {
        var list = fixture.Provider.GetRequiredService<IListEventTemplatesHandler>();
        var dev = await fixture.UserAsync(Dev);
        var alice = await fixture.UserAsync(Alice);

        var devTemplates = (await list.HandleAsync(dev.Id)).Items;
        var aliceTemplates = (await list.HandleAsync(alice.Id)).Items;

        Assert.Equal(
            ["Ciné-club du vendredi", "Marathon du samedi", "Séries en famille"],
            devTemplates.Select(t => t.Name).OrderBy(n => n, StringComparer.Ordinal));
        var marathon = Assert.Single(devTemplates, t => t.Name == "Marathon du samedi");
        Assert.Equal(3, marathon.WinnerCount);
        Assert.Equal(WheelMode.StrictRandom, marathon.WheelMode);
        var club = Assert.Single(devTemplates, t => t.Name == "Ciné-club du vendredi");
        Assert.Equal(2, club.MaxVotesPerParticipant);
        Assert.Equal("Comédies entre amis", Assert.Single(aliceTemplates).Name);
    }

    [Fact]
    public async Task MultiWinnerMarathon_HasTwoOfThreeWinnersDrawn_AndAnnounced()
    {
        var evt = await fixture.EventAsync(Dev, DevelopmentScenarioSeed.ScenarioMultiWinnerTitle);

        Assert.Equal(3, evt.TargetWinnerCount);
        Assert.Equal(2, evt.Winners.Count);
        Assert.Equal(1, evt.RemainingWinnerSlots);
        Assert.All(evt.Winners, w => Assert.Equal(WinnerPickMethod.Wheel, w.Method));
        Assert.Equal(2, evt.Winners.Select(w => w.MovieId).Distinct().Count());
        Assert.NotNull(evt.WinnerAnnouncedAt);
        Assert.Null(evt.ClosedAt);
        Assert.Equal(EventLifecycle.Upcoming, evt.Lifecycle(DateTimeOffset.UtcNow));
    }

    [Fact]
    public async Task FinishedTrilogy_HasThreeWinners_TwoByWheelOneByHand()
    {
        var evt = await fixture.EventAsync(Alice, DevelopmentScenarioSeed.ScenarioTrilogyFinishedTitle);

        Assert.NotNull(evt.ClosedAt);
        Assert.Equal(3, evt.Winners.Count);
        Assert.Equal(0, evt.RemainingWinnerSlots);
        Assert.Equal(2, evt.Winners.Count(w => w.Method == WinnerPickMethod.Wheel));
        Assert.Equal(1, evt.Winners.Count(w => w.Method == WinnerPickMethod.Manual));
        Assert.True(evt.Winners.Zip(evt.Winners.Skip(1)).All(pair => pair.First.PickedAt < pair.Second.PickedAt));

        var participants = await fixture.Provider.GetRequiredService<IParticipantRepository>().ListByEventIdAsync(evt.Id);
        var dev = await fixture.UserAsync(Dev);
        Assert.Contains(participants, p => p.UserId == dev.Id);
    }

    [Fact]
    public async Task VoteLimit_DevIsAtQuota_AndTheRuleRefusesAnotherVote()
    {
        var evt = await fixture.EventAsync(Bob, DevelopmentScenarioSeed.ScenarioVoteLimitTitle);
        var dev = await fixture.UserAsync(Dev);
        var participants = fixture.Provider.GetRequiredService<IParticipantRepository>();
        var devPart = await participants.FindByEventAndUserIdAsync(evt.Id, dev.Id)
            ?? throw new InvalidOperationException("dev is not in the quota movie night");

        Assert.Equal(1, evt.Config?.MaxVotesPerParticipant);
        var votes = await fixture.Provider.GetRequiredService<IVoteRepository>().GetParticipantVotesByEventAsync(evt.Id, devPart.Id);
        Assert.Single(votes);

        var movies = await fixture.Provider.GetRequiredService<IMovieRepository>().ListByEventIdAsync(evt.Id);
        var untouched = movies.First(m => !votes.ContainsKey(m.Id));
        fixture.ActAs(dev.Id);
        using var scope = fixture.Provider.CreateScope();
        var vote = scope.ServiceProvider.GetRequiredService<IVoteMovieHandler>();

        await Assert.ThrowsAsync<ConflictException>(() =>
            vote.HandleAsync(dev.Id, evt.Slug, untouched.Id, new VoteRequest { ParticipantId = devPart.Id, Value = 1 }));
    }

    [Fact]
    public async Task RecurringSeries_PreviousOccurrenceClosed_NextOneOpenWithTheSameSettings()
    {
        var occurrences = await fixture.EventsTitledAsync(Dev, DevelopmentScenarioSeed.ScenarioRecurringTitle);
        var now = DateTimeOffset.UtcNow;

        var previous = Assert.Single(occurrences, e => e.ClosedAt is not null);
        var next = Assert.Single(occurrences, e => e.ClosedAt is null);

        Assert.Equal(RecurrenceFrequency.Weekly, previous.Recurrence);
        Assert.Single(previous.Winners);
        Assert.Equal(next.Id, previous.NextOccurrenceEventId);
        Assert.Equal(previous.Id, next.RecurrenceParentEventId);
        Assert.Equal(RecurrenceFrequency.Weekly, next.Recurrence);
        Assert.Equal(previous.Config, next.Config);
        Assert.Empty(next.Winners);
        Assert.Equal(EventLifecycle.Upcoming, next.Lifecycle(now));

        var movies = fixture.Provider.GetRequiredService<IMovieRepository>();
        Assert.NotEmpty(await movies.ListByEventIdAsync(previous.Id));
        Assert.Empty(await movies.ListByEventIdAsync(next.Id));

        var dev = await fixture.UserAsync(Dev);
        var host = await fixture.Provider.GetRequiredService<IParticipantRepository>().FindByEventAndUserIdAsync(next.Id, dev.Id);
        Assert.NotNull(host);
    }

    [Theory]
    [InlineData("zoe")]
    [InlineData("lefevre")]
    [InlineData("Zoé")]
    public async Task Zoe_IsFoundByUserSearch_WithOrWithoutAccents(string query)
    {
        var dev = await fixture.UserAsync(Dev);
        var zoe = await fixture.UserAsync("zoe@test.local");
        using var scope = fixture.Provider.CreateScope();
        var search = scope.ServiceProvider.GetRequiredService<ISearchUsersHandler>();

        var result = await search.HandleAsync(query, dev.Id);

        Assert.Contains(result.Items, item => item.Handle == zoe.Handle);
        Assert.True(zoe.IsProfilePublic);
    }

    [Fact]
    public async Task Watchlists_DevHasThreeFilms_BobHidesHis_ZoeShowsHers()
    {
        var watchlist = fixture.Provider.GetRequiredService<IWatchlistRepository>();
        var dev = await fixture.UserAsync(Dev);
        var bob = await fixture.UserAsync(Bob);
        var zoe = await fixture.UserAsync("zoe@test.local");

        Assert.Equal(3, await watchlist.CountByUserIdAsync(dev.Id));
        Assert.False(bob.IsWatchlistPublic);
        Assert.True(zoe.IsWatchlistPublic);
        Assert.Equal(2, await watchlist.CountByUserIdAsync(zoe.Id));
    }

    [Fact]
    public async Task MovieLists_DevHasCultFilmsHalloweenAndAnEmptyGhibli()
    {
        var dev = await fixture.UserAsync(Dev);

        var lists = await fixture.Provider.GetRequiredService<IMovieListRepository>().ListByOwnerAsync(dev.Id);

        Assert.Equal(["Films cultes", "Ghibli", "Halloween"], lists.Select(list => list.Name).Order(StringComparer.Ordinal));
        Assert.InRange(lists.Single(list => list.Name == "Films cultes").Items.Count, 6, 8);
        Assert.InRange(lists.Single(list => list.Name == "Halloween").Items.Count, 5, 8);
        Assert.Empty(lists.Single(list => list.Name == "Ghibli").Items);
        Assert.All(lists.SelectMany(list => list.Items), item => Assert.True(item.TmdbId > 0));
    }

    [Fact]
    public async Task SharedLists_HalloweenIsSharedWithAliceAndBob_WhoAddedSomeOfItsTitles()
    {
        var dev = await fixture.UserAsync(Dev);
        var alice = await fixture.UserAsync(Alice);
        var bob = await fixture.UserAsync(Bob);

        var halloween = (await fixture.Provider.GetRequiredService<IMovieListRepository>().ListByOwnerAsync(dev.Id))
            .Single(list => list.Name == "Halloween");

        Assert.Equal([alice.Id, bob.Id], halloween.Members.Select(member => member.UserId));
        Assert.Equal(
            new[] { dev.Id, alice.Id, bob.Id }.Order(StringComparer.Ordinal),
            halloween.Items.Select(halloween.AuthorOf).Distinct().Order(StringComparer.Ordinal));
    }

    [Fact]
    public async Task SharedLists_DevJoinedAlicesSundayList_AndHasAPendingInvitationFromBob()
    {
        var dev = await fixture.UserAsync(Dev);
        var alice = await fixture.UserAsync(Alice);
        var bob = await fixture.UserAsync(Bob);
        var lists = fixture.Provider.GetRequiredService<IMovieListRepository>();

        var sunday = Assert.Single(await lists.ListJoinedAsync(dev.Id));
        var pending = Assert.Single(await lists.ListInvitingAsync(dev.Id));
        var inbox = await fixture.Provider.GetRequiredService<IGetInboxHandler>().HandleAsync(dev.Id, limit: 100, offset: null);
        var summaries = (await fixture.Provider.GetRequiredService<IListMovieListsHandler>().HandleAsync(dev.Id, null)).Items;

        Assert.Equal(("Ciné du dimanche", alice.Id), (sunday.Name, sunday.OwnerId));
        Assert.Contains(sunday.Items, item => sunday.AuthorOf(item) == dev.Id);
        Assert.Contains(sunday.Items, item => sunday.AuthorOf(item) == alice.Id);
        Assert.Equal(bob.Id, pending.OwnerId);
        Assert.NotEmpty(pending.Items);
        var notice = Assert.Single(inbox.Items, item => item.Type == "listinvitation" && item.ListId == pending.Id);
        Assert.True(notice.ListInvitationPending);
        Assert.Equal(pending.Name, notice.ListName);
        Assert.Equal(MovieListRole.Member, summaries.Single(summary => summary.Id == sunday.Id).Role);
        Assert.DoesNotContain(summaries, summary => summary.Id == pending.Id);
    }

    [Fact]
    public async Task WatchedElsewhere_DevSawPartOfHisLists_WithAndWithoutARating()
    {
        var dev = await fixture.UserAsync(Dev);

        var watched = await fixture.Provider.GetRequiredService<IWatchedTitleRepository>().ListByOwnerAsync(dev.Id);
        var lists = (await fixture.Provider.GetRequiredService<IListMovieListsHandler>().HandleAsync(dev.Id, null)).Items;

        Assert.Equal(10, watched.Count(title => title.Origin == WatchedOrigin.Manual));
        Assert.Contains(watched, title => title.Rating is not null);
        Assert.Contains(watched, title => title.Rating is null);
        Assert.Equal(4, lists.Single(list => list.Name == "Halloween").WatchedCount);
        Assert.InRange(lists.Single(list => list.Name == "Films cultes").WatchedCount, 3, 7);
        Assert.Equal(0, lists.Single(list => list.Name == "Ghibli").WatchedCount);
    }

    [Fact]
    public async Task SavedLists_DevSavedTheHarryPotterSagaASelectionAndAlicesHitchcockList_AndWatchedPartOfTheSaga()
    {
        var dev = await fixture.UserAsync(Dev);
        var alice = await fixture.UserAsync(Alice);
        var hitchcock = (await fixture.Provider.GetRequiredService<IMovieListRepository>().ListByOwnerAsync(alice.Id))
            .Single(list => list.Name == "Hitchcock en entier");

        var saved = await fixture.Provider.GetRequiredService<ISavedListRepository>().ListByOwnerAsync(dev.Id);
        var watched = await fixture.Provider.GetRequiredService<IWatchedTitleRepository>().ListByOwnerAsync(dev.Id);

        Assert.Equal(
            [
                (ListSourceType.MemberList, hitchcock.Id, "Hitchcock en entier"),
                (ListSourceType.ExplorerTheme, "indetronables", "indetronables"),
                (ListSourceType.TmdbCollection, "1241", "Harry Potter - Saga")
            ],
            saved.Select(list => (list.SourceType, list.SourceId, list.Name)));
        Assert.Equal(
            hitchcock.Items.Select(item => item.TmdbId),
            saved[0].Snapshot.Select(title => title.TmdbId));
        Assert.Equal(3, watched.Count(title => title.TmdbId is 671 or 672 or 673));
    }

    [Fact]
    public async Task PublicLists_DevSharesHisCultFilms_AliceTwoListsAndKeepsAThirdPrivate()
    {
        var dev = await fixture.UserAsync(Dev);
        var alice = await fixture.UserAsync(Alice);
        var lists = fixture.Provider.GetRequiredService<IMovieListRepository>();

        var devPublic = await lists.ListPublicSummariesAsync(dev.Id);
        var alicePublic = await lists.ListPublicSummariesAsync(alice.Id);
        var aliceOwn = await lists.ListByOwnerAsync(alice.Id);
        var devSees = await fixture.Provider.GetRequiredService<IListMovieListsHandler>().HandleAsync(dev.Id, null);

        Assert.Equal(["Films cultes"], devPublic.Select(list => list.Name));
        Assert.Equal(
            ["Ciné coréen", "Hitchcock en entier"],
            alicePublic.Select(list => list.Name).Order(StringComparer.Ordinal));
        Assert.All(alicePublic, list => Assert.InRange(list.ItemCount, 4, 5));
        var kept = Assert.Single(aliceOwn, list => list.Name == "Pour plus tard");
        Assert.False(kept.IsPublic);
        Assert.NotEmpty(kept.Items);
        Assert.True(alice.IsProfilePublic);
        Assert.Equal(2, await lists.CountPublicByOwnerAsync(alice.Id));
        Assert.False(devSees.Items.Single(list => list.Name == "Ciné du dimanche").IsPublic);
    }

    [Fact]
    public async Task Letterboxd_DevLooksSynchronized_WithFilmsWatchedOnLetterboxdAndATitleToWatchOutsideIt()
    {
        var dev = await fixture.UserAsync(Dev);

        var watched = await fixture.Provider.GetRequiredService<IWatchedTitleRepository>().ListByOwnerAsync(dev.Id);
        var toWatch = await fixture.Provider.GetRequiredService<IWatchlistRepository>().ListByUserIdAsync(dev.Id);

        var fromLetterboxd = watched.Where(title => title.Origin == WatchedOrigin.Letterboxd).ToList();
        Assert.False(string.IsNullOrEmpty(dev.LetterboxdUsername));
        Assert.True(dev.LetterboxdSyncWatchlist);
        Assert.True(dev.LetterboxdSyncWatched);
        Assert.NotNull(dev.LetterboxdLastSyncAt);
        Assert.Null(dev.LetterboxdLastSyncError);
        Assert.InRange(fromLetterboxd.Count, 3, 10);
        Assert.All(fromLetterboxd, title => Assert.False(string.IsNullOrEmpty(title.LetterboxdSlug)));
        Assert.Contains(fromLetterboxd, title => title.RatingOrigin == WatchedOrigin.Letterboxd);
        Assert.Contains(fromLetterboxd, title => title.Rating is null);
        Assert.Contains(watched, title => title.Origin == WatchedOrigin.Manual && title.LetterboxdSlug is not null);
        Assert.Contains(toWatch, item => item.LetterboxdSlug is null);
        Assert.Contains(toWatch, item => item.LetterboxdSlug is not null);
        Assert.Equal(
            (toWatch.Count(item => item.LetterboxdSlug is not null), fromLetterboxd.Count),
            (dev.LetterboxdWatchlistCount, dev.LetterboxdWatchedCount));
    }

    [Fact]
    public async Task Favorites_AliceShowsThreeWithASeries_ZoeOne_DevNone()
    {
        var alice = await fixture.UserAsync(Alice);
        var zoe = await fixture.UserAsync("zoe@test.local");
        var dev = await fixture.UserAsync(Dev);

        Assert.Equal(
            [(27205, MovieMediaType.Movie), (157336, MovieMediaType.Movie), (1920, MovieMediaType.Tv)],
            alice.Favorites.Select(f => (f.TmdbId, f.MediaType)));
        Assert.Single(zoe.Favorites);
        Assert.Empty(dev.Favorites);
    }

    [Fact]
    public async Task RunningTheSeedTwice_CreatesNothingMore()
    {
        var events = fixture.Provider.GetRequiredService<IEventRepository>();
        var templates = fixture.Provider.GetRequiredService<IListEventTemplatesHandler>();
        var dev = await fixture.UserAsync(Dev);
        var alice = await fixture.UserAsync(Alice);
        var bob = await fixture.UserAsync(Bob);
        var before = await CountEventsAsync(events, dev.Id, alice.Id, bob.Id);
        var templatesBefore = (await templates.HandleAsync(dev.Id)).Items.Count;
        var movieLists = fixture.Provider.GetRequiredService<IMovieListRepository>();
        var listsBefore = await movieLists.ListByOwnerAsync(dev.Id);
        var aliceListsBefore = await movieLists.ListByOwnerAsync(alice.Id);
        var watchedTitles = fixture.Provider.GetRequiredService<IWatchedTitleRepository>();
        var watchedBefore = await watchedTitles.ListByOwnerAsync(dev.Id);
        var savedLists = fixture.Provider.GetRequiredService<ISavedListRepository>();
        var savedBefore = await savedLists.ListByOwnerAsync(dev.Id);
        var joinedBefore = await movieLists.ListJoinedAsync(dev.Id);
        var invitingBefore = await movieLists.ListInvitingAsync(dev.Id);

        await fixture.RunSeedAsync();

        Assert.Equal(before, await CountEventsAsync(events, dev.Id, alice.Id, bob.Id));
        Assert.Equal(templatesBefore, (await templates.HandleAsync(dev.Id)).Items.Count);
        Assert.Equal(
            listsBefore.Select(list => (list.Name, list.Items.Count)),
            (await movieLists.ListByOwnerAsync(dev.Id)).Select(list => (list.Name, list.Items.Count)));
        Assert.Equal(
            watchedBefore.Select(title => (title.TmdbId, title.WatchedAt, title.Rating)),
            (await watchedTitles.ListByOwnerAsync(dev.Id)).Select(title => (title.TmdbId, title.WatchedAt, title.Rating)));
        Assert.Equal(
            listsBefore.Select(list => (list.Name, list.Members.Count, list.Invitations.Count)),
            (await movieLists.ListByOwnerAsync(dev.Id)).Select(list => (list.Name, list.Members.Count, list.Invitations.Count)));
        Assert.Equal(
            joinedBefore.Select(list => (list.Id, list.Items.Count)),
            (await movieLists.ListJoinedAsync(dev.Id)).Select(list => (list.Id, list.Items.Count)));
        Assert.Equal(
            invitingBefore.Select(list => list.Id),
            (await movieLists.ListInvitingAsync(dev.Id)).Select(list => list.Id));
        Assert.Equal(
            savedBefore.Select(list => (list.Id, list.SourceId, list.CreatedAt)),
            (await savedLists.ListByOwnerAsync(dev.Id)).Select(list => (list.Id, list.SourceId, list.CreatedAt)));
        Assert.Equal(
            aliceListsBefore.Select(list => (list.Id, list.Items.Count, list.IsPublic)),
            (await movieLists.ListByOwnerAsync(alice.Id)).Select(list => (list.Id, list.Items.Count, list.IsPublic)));
        Assert.Empty(fixture.SeedProblems());
    }

    private static async Task<int> CountEventsAsync(IEventRepository events, params string[] creatorIds)
    {
        var total = 0;
        foreach (var id in creatorIds)
            total += (await events.ListByCreatorUserIdAsync(id, 200)).Count;
        return total;
    }
}
