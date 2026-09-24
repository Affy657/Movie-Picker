using System.Globalization;
using System.Text;
using System.Text.RegularExpressions;

namespace MoviePicker.Api.Application.UseCases.SearchUsers;

public static class UserSearchPolicy
{
    public const int MinQueryLength = 2;
    public const int MaxQueryLength = 64;
    public const int ResultLimit = 20;

    private const CompareOptions LooseComparison = CompareOptions.IgnoreCase | CompareOptions.IgnoreNonSpace;

    public static string Normalize(string? raw)
    {
        var trimmed = (raw ?? string.Empty).Trim();
        if (trimmed.Length <= MaxQueryLength)
            return trimmed;

        var cut = char.IsHighSurrogate(trimmed[MaxQueryLength - 1]) ? MaxQueryLength - 1 : MaxQueryLength;
        return trimmed[..cut].TrimEnd();
    }

    public static bool Contains(string? value, string query) =>
        !string.IsNullOrEmpty(value)
        && CultureInfo.InvariantCulture.CompareInfo.IndexOf(value, query, LooseComparison) >= 0;

    public static bool StartsWith(string? value, string query) =>
        !string.IsNullOrEmpty(value)
        && CultureInfo.InvariantCulture.CompareInfo.IsPrefix(value, query, LooseComparison);

    public static string ToRegexPattern(string query)
    {
        var builder = new StringBuilder();
        foreach (var rune in query.Normalize(NormalizationForm.FormC).EnumerateRunes())
        {
            var original = rune.ToString();
            var stripped = RemoveDiacritics(original);
            if (stripped != original && stripped.Length == 1 && original.Length == 1)
                AppendAccentedLetterClass(builder, stripped[0], original[0]);
            else
                AppendFolded(builder, stripped);
        }

        return builder.ToString();
    }

    private static void AppendFolded(StringBuilder builder, string text)
    {
        foreach (var character in text)
        {
            var variants = DiacriticVariants(char.ToLowerInvariant(character));
            if (variants is null)
                builder.Append(Regex.Escape(character.ToString()));
            else
                builder.Append('[').Append(variants).Append(']');
        }
    }

    private static void AppendAccentedLetterClass(StringBuilder builder, char baseLetter, char accented)
    {
        var lowerBase = char.ToLowerInvariant(baseLetter);
        var variants = DiacriticVariants(lowerBase) ?? string.Concat(lowerBase, char.ToUpperInvariant(baseLetter));
        builder.Append('[').Append(variants);
        foreach (var form in new[] { char.ToLowerInvariant(accented), char.ToUpperInvariant(accented) })
        {
            if (!variants.Contains(form, StringComparison.Ordinal))
                builder.Append(form);
        }

        builder.Append(']');
    }

    private static string RemoveDiacritics(string value)
    {
        var decomposed = value.Normalize(NormalizationForm.FormD);
        var builder = new StringBuilder(decomposed.Length);
        foreach (var character in decomposed)
        {
            if (CharUnicodeInfo.GetUnicodeCategory(character) != UnicodeCategory.NonSpacingMark)
                builder.Append(character);
        }

        return builder.ToString().Normalize(NormalizationForm.FormC);
    }

    private static string? DiacriticVariants(char character) => character switch
    {
        'a' => "aàáâãäåAÀÁÂÃÄÅ",
        'c' => "cçCÇ",
        'e' => "eèéêëEÈÉÊË",
        'i' => "iìíîïIÌÍÎÏ",
        'n' => "nñNÑ",
        'o' => "oòóôõöOÒÓÔÕÖ",
        'u' => "uùúûüUÙÚÛÜ",
        'y' => "yýÿYÝŸ",
        _ => null
    };
}
