using System.Collections.Concurrent;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Domain;

namespace MoviePicker.Api.Infrastructure.Persistence.InMemory;

public sealed class InMemoryUsageCountRepository : IUsageCountRepository
{
    private readonly ConcurrentDictionary<(DateOnly Day, string Metric, string Variant), long> _counts = new();

    public Task IncrementAsync(DateOnly day, UsageCount count, CancellationToken ct = default)
    {
        _counts.AddOrUpdate((day, count.Metric, count.Variant), 1, (_, current) => current + 1);
        return Task.CompletedTask;
    }

    public long CountOf(DateOnly day, string metric, string variant) =>
        _counts.TryGetValue((day, metric, variant), out var value) ? value : 0;
}
