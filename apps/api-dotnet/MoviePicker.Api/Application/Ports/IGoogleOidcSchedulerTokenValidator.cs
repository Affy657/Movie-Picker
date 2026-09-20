namespace MoviePicker.Api.Application.Ports;

public interface IGoogleOidcSchedulerTokenValidator
{
    bool IsConfigured { get; }

    Task<bool> IsValidAsync(string? bearerToken, CancellationToken ct);
}
