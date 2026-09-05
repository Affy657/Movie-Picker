using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Infrastructure.Migrations;
using MoviePicker.Api.Infrastructure.Persistence.InMemory;
using Xunit;

namespace MoviePicker.Api.Tests.Infrastructure.Migrations;

public sealed class DataMigrationRunnerTests
{
    private sealed class RecordingMigration : IDataMigration
    {
        private readonly Func<long> _result;

        public RecordingMigration(string id, Func<long> result)
        {
            Id = id;
            _result = result;
        }

        public string Id { get; }

        public int Runs { get; private set; }

        public Task<long> ExecuteAsync(CancellationToken ct = default)
        {
            Runs++;
            return Task.FromResult(_result());
        }
    }

    private static async Task RunAsync(IMigrationHistoryRepository history, params IDataMigration[] migrations)
    {
        var services = new ServiceCollection();
        services.AddSingleton(history);
        foreach (var migration in migrations)
            services.AddSingleton(migration);
        using var provider = services.BuildServiceProvider();

        var runner = new DataMigrationRunner(
            provider.GetRequiredService<IServiceScopeFactory>(),
            TimeProvider.System,
            NullLogger<DataMigrationRunner>.Instance,
            TimeSpan.Zero);

        await runner.StartAsync(CancellationToken.None);
        await runner.ExecuteTask!;
    }

    [Fact]
    public async Task Run_AppliesPendingMigrationOnceAndRecordsIt()
    {
        var history = new InMemoryMigrationHistoryRepository();
        var migration = new RecordingMigration("001-a", () => 3);

        await RunAsync(history, migration);
        await RunAsync(history, migration);

        Assert.Equal(1, migration.Runs);
        Assert.True(await history.IsAppliedAsync("001-a"));
    }

    [Fact]
    public async Task Run_AppliesMigrationsInIdOrder()
    {
        var history = new InMemoryMigrationHistoryRepository();
        var order = new List<string>();
        var second = new RecordingMigration("002-b", () => 0);
        var first = new RecordingMigration("001-a", () => 0);

        var services = new ServiceCollection();
        services.AddSingleton<IMigrationHistoryRepository>(history);
        services.AddSingleton<IDataMigration>(new OrderTrackingMigration(second, order));
        services.AddSingleton<IDataMigration>(new OrderTrackingMigration(first, order));
        using var provider = services.BuildServiceProvider();

        var runner = new DataMigrationRunner(
            provider.GetRequiredService<IServiceScopeFactory>(),
            TimeProvider.System,
            NullLogger<DataMigrationRunner>.Instance,
            TimeSpan.Zero);
        await runner.StartAsync(CancellationToken.None);
        await runner.ExecuteTask!;

        Assert.Equal(["001-a", "002-b"], order);
    }

    private sealed class OrderTrackingMigration : IDataMigration
    {
        private readonly IDataMigration _inner;
        private readonly List<string> _order;

        public OrderTrackingMigration(IDataMigration inner, List<string> order)
        {
            _inner = inner;
            _order = order;
        }

        public string Id => _inner.Id;

        public async Task<long> ExecuteAsync(CancellationToken ct = default)
        {
            _order.Add(Id);
            return await _inner.ExecuteAsync(ct);
        }
    }

    [Fact]
    public async Task Run_FailedMigrationIsNotRecordedAndRetriesNextBoot()
    {
        var history = new InMemoryMigrationHistoryRepository();
        var attempts = 0;
        var flaky = new RecordingMigration(
            "001-flaky",
            () => attempts++ == 0 ? throw new InvalidOperationException("boom") : 1);

        await RunAsync(history, flaky);
        Assert.False(await history.IsAppliedAsync("001-flaky"));

        await RunAsync(history, flaky);
        Assert.True(await history.IsAppliedAsync("001-flaky"));
        Assert.Equal(2, flaky.Runs);
    }
}
