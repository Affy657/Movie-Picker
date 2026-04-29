using System.Security.Cryptography;
using System.Text;
using Microsoft.AspNetCore.WebUtilities;

namespace MoviePicker.Api.Application.UseCases.Auth.PasswordReset;

public static class PasswordResetTokenFactory
{
    public static (string Plain, string Hash) Generate()
    {
        Span<byte> bytes = stackalloc byte[32];
        RandomNumberGenerator.Fill(bytes);
        var plain = WebEncoders.Base64UrlEncode(bytes);
        return (plain, Hash(plain));
    }

    public static string Hash(string plain)
    {
        var utf8Bytes = Encoding.UTF8.GetBytes(plain);
        var digest = SHA256.HashData(utf8Bytes);
        return Convert.ToHexString(digest).ToLowerInvariant();
    }
}
