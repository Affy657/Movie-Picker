using System.Globalization;
using System.Security.Cryptography;
using Microsoft.AspNetCore.DataProtection;
using MoviePicker.Api.Application.Ports;

namespace MoviePicker.Api.Infrastructure.Security;

public sealed class DataProtectionSecretSealer : ISecretSealer
{
    private const char ExpirySeparator = '|';

    private readonly IDataProtectionProvider _provider;
    private readonly TimeProvider _clock;

    public DataProtectionSecretSealer(IDataProtectionProvider provider, TimeProvider clock)
    {
        _provider = provider;
        _clock = clock;
    }

    public string Seal(string purpose, string payload, DateTimeOffset? expiresAt = null)
    {
        var expiry = (expiresAt ?? DateTimeOffset.MaxValue).ToUnixTimeSeconds().ToString(CultureInfo.InvariantCulture);
        return _provider.CreateProtector(purpose).Protect(expiry + ExpirySeparator + payload);
    }

    public string? TryOpen(string purpose, string sealedPayload)
    {
        string opened;
        try
        {
            opened = _provider.CreateProtector(purpose).Unprotect(sealedPayload);
        }
        catch (CryptographicException)
        {
            return null;
        }

        var separator = opened.IndexOf(ExpirySeparator);
        if (separator < 0
            || !long.TryParse(opened.AsSpan(0, separator), NumberStyles.None, CultureInfo.InvariantCulture, out var expiry)
            || DateTimeOffset.FromUnixTimeSeconds(expiry) <= _clock.GetUtcNow())
            return null;

        return opened[(separator + 1)..];
    }
}
