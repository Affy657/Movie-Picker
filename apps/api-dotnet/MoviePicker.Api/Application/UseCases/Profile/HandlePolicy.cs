using System.Globalization;
using System.Text;
using System.Text.RegularExpressions;

namespace MoviePicker.Api.Application.UseCases.Profile;

public static partial class HandlePolicy
{
    public const int MinLength = 3;
    public const int MaxLength = 20;
    public const int BioMaxLength = 140;

    private static readonly HashSet<string> Reserved = new(StringComparer.OrdinalIgnoreCase)
    {
        "me", "settings", "admin", "api", "new", "login", "register", "logout",
        "u", "user", "users", "reset",
        "account", "profile", "profiles", "auth", "event", "events", "home",
        "about", "help", "support", "null", "undefined", "root", "system"
    };

    [GeneratedRegex("^[a-z0-9_]{3,20}$")]
    private static partial Regex HandleRegex();

    public static string Normalize(string? raw) => (raw ?? string.Empty).Trim().ToLowerInvariant();

    public static bool IsReserved(string normalized) => Reserved.Contains(normalized);

    /// <summary>Returns an error message when the handle is invalid, or null when valid.</summary>
    public static string? Validate(string? raw)
    {
        var normalized = Normalize(raw);
        if (string.IsNullOrEmpty(normalized))
            return "Le handle est requis.";
        if (normalized.Length < MinLength)
            return $"Le handle doit contenir au moins {MinLength} caractères.";
        if (normalized.Length > MaxLength)
            return $"Le handle ne peut pas dépasser {MaxLength} caractères.";
        if (!HandleRegex().IsMatch(normalized))
            return "Le handle ne peut contenir que des lettres minuscules, chiffres et underscores.";
        if (IsReserved(normalized))
            return "Ce handle est réservé.";
        return null;
    }

    public static string? ValidateBio(string? raw)
    {
        if (raw is null)
            return null;
        if (raw.Length > BioMaxLength)
            return $"La bio ne peut pas dépasser {BioMaxLength} caractères.";
        return null;
    }

    /// <summary>
    /// Builds a candidate handle base from a display name: lowercases, strips accents,
    /// keeps [a-z0-9_], collapses the rest, and pads/truncates to the allowed length.
    /// Never returns a reserved or empty value (falls back to "user").
    /// </summary>
    public static string SlugifyBase(string? displayName)
    {
        var normalized = (displayName ?? string.Empty).Normalize(NormalizationForm.FormD);
        var sb = new StringBuilder(normalized.Length);
        foreach (var ch in normalized)
        {
            if (CharUnicodeInfo.GetUnicodeCategory(ch) == UnicodeCategory.NonSpacingMark)
                continue;
            var lower = char.ToLowerInvariant(ch);
            if (lower is (>= 'a' and <= 'z') or (>= '0' and <= '9'))
                sb.Append(lower);
            else if (lower is ' ' or '-' or '_' or '.')
                sb.Append('_');
        }

        var slug = sb.ToString().Trim('_');
        while (slug.Contains("__", StringComparison.Ordinal))
            slug = slug.Replace("__", "_", StringComparison.Ordinal);

        if (slug.Length > MaxLength)
            slug = slug[..MaxLength];
        if (slug.Length == 0)
            slug = "member";
        else if (slug.Length < MinLength)
            slug = slug.PadRight(MinLength, '0');

        if (IsReserved(slug))
            slug = slug.Length < MaxLength ? slug + "0" : slug[..(MaxLength - 1)] + "0";

        return slug;
    }
}
