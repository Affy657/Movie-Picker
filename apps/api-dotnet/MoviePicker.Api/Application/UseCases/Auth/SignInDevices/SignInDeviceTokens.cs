using System.Security.Cryptography;
using System.Text;

namespace MoviePicker.Api.Application.UseCases.Auth.SignInDevices;

public static class SignInDeviceTokens
{
    private const int TokenBytes = 32;
    private const int EncodedLength = 43;

    public static string Generate() => Base64UrlEncode(RandomNumberGenerator.GetBytes(TokenBytes));

    public static bool IsWellFormed(string? token) =>
        token is { Length: EncodedLength } && token.All(IsBase64UrlCharacter);

    public static string Hash(string userId, string token) =>
        Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(userId + ":" + token))).ToLowerInvariant();

    private static bool IsBase64UrlCharacter(char c) =>
        char.IsAsciiLetterOrDigit(c) || c is '-' or '_';

    private static string Base64UrlEncode(byte[] bytes) =>
        Convert.ToBase64String(bytes).TrimEnd('=').Replace('+', '-').Replace('/', '_');
}
