using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Domain.Exceptions;

namespace MoviePicker.Api.Application.UseCases.LetterboxdImport;

public static class LetterboxdListStatus
{
    private static readonly Dictionary<LetterboxdImportTarget, string> UnreadErrors = new()
    {
        [LetterboxdImportTarget.Watchlist] = ErrorCodes.LetterboxdWatchlistIncomplete,
        [LetterboxdImportTarget.Watched] = ErrorCodes.LetterboxdWatchedIncomplete
    };

    public static string UnreadError(LetterboxdImportTarget list) => UnreadErrors[list];

    public static IReadOnlyList<LetterboxdImportTarget> EnabledListsOf(User user) =>
        Enum.GetValues<LetterboxdImportTarget>().Where(list => IsEnabled(user, list)).ToList();

    public static LetterboxdListSync? Of(User user, LetterboxdImportTarget list)
    {
        if (user.LetterboxdListSyncs.TryGetValue(list, out var sync))
            return sync;
        return user.LetterboxdLastSyncAt is { } at ? SharedStatusOf(user, list, at) : null;
    }

    public static Dictionary<LetterboxdImportTarget, LetterboxdListSync> FollowingTheSharedStatus(User user) =>
        user.LetterboxdLastSyncAt is { } at
            ? EnabledListsOf(user)
                .Where(list => !user.LetterboxdListSyncs.ContainsKey(list))
                .ToDictionary(list => list, list => SharedStatusOf(user, list, at))
            : [];

    public static string? SharedErrorAfter(User user, IReadOnlyDictionary<LetterboxdImportTarget, LetterboxdListSync> stamped) =>
        EnabledListsOf(user)
            .Select(list => stamped.TryGetValue(list, out var sync) ? sync.Error : Of(user, list)?.Error)
            .FirstOrDefault(error => error is not null);

    private static bool IsEnabled(User user, LetterboxdImportTarget list) =>
        list == LetterboxdImportTarget.Watched ? user.LetterboxdSyncWatched : user.LetterboxdSyncWatchlist;

    private static LetterboxdListSync SharedStatusOf(User user, LetterboxdImportTarget list, DateTimeOffset at) =>
        new(at, SharedErrorFor(list, user.LetterboxdLastSyncError));

    private static string? SharedErrorFor(LetterboxdImportTarget list, string? error) =>
        UnreadErrors.Any(unread => unread.Key != list && unread.Value == error) ? null : error;
}
