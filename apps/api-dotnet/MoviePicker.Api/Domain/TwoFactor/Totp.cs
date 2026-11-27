using System.Buffers.Binary;
using System.Globalization;
using System.Security.Cryptography;
using System.Text;

namespace MoviePicker.Api.Domain.TwoFactor;

public static class Totp
{
    public const string Issuer = "Movie Picker";
    public const int Digits = 6;
    public const int SecretByteLength = 20;
    public static readonly TimeSpan Period = TimeSpan.FromSeconds(30);

    private const int AcceptedDrift = 1;
    private const int CodeModulus = 1_000_000;

    public static long StepAt(DateTimeOffset at) => at.ToUnixTimeSeconds() / (long)Period.TotalSeconds;

    public static string CodeAt(byte[] secret, long step)
    {
        Span<byte> counter = stackalloc byte[sizeof(long)];
        BinaryPrimitives.WriteInt64BigEndian(counter, step);
        Span<byte> mac = stackalloc byte[HMACSHA1.HashSizeInBytes];
        HMACSHA1.HashData(secret, counter, mac);
        var offset = mac[^1] & 0x0F;
        var truncated = BinaryPrimitives.ReadInt32BigEndian(mac.Slice(offset, sizeof(int))) & 0x7FFFFFFF;
        return (truncated % CodeModulus).ToString("D6", CultureInfo.InvariantCulture);
    }

    public static long? MatchingStep(byte[] secret, string typed, DateTimeOffset now, long? lastUsedStep)
    {
        var code = Normalize(typed);
        if (!IsSixDigits(code))
            return null;

        var current = StepAt(now);
        long? matched = null;
        for (var step = current - AcceptedDrift; step <= current + AcceptedDrift; step++)
        {
            var expected = Encoding.ASCII.GetBytes(CodeAt(secret, step));
            var matches = CryptographicOperations.FixedTimeEquals(expected, Encoding.ASCII.GetBytes(code));
            if (matches && step > (lastUsedStep ?? long.MinValue))
                matched ??= step;
        }

        return matched;
    }

    public static bool LooksLikeACode(string typed) => IsSixDigits(Normalize(typed));

    public static byte[] NewSecret() => RandomNumberGenerator.GetBytes(SecretByteLength);

    public static string ProvisioningUri(byte[] secret, string accountName)
    {
        var issuer = Uri.EscapeDataString(Issuer);
        return string.Create(
            CultureInfo.InvariantCulture,
            $"otpauth://totp/{issuer}:{Uri.EscapeDataString(accountName)}?secret={Base32.Encode(secret)}&issuer={issuer}&algorithm=SHA1&digits={Digits}&period={(int)Period.TotalSeconds}");
    }

    private static string Normalize(string typed) =>
        string.Concat(typed.Where(c => c is not (' ' or '-')));

    private static bool IsSixDigits(string code) => code.Length == Digits && code.All(char.IsAsciiDigit);
}
