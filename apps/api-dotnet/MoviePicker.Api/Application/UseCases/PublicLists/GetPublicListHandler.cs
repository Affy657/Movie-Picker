using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.UserMovies;

namespace MoviePicker.Api.Application.UseCases.PublicLists;

public sealed class GetPublicListHandler : IGetPublicListHandler
{
    private readonly PublicListReader _publicLists;
    private readonly WatchedHistoryReader _history;

    public GetPublicListHandler(PublicListReader publicLists, WatchedHistoryReader history)
    {
        _publicLists = publicLists;
        _history = history;
    }

    public async Task<PublicListResponse> HandleAsync(
        string handle,
        string listId,
        string? viewerId,
        CancellationToken ct = default)
    {
        var (creator, list) = await _publicLists.RequireAsync(handle, listId, ct);
        var watched = string.IsNullOrEmpty(viewerId) ? null : await _history.ReadKeysAsync(viewerId, ct);
        return new PublicListResponse
        {
            Id = list.Id,
            Name = list.Name,
            Description = list.Description,
            CreatedAt = list.CreatedAt,
            UpdatedAt = list.UpdatedAt,
            ItemCount = list.Items.Count,
            MemberCount = list.MemberCount,
            WatchedCount = watched?.CountAmong(list.Items.Select(item => new MovieListTitle(item.TmdbId, item.MediaType))),
            Creator = ListCreatorResponse.From(creator),
            ViewerRole = string.IsNullOrEmpty(viewerId) ? null : list.RoleOf(viewerId),
            Items =
            [
                .. list.Items.Select(item => MovieListItemResponse.From(
                    item,
                    watched?.Contains(item.TmdbId, item.MediaType) ?? false,
                    addedBy: null))
            ]
        };
    }
}
