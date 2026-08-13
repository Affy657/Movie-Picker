using System.Collections.Concurrent;
using MoviePicker.Api.Application.Ports;

namespace MoviePicker.Api.Infrastructure.Persistence.InMemory;

public sealed class InMemoryKofiWebhookLogRepository : IKofiWebhookLogRepository
{
    private readonly ConcurrentDictionary<string, DateTimeOffset> _byMessageId = new();

    public Task<bool> TryRecordAsync(
        string messageId, DateTimeOffset receivedAt, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(messageId))
            return Task.FromResult(false);

        return Task.FromResult(_byMessageId.TryAdd(messageId, receivedAt));
    }
}
