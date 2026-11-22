using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;

namespace MoviePicker.Api.Application.UseCases.GlobalSearch;

public sealed class PublicListSearch
{
    private const int CandidateLimit = 12;

    private readonly IMovieListRepository _lists;
    private readonly IUserRepository _users;

    public PublicListSearch(IMovieListRepository lists, IUserRepository users)
    {
        _lists = lists;
        _users = users;
    }

    public async Task<IReadOnlyList<GlobalSearchPublicListItem>> FindAsync(
        string query, IReadOnlySet<string> excludedListIds, CancellationToken ct)
    {
        var candidates = (await _lists.SearchPublicSummariesAsync(query, CandidateLimit, ct))
            .Where(list => !excludedListIds.Contains(list.Id))
            .ToList();
        if (candidates.Count == 0)
            return [];

        var owners = (await _users.ListCardsByIdsAsync(candidates.Select(list => list.OwnerId).Distinct().ToList(), ct))
            .Where(owner => owner.IsProfilePublic && !string.IsNullOrEmpty(owner.Handle))
            .ToDictionary(owner => owner.Id, StringComparer.Ordinal);

        return candidates
            .Where(list => owners.ContainsKey(list.OwnerId))
            .Take(GlobalSearchHandler.SectionLimit)
            .Select(list => new GlobalSearchPublicListItem
            {
                Id = list.Id,
                Name = list.Name,
                ItemCount = list.ItemCount,
                PosterPath = list.PosterPaths.Count > 0 ? list.PosterPaths[0] : null,
                OwnerHandle = owners[list.OwnerId].Handle!,
                OwnerDisplayName = owners[list.OwnerId].DisplayName
            })
            .ToList();
    }
}
