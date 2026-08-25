namespace MoviePicker.Api.Application.Ports;

public interface IKofiWebhookLogRepository
{
    Task<bool> HasProcessedAsync(string messageId, CancellationToken ct = default);

    Task RecordAsync(string messageId, DateTimeOffset receivedAt, CancellationToken ct = default);
}
