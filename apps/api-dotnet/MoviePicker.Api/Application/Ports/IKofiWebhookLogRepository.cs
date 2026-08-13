namespace MoviePicker.Api.Application.Ports;

public interface IKofiWebhookLogRepository
{
    Task<bool> TryRecordAsync(string messageId, DateTimeOffset receivedAt, CancellationToken ct = default);
}
