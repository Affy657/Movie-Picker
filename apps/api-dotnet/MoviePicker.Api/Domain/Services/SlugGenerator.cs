using System.Security.Cryptography;

namespace MoviePicker.Api.Domain.Services;

public static class SlugGenerator
{
    private const string UrlSafeAlphabet = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-_";

    public static string NewSlug(int length = 10) => New(length);
    public static string NewHostToken(int length = 32) => New(length);

    private static string New(int length)
    {
        var bytes = new byte[length];
        RandomNumberGenerator.Fill(bytes);
        var chars = new char[length];
        for (var i = 0; i < length; i++)
            chars[i] = UrlSafeAlphabet[bytes[i] % UrlSafeAlphabet.Length];
        return new string(chars);
    }
}
