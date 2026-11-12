using System.Globalization;

namespace MoviePicker.Api.Application.UseCases.MovieShare;

public static class MovieSlug
{
    private const int MaxTmdbIdDigits = 9;

    public static int? TmdbIdOf(string? movieRef)
    {
        if (string.IsNullOrEmpty(movieRef))
            return null;

        var dash = movieRef.IndexOf('-');
        var digits = dash < 0 ? movieRef : movieRef[..dash];
        return digits.Length is > 0 and <= MaxTmdbIdDigits
            && digits.All(char.IsAsciiDigit)
            && int.TryParse(digits, NumberStyles.None, CultureInfo.InvariantCulture, out var tmdbId)
            && tmdbId > 0
            ? tmdbId
            : null;
    }
}
