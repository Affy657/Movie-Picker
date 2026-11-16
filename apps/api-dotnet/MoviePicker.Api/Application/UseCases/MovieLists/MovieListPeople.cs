using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Domain.Entities;

namespace MoviePicker.Api.Application.UseCases.MovieLists;

public sealed class MovieListPeople
{
    private readonly Dictionary<string, UserCard> _cards;

    private MovieListPeople(Dictionary<string, UserCard> cards)
    {
        _cards = cards;
    }

    public static async Task<MovieListPeople> LoadAsync(
        IUserRepository users,
        IEnumerable<string> userIds,
        CancellationToken ct)
    {
        var ids = userIds.Where(id => !string.IsNullOrEmpty(id)).Distinct(StringComparer.Ordinal).ToList();
        var cards = ids.Count == 0 ? [] : await users.ListCardsByIdsAsync(ids, ct);
        return new MovieListPeople(cards.DistinctBy(card => card.Id, StringComparer.Ordinal).ToDictionary(card => card.Id, StringComparer.Ordinal));
    }

    public static Task<MovieListPeople> LoadAsync(IUserRepository users, MovieList list, CancellationToken ct) =>
        LoadAsync(users, [.. list.PreviewMemberIds(), .. list.Items.Select(list.AuthorOf)], ct);

    public MovieListPersonResponse? Find(string? userId) =>
        userId is not null && _cards.TryGetValue(userId, out var card) ? ToPerson(card) : null;

    public MovieListPersonResponse OwnerOf(string ownerId) => Find(ownerId) ?? new MovieListPersonResponse { UserId = ownerId };

    public MovieListAudience AudienceOf(string viewerId, MovieListSummary summary) =>
        AudienceOf(viewerId, summary.OwnerId, summary.MemberCount, summary.PreviewMemberIds);

    public MovieListAudience AudienceOf(string viewerId, MovieList list) =>
        AudienceOf(viewerId, list.OwnerId, list.MemberCount, list.PreviewMemberIds());

    public MovieListPersonResponse? AuthorOf(MovieList list, MovieListItem item) => Find(list.AuthorOf(item));

    private MovieListAudience AudienceOf(string viewerId, string ownerId, int memberCount, IReadOnlyList<string> previewIds) =>
        new(
            viewerId == ownerId ? MovieListRole.Owner : MovieListRole.Member,
            OwnerOf(ownerId),
            memberCount,
            [.. previewIds.Select(id => id == ownerId ? OwnerOf(id) : Find(id)).OfType<MovieListPersonResponse>()]);

    private static MovieListPersonResponse ToPerson(UserCard card) => new()
    {
        UserId = card.Id,
        Handle = PublicHandleResolver.Resolve(card),
        DisplayName = card.DisplayName,
        AvatarId = card.AvatarId
    };
}
