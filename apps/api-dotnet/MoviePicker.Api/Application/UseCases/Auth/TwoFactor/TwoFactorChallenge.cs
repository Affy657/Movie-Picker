using System.Buffers.Text;
using System.Security.Cryptography;
using System.Text.Json;
using MoviePicker.Api.Application.Ports;

namespace MoviePicker.Api.Application.UseCases.Auth.TwoFactor;

public sealed record TwoFactorChallenge(string Id, string UserId, string Method, string? ReturnTo)
{
    private const int IdEntropyBytes = 18;

    public static TwoFactorChallenge New(string userId, string method, string? returnTo) =>
        new(Base64Url.EncodeToString(RandomNumberGenerator.GetBytes(IdEntropyBytes)), userId, method, returnTo);

    public string Seal(ISecretSealer sealer, DateTimeOffset now) =>
        sealer.Seal(TwoFactorSealing.ChallengePurpose, JsonSerializer.Serialize(this), now + TwoFactorSealing.ChallengeLifetime);

    public static TwoFactorChallenge? TryOpen(ISecretSealer sealer, string? sealedChallenge)
    {
        if (string.IsNullOrEmpty(sealedChallenge))
            return null;
        var payload = sealer.TryOpen(TwoFactorSealing.ChallengePurpose, sealedChallenge);
        if (payload is null)
            return null;
        try
        {
            return JsonSerializer.Deserialize<TwoFactorChallenge>(payload);
        }
        catch (JsonException)
        {
            return null;
        }
    }
}
