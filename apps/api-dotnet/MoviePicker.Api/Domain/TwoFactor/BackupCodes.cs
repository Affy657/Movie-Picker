using System.Security.Cryptography;
using System.Text;

namespace MoviePicker.Api.Domain.TwoFactor;

public static class BackupCodes
{
    public const int Count = 10;

    private const string Alphabet = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
    private const int GroupLength = 4;
    private const int CodeLength = GroupLength * 2;

    public static IReadOnlyList<string> Generate()
    {
        var codes = new HashSet<string>(StringComparer.Ordinal);
        while (codes.Count < Count)
            codes.Add(NewCode());
        return [.. codes];
    }

    public static string Hash(string typed) =>
        Convert.ToHexStringLower(SHA256.HashData(Encoding.ASCII.GetBytes(Normalize(typed))));

    public static string? MatchingHash(IReadOnlyList<string> storedHashes, string typed)
    {
        if (Normalize(typed).Length != CodeLength)
            return null;

        var candidate = Encoding.ASCII.GetBytes(Hash(typed));
        string? matched = null;
        foreach (var stored in storedHashes)
        {
            if (CryptographicOperations.FixedTimeEquals(candidate, Encoding.ASCII.GetBytes(stored)))
                matched ??= stored;
        }

        return matched;
    }

    private static string NewCode()
    {
        var symbols = RandomNumberGenerator.GetItems<char>(Alphabet, CodeLength);
        return string.Concat(new string(symbols, 0, GroupLength), "-", new string(symbols, GroupLength, GroupLength));
    }

    private static string Normalize(string typed) =>
        string.Concat(typed.Where(c => c is not (' ' or '-')).Select(char.ToUpperInvariant));
}
