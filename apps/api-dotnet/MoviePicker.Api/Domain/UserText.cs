using System.Globalization;
using System.Text;

namespace MoviePicker.Api.Domain;

public static class UserText
{
    private static readonly HashSet<Rune> BlankLetters =
        [new Rune('\u115F'), new Rune('\u1160'), new Rune('\u3164'), new Rune('\uFFA0'), new Rune('\u2800')];

    public static string Clean(string? raw)
    {
        if (string.IsNullOrEmpty(raw))
            return string.Empty;

        var cleaned = new StringBuilder(raw.Length);
        foreach (var character in raw)
        {
            if (IsDirectionalControl(character))
                continue;
            if (char.IsControl(character))
            {
                if (char.IsWhiteSpace(character))
                    cleaned.Append(' ');
                continue;
            }
            cleaned.Append(character);
        }
        return cleaned.ToString().Trim();
    }

    public static bool HasVisibleCharacter(string text)
    {
        foreach (var rune in text.EnumerateRunes())
        {
            if (!IsInvisible(rune))
                return true;
        }
        return false;
    }

    private static bool IsDirectionalControl(char character) =>
        character is >= '\u202A' and <= '\u202E' or >= '\u2066' and <= '\u2069';

    private static bool IsInvisible(Rune rune)
    {
        if (Rune.IsWhiteSpace(rune) || Rune.IsControl(rune) || BlankLetters.Contains(rune))
            return true;
        return Rune.GetUnicodeCategory(rune)
            is UnicodeCategory.Format
            or UnicodeCategory.NonSpacingMark
            or UnicodeCategory.EnclosingMark;
    }
}
