using System.Globalization;
using System.Text;
using System.Text.RegularExpressions;

namespace MoviePicker.Api.Application.UseCases.SearchUsers;

public static class UserSearchPolicy
{
    public const int MinQueryLength = 2;
    public const int ResultLimit = 20;

    private const CompareOptions LooseComparison = CompareOptions.IgnoreCase | CompareOptions.IgnoreNonSpace;

    public static string Normalize(string? raw) => (raw ?? string.Empty).Trim();

    public static bool Contains(string? value, string query) =>
        !string.IsNullOrEmpty(value)
        && CultureInfo.InvariantCulture.CompareInfo.IndexOf(value, query, LooseComparison) >= 0;

    public static bool StartsWith(string? value, string query) =>
        !string.IsNullOrEmpty(value)
        && CultureInfo.InvariantCulture.CompareInfo.IsPrefix(value, query, LooseComparison);

    public static string ToRegexPattern(string query)
    {
        var builder = new StringBuilder();
        foreach (var character in RemoveDiacritics(query))
        {
            var variants = DiacriticVariants(char.ToLowerInvariant(character));
            if (variants is null)
                builder.Append(Regex.Escape(character.ToString()));
            else
                builder.Append('[').Append(variants).Append(']');
        }

        return builder.ToString();
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
