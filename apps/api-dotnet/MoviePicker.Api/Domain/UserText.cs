using System.Globalization;
using System.Text;

namespace MoviePicker.Api.Domain;

public static class UserText
{
    private static readonly HashSet<char> BlankLetters = ['\u115F', '\u1160', '\u3164', '\uFFA0', '\u2800'];

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
        foreach (var character in text)
        {
            if (!IsInvisible(character))
                return true;
        }
        return false;
    }

    private static bool IsDirectionalControl(char character) =>
        character is >= '\u202A' and <= '\u202E' or >= '\u2066' and <= '\u2069';

    private static bool IsInvisible(char character)
    {
        if (char.IsWhiteSpace(character) || char.IsControl(character) || BlankLetters.Contains(character))
            return true;
        return CharUnicodeInfo.GetUnicodeCategory(character)
            is UnicodeCategory.Format
            or UnicodeCategory.NonSpacingMark
            or UnicodeCategory.EnclosingMark;
    }
}
