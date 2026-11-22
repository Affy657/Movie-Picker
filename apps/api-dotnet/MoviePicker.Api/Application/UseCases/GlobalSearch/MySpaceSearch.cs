using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.SearchUsers;
using MoviePicker.Api.Domain;
using MoviePicker.Api.Domain.Entities;

namespace MoviePicker.Api.Application.UseCases.GlobalSearch;

public sealed record MySpaceMatches(
    IReadOnlyList<GlobalSearchNightItem> Nights,
    IReadOnlyList<GlobalSearchGroupItem> Groups,
    IReadOnlyList<GlobalSearchListItem> Lists,
    IReadOnlySet<string> MyListIds);

public sealed class MySpaceSearch
{
    private readonly IEventRepository _events;
    private readonly IParticipantRepository _participants;
    private readonly IFriendGroupRepository _groups;
    private readonly IMovieListRepository _lists;
    private readonly TimeProvider _clock;

    public MySpaceSearch(
        IEventRepository events,
        IParticipantRepository participants,
        IFriendGroupRepository groups,
        IMovieListRepository lists,
        TimeProvider clock)
    {
        _events = events;
        _participants = participants;
        _groups = groups;
        _lists = lists;
        _clock = clock;
    }

    public async Task<MySpaceMatches> FindAsync(string query, string userId, CancellationToken ct)
    {
        var groups = await _groups.ListAdmittingAsync(userId, ct);
        var nights = await SearchNightsAsync(query, userId, groups, ct);
        var lists = await _lists.ListSummariesAsync(userId, ct);

        return new MySpaceMatches(
            nights,
            groups
                .Where(group => UserSearchPolicy.Contains(group.Name, query))
                .Take(GlobalSearchHandler.SectionLimit)
                .Select(group => new GlobalSearchGroupItem { Id = group.Id, Name = group.Name, MemberCount = group.MemberCount })
                .ToList(),
            lists
                .Where(list => UserSearchPolicy.Contains(list.Name, query))
                .Take(GlobalSearchHandler.SectionLimit)
                .Select(list => new GlobalSearchListItem
                {
                    Id = list.Id,
                    Name = list.Name,
                    ItemCount = list.ItemCount,
                    PosterPath = list.PosterPaths.Count > 0 ? list.PosterPaths[0] : null
                })
                .ToList(),
            lists.Select(list => list.Id).ToHashSet(StringComparer.Ordinal));
    }

    private async Task<IReadOnlyList<GlobalSearchNightItem>> SearchNightsAsync(
        string query, string userId, IReadOnlyList<FriendGroup> groups, CancellationToken ct)
    {
        var utcNow = _clock.GetUtcNow();
        var created = await _events.ListAllByCreatorUserIdAsync(userId, ct);
        var joined = await ListOnlyJoinedAsync(userId, created, ct);
        var groupNights = await ListOpenGroupNightsAsync(groups, utcNow, ct);

        return created
            .Concat(joined)
            .Concat(groupNights)
            .DistinctBy(night => night.Id)
            .Where(night => UserSearchPolicy.Contains(night.Title, query))
            .Select(night => (Night: night, IsFinished: night.IsFinished(utcNow), StartTicks: StartOf(night).UtcTicks))
            .OrderBy(entry => entry.IsFinished)
            .ThenBy(entry => entry.IsFinished ? -entry.StartTicks : entry.StartTicks)
            .Take(GlobalSearchHandler.SectionLimit)
            .Select(entry => new GlobalSearchNightItem
            {
                Slug = entry.Night.Slug,
                Title = entry.Night.Title,
                Date = entry.Night.Date,
                Time = entry.Night.Time,
                IsFinished = entry.IsFinished
            })
            .ToList();
    }

    private async Task<IReadOnlyList<Event>> ListOnlyJoinedAsync(string userId, IReadOnlyList<Event> created, CancellationToken ct)
    {
        var createdIds = created.Select(night => night.Id).ToHashSet(StringComparer.Ordinal);
        var joinedIds = (await _participants.ListDistinctEventIdsByUserIdAsync(userId, ct))
            .Where(id => !createdIds.Contains(id))
            .ToList();
        return joinedIds.Count == 0 ? [] : await _events.ListByIdsAsync(joinedIds, ct);
    }

    private async Task<IEnumerable<Event>> ListOpenGroupNightsAsync(
        IReadOnlyList<FriendGroup> groups, DateTimeOffset utcNow, CancellationToken ct)
    {
        if (groups.Count == 0)
            return [];

        var nights = await _events.ListByGroupIdsAsync(groups.Select(group => group.Id).ToList(), ct);
        return FriendGroup.NightsKeptBy(nights, groups).Where(night => !night.IsFinished(utcNow));
    }

    private static DateTimeOffset StartOf(Event night) =>
        EventSchedule.TryGetStartUtc(night.Date, night.Time, out var start) ? start : night.CreatedAt;
}
