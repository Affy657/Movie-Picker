using MoviePicker.Api.Domain.Entities;

namespace MoviePicker.Api.Application.Ports;

public interface IMovieListRepository
{
    Task<IReadOnlyList<MovieListSummary>> ListSummariesAsync(string userId, CancellationToken ct = default);

    Task<IReadOnlyList<MovieListSummary>> ListPublicSummariesAsync(string ownerId, CancellationToken ct = default);

    Task<long> CountPublicByOwnerAsync(string ownerId, CancellationToken ct = default);

    Task<IReadOnlyList<MovieList>> ListByOwnerAsync(string ownerId, CancellationToken ct = default);

    Task<IReadOnlyList<MovieList>> ListJoinedAsync(string userId, CancellationToken ct = default);

    Task<IReadOnlyList<MovieList>> ListInvitingAsync(string userId, CancellationToken ct = default);

    Task<IReadOnlySet<string>> ListPendingInvitationIdsAsync(
        string userId,
        IReadOnlyCollection<string> listIds,
        DateTimeOffset now,
        CancellationToken ct = default);

    Task<long> CountByOwnerAsync(string ownerId, CancellationToken ct = default);

    Task<bool> IsNameTakenAsync(string ownerId, string nameKey, string? exceptListId, CancellationToken ct = default);

    Task<MovieList?> GetAsync(string userId, string listId, CancellationToken ct = default);

    Task<MovieList?> FindAsync(string listId, CancellationToken ct = default);

    Task<IReadOnlyList<MovieList>> ListByIdsAsync(IReadOnlyCollection<string> listIds, CancellationToken ct = default);

    Task<MovieList?> FindByInviteTokenAsync(string token, CancellationToken ct = default);

    Task<MovieList> AddAsync(MovieList list, CancellationToken ct = default);

    Task<MovieList?> UpdateDetailsAsync(
        string ownerId,
        string listId,
        string name,
        string? description,
        bool isPublic,
        DateTimeOffset updatedAt,
        CancellationToken ct = default);

    Task<bool> DeleteAsync(string ownerId, string listId, CancellationToken ct = default);

    Task<bool> AddItemAsync(
        string userId,
        string listId,
        MovieListItem item,
        int maxItems,
        CancellationToken ct = default);

    Task<bool> RemoveItemAsync(
        string userId,
        string listId,
        MovieListTitle title,
        DateTimeOffset updatedAt,
        CancellationToken ct = default);

    Task<long> DeleteAllForOwnerAsync(string ownerId, CancellationToken ct = default);

    Task<bool> AddInvitationAsync(
        string listId,
        MovieListInvitation invitation,
        int maxSeats,
        CancellationToken ct = default);

    Task<bool> RemoveInvitationAsync(string listId, string userId, CancellationToken ct = default);

    Task<bool> AcceptInvitationAsync(string listId, MovieListMember member, CancellationToken ct = default);

    Task<bool> JoinByInviteTokenAsync(
        string token,
        MovieListMember member,
        DateTimeOffset now,
        int maxSeats,
        CancellationToken ct = default);

    Task<bool> RemoveMemberAsync(string listId, string userId, bool disableInviteLink, CancellationToken ct = default);

    Task<bool> SetInviteLinkAsync(
        string ownerId,
        string listId,
        MovieListInviteLink link,
        CancellationToken ct = default);

    Task<bool> DisableInviteLinkAsync(string ownerId, string listId, CancellationToken ct = default);

    Task<long> RemoveFromOthersListsAsync(string userId, CancellationToken ct = default);
}

public sealed record MovieListTitle(int TmdbId, MovieMediaType MediaType);

public sealed record MovieListSummary(
    string Id,
    string OwnerId,
    string Name,
    string? Description,
    bool IsPublic,
    int ItemCount,
    IReadOnlyList<string> PosterPaths,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt,
    IReadOnlyList<MovieListTitle> Titles,
    int MemberCount,
    IReadOnlyList<string> PreviewMemberIds)
{
    public static MovieListSummary Of(MovieList list) => new(
        list.Id,
        list.OwnerId,
        list.Name,
        list.Description,
        list.IsPublic,
        list.Items.Count,
        list.RecentPosterPaths(),
        list.CreatedAt,
        list.UpdatedAt,
        [.. list.Items.Select(item => new MovieListTitle(item.TmdbId, item.MediaType))],
        list.MemberCount,
        list.PreviewMemberIds());
}
