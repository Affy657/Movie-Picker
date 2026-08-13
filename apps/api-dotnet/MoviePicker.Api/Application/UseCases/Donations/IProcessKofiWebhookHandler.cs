namespace MoviePicker.Api.Application.UseCases.Donations;

public enum KofiWebhookOutcome
{
    NotConfigured,
    InvalidPayload,
    InvalidToken,
    AlreadyProcessed,
    UnsupportedType,
    NoDonorEmail,
    NoMatchingAccount,
    AlreadySupporter,
    SupporterMarked
}

public interface IProcessKofiWebhookHandler
{
    Task<KofiWebhookOutcome> HandleAsync(string? rawData, CancellationToken ct = default);
}
