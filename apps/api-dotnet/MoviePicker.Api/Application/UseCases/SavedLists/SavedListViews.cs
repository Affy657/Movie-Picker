using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.UseCases.UserMovies;
using MoviePicker.Api.Domain.Entities;

namespace MoviePicker.Api.Application.UseCases.SavedLists;

public static class SavedListViews
{
    public static SavedListSummaryResponse Summary(SavedList saved, ListSourceContent content, WatchedKeys watched) => new()
    {
        Id = saved.Id,
        SourceType = saved.SourceType,
        SourceId = saved.SourceId,
        Name = content.Name ?? (saved.Name.Length > 0 ? saved.Name : null),
        Description = content.Description,
        Creator = content.Creator is { } creator ? ListCreatorResponse.From(creator) : null,
        ItemCount = content.Titles.Count,
        PosterPaths = content.PosterPaths,
        WatchedCount = watched.CountAmong(content.Keys),
        CreatedAt = saved.CreatedAt,
        Unavailable = !content.IsAvailable,
        UnavailableReason = content.UnavailableReason,
        CopyAvailable = content.IsAvailable || saved.Snapshot.Count > 0
    };

    public static async Task<SavedListSummaryResponse> ReadSummaryAsync(
        this ListSourceReader sources,
        WatchedHistoryReader history,
        SavedList saved,
        ListSourceContent? alreadyRead,
        CancellationToken ct)
    {
        var contentTask = alreadyRead is null ? sources.ReadAsync(saved.Source, ct) : Task.FromResult(alreadyRead);
        var (content, watched) = await ReadWithHistoryAsync(contentTask, history, saved, ct);
        return Summary(saved, content, watched);
    }

    public static async Task<SavedListResponse> ReadDetailAsync(
        this ListSourceReader sources,
        WatchedHistoryReader history,
        SavedList saved,
        CancellationToken ct)
    {
        var (content, watched) = await ReadWithHistoryAsync(sources.ReadAndKeepWhatIsSeenAsync(saved, ct), history, saved, ct);
        IReadOnlyList<MovieListItemResponse> items =
        [
            .. content.Titles.Select(title => MovieListItemResponse.From(
                title.ToListItem(saved.CreatedAt),
                watched.Contains(title.TmdbId, title.MediaType),
                addedBy: null))
        ];
        return new SavedListResponse(Summary(saved, content, watched), items);
    }

    private static async Task<(ListSourceContent Content, WatchedKeys Watched)> ReadWithHistoryAsync(
        Task<ListSourceContent> contentTask,
        WatchedHistoryReader history,
        SavedList saved,
        CancellationToken ct)
    {
        var watchedTask = history.ReadKeysAsync(saved.OwnerId, ct);
        await Task.WhenAll(contentTask, watchedTask);
        return (await contentTask, await watchedTask);
    }
}
