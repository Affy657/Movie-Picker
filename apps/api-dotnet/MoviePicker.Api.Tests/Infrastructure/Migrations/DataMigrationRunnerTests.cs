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

    [Fact]
    public async Task Run_MigrationLeasedByAnotherInstance_LeavesItAndTheNextOnesToThatInstance()
    {
        var history = new InMemoryMigrationHistoryRepository();
        await history.TryAcquireLeaseAsync("001-a", "other-instance", DateTimeOffset.UtcNow, TimeSpan.FromMinutes(30));
        var leased = new RecordingMigration("001-a", () => 1);
        var next = new RecordingMigration("002-b", () => 1);

        await RunAsync(history, leased, next);

        Assert.Equal(0, leased.Runs);
        Assert.Equal(0, next.Runs);
        Assert.False(await history.IsAppliedAsync("001-a"));
    }

    [Fact]
    public async Task Run_LeaseLeftByACrashedInstance_IsTakenOverOnceExpired()
    {
        var history = new InMemoryMigrationHistoryRepository();
        await history.TryAcquireLeaseAsync("001-a", "crashed-instance", DateTimeOffset.UtcNow.AddHours(-1), TimeSpan.FromMinutes(30));
        var migration = new RecordingMigration("001-a", () => 1);

        await RunAsync(history, migration);

        Assert.Equal(1, migration.Runs);
        Assert.True(await history.IsAppliedAsync("001-a"));
    }

    [Fact]
    public async Task Run_AppliedMigration_ReleasesItsLease()
    {
        var history = new InMemoryMigrationHistoryRepository();

        await RunAsync(history, new RecordingMigration("001-a", () => 1));

        Assert.True(await history.TryAcquireLeaseAsync("001-a", "other-instance", DateTimeOffset.UtcNow, TimeSpan.FromMinutes(30)));
    }

    private sealed class RepeatableRepair : IRepeatableDataMigration
    {
        public string Id => "001-repair";

        public int Runs { get; private set; }

        public Task<long> ExecuteAsync(CancellationToken ct = default)
        {
            Runs++;
            return Task.FromResult(0L);
        }
    }

    private sealed class AppliedWhileWaitingForTheLease(InMemoryMigrationHistoryRepository inner) : IMigrationHistoryRepository
    {
        private int _checks;

        public Task<bool> IsAppliedAsync(string migrationId, CancellationToken ct = default) =>
            Task.FromResult(Interlocked.Increment(ref _checks) > 1);

        public Task MarkAppliedAsync(string migrationId, long affectedCount, DateTimeOffset appliedAt, CancellationToken ct = default) =>
            inner.MarkAppliedAsync(migrationId, affectedCount, appliedAt, ct);

        public Task<bool> TryAcquireLeaseAsync(string migrationId, string holder, DateTimeOffset now, TimeSpan duration, CancellationToken ct = default) =>
            inner.TryAcquireLeaseAsync(migrationId, holder, now, duration, ct);

        public Task ReleaseLeaseAsync(string migrationId, string holder, CancellationToken ct = default) =>
            inner.ReleaseLeaseAsync(migrationId, holder, ct);
    }

    [Fact]
    public async Task Run_RepeatableMigration_RunsAtEveryStartupWithoutBeingRecorded()
    {
        var history = new InMemoryMigrationHistoryRepository();
        var repair = new RepeatableRepair();

        await RunAsync(history, repair);
        await RunAsync(history, repair);

        Assert.Equal(2, repair.Runs);
        Assert.False(await history.IsAppliedAsync("001-repair"));
    }

    [Fact]
    public async Task Run_MigrationAppliedByAnotherInstanceBeforeTheLease_IsNotReplayed()
    {
        var migration = new RecordingMigration("001-a", () => 1);

        await RunAsync(new AppliedWhileWaitingForTheLease(new InMemoryMigrationHistoryRepository()), migration);

        Assert.Equal(0, migration.Runs);
    }
}
