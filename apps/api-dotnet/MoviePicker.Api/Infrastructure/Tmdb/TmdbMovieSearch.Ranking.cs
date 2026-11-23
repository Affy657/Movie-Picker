using MoviePicker.Api.Application.Ports;

namespace MoviePicker.Api.Infrastructure.Tmdb;

public sealed partial class TmdbMovieSearch
{
    private enum TitleResemblance
    {
        None,
        WordStartsWithQuery,
        ContainsQueryWords,
        EqualsQuery
    }

    private static List<TmdbSearchItem> RankByTitleResemblance(string query, IEnumerable<TmdbSearchItem> items)
    {
        var normalizedQuery = NormalizeSearchText(query);
        return items
            .OrderByDescending(item => ResemblanceOf(item, normalizedQuery))
            .Take(MaxResults)
            .ToList();
    }

    private static List<TmdbSearchItem> PersonFirstAfterExactTitles(
        string query,
        IReadOnlyList<TmdbSearchItem> titleMatches,
        IReadOnlyList<TmdbSearchItem> credits)
    {
        var normalizedQuery = NormalizeSearchText(query);
        var exactTitles = titleMatches
            .Where(item => ResemblanceOf(item, normalizedQuery) == TitleResemblance.EqualsQuery)
            .ToList();
        var otherTitles = RankByTitleResemblance(query, titleMatches.Except(exactTitles));
        return exactTitles
            .Concat(credits)
            .Concat(otherTitles)
            .DistinctBy(item => (item.Id, item.MediaType))
            .Take(MaxResults)
            .ToList();
    }

    private static TitleResemblance ResemblanceOf(TmdbSearchItem item, string normalizedQuery)
    {
        var title = ResemblanceOf(item.Title, normalizedQuery);
        var originalTitle = ResemblanceOf(item.OriginalTitle, normalizedQuery);
        return title >= originalTitle ? title : originalTitle;
    }

    private static TitleResemblance ResemblanceOf(string? title, string normalizedQuery)
    {
        if (string.IsNullOrEmpty(title) || normalizedQuery.Length == 0)
            return TitleResemblance.None;

        var normalizedTitle = NormalizeSearchText(title);
        if (normalizedTitle == normalizedQuery)
            return TitleResemblance.EqualsQuery;

        var paddedTitle = $" {normalizedTitle} ";
        if (paddedTitle.Contains($" {normalizedQuery} ", StringComparison.Ordinal))
            return TitleResemblance.ContainsQueryWords;

        return paddedTitle.Contains($" {normalizedQuery}", StringComparison.Ordinal)
            ? TitleResemblance.WordStartsWithQuery
            : TitleResemblance.None;
    }
}
