using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Domain.Entities;

namespace MoviePicker.Api.Application.UseCases.LetterboxdImport;

public static class LetterboxdPendingChoiceKey
{
    private const string WatchedPrefix = "watched:";

    public static string Of(LetterboxdImportRowResponse choice)
    {
        var film = string.IsNullOrEmpty(choice.LetterboxdSlug) ? $"{choice.Title}|{choice.Year}" : choice.LetterboxdSlug;
        return choice.Target == LetterboxdImportTarget.Watched ? WatchedPrefix + film : film;
    }

    public static LetterboxdImportTarget TargetOf(string key) =>
        IsWatched(key) ? LetterboxdImportTarget.Watched : LetterboxdImportTarget.Watchlist;

    private static bool IsWatched(string key) => key.StartsWith(WatchedPrefix, StringComparison.Ordinal);

    public static HashSet<string> WatchedSlugsOf(IEnumerable<string>? keys) =>
        (keys ?? [])
            .Where(IsWatched)
            .Select(key => key[WatchedPrefix.Length..])
            .ToHashSet(StringComparer.OrdinalIgnoreCase);
}
