using System.Globalization;
using MoviePicker.Api.Application.UseCases.Shared;

namespace MoviePicker.Api.Application.UseCases.EventInvitation;

public static class DefaultEventTitle
{
    private static readonly CultureInfo British = new("en-GB");

    public static bool Matches(string title, string date)
    {
        if (!DateOnly.TryParse(date, CultureInfo.InvariantCulture, DateTimeStyles.None, out var day))
            return false;

        var trimmed = title.Trim();
        return Suggestions(day).Any(suggestion => string.Equals(trimmed, suggestion, StringComparison.OrdinalIgnoreCase));
    }

    private static IEnumerable<string> Suggestions(DateOnly day)
    {
        foreach (var format in new[] { "dddd d MMMM", "dddd d MMMM yyyy" })
        {
            yield return "Soirée du " + day.ToString(format, SharePreviewContent.French);
            yield return "Movie night on " + day.ToString(format, British);
        }
    }
}
