using System.Collections.Concurrent;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using MongoDB.Driver;
using MongoDB.Driver.Core.Events;
using MoviePicker.Api.Application.Caching;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.ListMovies;
using MoviePicker.Api.Configuration;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Infrastructure.Tmdb;
using Xunit;

namespace MoviePicker.Api.IntegrationTests;

public sealed class EventMovieListRoundTripTests : IClassFixture<MoviePickerApplicationFactory>
{
    private const int MovieCount = 30;

    private static readonly DateTimeOffset Now = new(2026, 9, 15, 12, 0, 0, TimeSpan.Zero);

    private readonly MoviePickerApplicationFactory _factory;
    private readonly ConcurrentQueue<(string Command, string Collection)> _commands = new();

    public EventMovieListRoundTripTests(MoviePickerApplicationFactory factory)
    {
        _factory = factory;
        _ = _factory.CreateClient();
    }

    private sealed class TmdbMustNotBeCalled : HttpMessageHandler
    {
        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken) =>
            throw new InvalidOperationException($"Unexpected TMDB call to {request.RequestUri}");
    }

    private WebApplicationFactory<Program> ColdInstanceCountingItsCommands() =>
        _factory.WithWebHostBuilder(builder => builder.ConfigureTestServices(services =>
        {
            services.RemoveAll<IMongoClient>();
            services.AddSingleton<IMongoClient>(_ => new MongoClient(CountingSettings()));
            services.RemoveAll<ITmdbMovieSearch>();
            services.AddSingleton<ITmdbMovieSearch>(provider => new TmdbMovieSearch(
                new HttpClient(new TmdbMustNotBeCalled()),
                Options.Create(new MoviePickerOptions { TmdbApiKey = "test-key" }),
                new MemoryCache(new MemoryCacheOptions()),
                provider.GetRequiredService<ISharedCache>(),
                new SingleFlight(),
                NullLogger<TmdbMovieSearch>.Instance));
        }));

    private MongoClientSettings CountingSettings()
    {
        var settings = _factory.Services.GetRequiredService<IMongoClient>().Settings.Clone();
        settings.ClusterConfigurator = cluster => cluster.Subscribe<CommandStartedEvent>(started =>
        {
            if (started.CommandName is "find" or "aggregate")
                _commands.Enqueue((started.CommandName, started.Command[started.CommandName].AsString));
        });
        return settings;
    }

    private int Count(string command, string collection) =>
        _commands.Count(entry => entry.Command == command && entry.Collection == collection);

    private async Task<Event> SeedEventWithEnrichedMoviesAsync()
    {
        using var scope = _factory.Services.CreateScope();
        var events = scope.ServiceProvider.GetRequiredService<IEventRepository>();
        var participants = scope.ServiceProvider.GetRequiredService<IParticipantRepository>();
        var movies = scope.ServiceProvider.GetRequiredService<IMovieRepository>();
        var votes = scope.ServiceProvider.GetRequiredService<IVoteRepository>();
        var cache = scope.ServiceProvider.GetRequiredService<ISharedCache>();

        var evt = await events.AddAsync(new Event
        {
            Title = "Round trips",
            Date = "2026-12-24",
            Time = "20:30",
            HostToken = Guid.NewGuid().ToString("N"),
            Slug = "round-trips-" + Guid.NewGuid().ToString("N")[..10],
            CreatedAt = Now,
            UpdatedAt = Now
        });
        var alice = await participants.AddAsync(new Participant { EventId = evt.Id, Pseudo = "Alice", CreatedAt = Now, UpdatedAt = Now });
        var bob = await participants.AddAsync(new Participant { EventId = evt.Id, Pseudo = "Bob", CreatedAt = Now, UpdatedAt = Now });

        foreach (var tmdbId in Enumerable.Range(1, MovieCount))
        {
            var movie = await movies.InsertAsync(new Movie
            {
                EventId = evt.Id,
                ParticipantId = alice.Id,
                TmdbId = tmdbId,
                Title = $"Film {tmdbId}",
                Year = "2001",
                CreatedAt = Now,
                UpdatedAt = Now
            });
            await votes.UpsertAsync(new Vote { EventId = evt.Id, MovieId = movie.Id, ParticipantId = bob.Id, Value = 1 });
            await cache.SetAsync(
                $"tmdb-enrich-v2:movie:FR:{tmdbId}",
                new TmdbMovieEnrichment(7.5, [], null, 100 + tmdbId),
                TimeSpan.FromHours(1));
        }

        return evt;
    }

    [MongoFact]
    public async Task ColdInstance_ReadsThirtyEnrichedMoviesInOneQueryPerCollection()
    {
        var evt = await SeedEventWithEnrichedMoviesAsync();
        await using var instance = ColdInstanceCountingItsCommands();
        using var scope = instance.Services.CreateScope();
        var handler = scope.ServiceProvider.GetRequiredService<IListMoviesForEventHandler>();
        _commands.Clear();

        var list = await handler.HandleAsync(evt.Slug);

        Assert.Equal(MovieCount, list.Count);
        Assert.All(list, movie =>
        {
            Assert.Equal(100 + movie.TmdbId, movie.RuntimeMinutes);
            Assert.Equal("Alice", movie.ProposerPseudo);
            Assert.Equal(["Bob"], movie.VotersUpPseudos);
            Assert.Equal(1, movie.Up);
        });
        Assert.Equal(1, Count("find", "shared_cache"));
        Assert.Equal(1, Count("aggregate", "votes"));
        Assert.Equal(1, Count("find", "participants"));
    }
}
