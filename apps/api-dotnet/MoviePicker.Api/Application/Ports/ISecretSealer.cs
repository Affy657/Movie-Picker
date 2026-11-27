namespace MoviePicker.Api.Application.Ports;

public interface ISecretSealer
{
    string Seal(string purpose, string payload, DateTimeOffset? expiresAt = null);
    string? TryOpen(string purpose, string sealedPayload);
}
