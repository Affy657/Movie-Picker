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
            vote.HandleAsync(evt.Slug, untouched.Id, new VoteRequest { ParticipantId = devPart.Id, Value = 1 }));
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
    public async Task RunningTheSeedTwice_CreatesNothingMore()
    {
        var events = fixture.Provider.GetRequiredService<IEventRepository>();
        var templates = fixture.Provider.GetRequiredService<IListEventTemplatesHandler>();
        var dev = await fixture.UserAsync(Dev);
        var alice = await fixture.UserAsync(Alice);
        var bob = await fixture.UserAsync(Bob);
        var before = await CountEventsAsync(events, dev.Id, alice.Id, bob.Id);
        var templatesBefore = (await templates.HandleAsync(dev.Id)).Items.Count;

        await fixture.RunSeedAsync();

        Assert.Equal(before, await CountEventsAsync(events, dev.Id, alice.Id, bob.Id));
        Assert.Equal(templatesBefore, (await templates.HandleAsync(dev.Id)).Items.Count);
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
