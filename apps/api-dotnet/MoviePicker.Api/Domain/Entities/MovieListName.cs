using System.Globalization;
using System.Text;

namespace MoviePicker.Api.Domain.Entities;

public static class MovieListName
{
    private static readonly HashSet<string> ReservedKeys =
        [Key("À voir"), Key("Watchlist"), Key("Films vus"), Key("Watched")];

    public static string Key(string name)
    {
        var words = name.Split((char[]?)null, StringSplitOptions.RemoveEmptyEntries);
        var folded = string.Join(' ', words)
            .Normalize(NormalizationForm.FormD)
            .Where(character => CharUnicodeInfo.GetUnicodeCategory(character) != UnicodeCategory.NonSpacingMark)
            .ToArray();
        return new string(folded).Normalize(NormalizationForm.FormC).ToLowerInvariant();
    }

    public static bool IsReserved(string name) => ReservedKeys.Contains(Key(name));
}
