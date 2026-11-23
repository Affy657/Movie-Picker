using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.SearchUsers;
using MoviePicker.Api.Domain;
using MoviePicker.Api.Domain.Entities;

namespace MoviePicker.Api.Application.UseCases.GlobalSearch;

public sealed record MySpaceMatches(
    IReadOnlyList<GlobalSearchNightItem> Nights,
    IReadOnlyList<GlobalSearchGroupItem> Groups,
    IReadOnlyList<GlobalSearchListItem> Lists);

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
        var groupsTask = _groups.ListAdmittingAsync(userId, ct);
        var joinedTask = _participants.ListDistinctEventIdsByUserIdAsync(userId, ct);
        var listsTask = _lists.SearchSummariesAsync(userId, query, GlobalSearchHandler.SectionLimit, ct);
        var groups = await groupsTask;
        var joined = await joinedTask;
        var nights = await _events.ListTitleMatchesAsync(userId, joined, groups.Select(group => group.Id).ToList(), query, ct);
        var lists = await listsTask;

        return new MySpaceMatches(
            VisibleNights(nights, userId, joined, groups),
            groups
                .Where(group => UserSearchPolicy.Contains(group.Name, query))
                .Take(GlobalSearchHandler.SectionLimit)
                .Select(group => new GlobalSearchGroupItem { Id = group.Id, Name = group.Name, MemberCount = group.MemberCount })
                .ToList(),
            lists
                .Select(list => new GlobalSearchListItem
                {
                    Id = list.Id,
                    Name = list.Name,
                    ItemCount = list.ItemCount,
                    PosterPath = list.PosterPaths.Count > 0 ? list.PosterPaths[0] : null
                })
                .ToList());
    }

    private List<GlobalSearchNightItem> VisibleNights(
        IReadOnlyList<Event> matches, string userId, IReadOnlyList<string> joinedIds, IReadOnlyList<FriendGroup> groups)
    {
        var utcNow = _clock.GetUtcNow();
        var joined = joinedIds.ToHashSet(StringComparer.Ordinal);
        var keptByMyGroups = FriendGroup.NightsKeptBy(matches, groups).Select(night => night.Id).ToHashSet(StringComparer.Ordinal);

        return matches
            .DistinctBy(night => night.Id)
            .Select(night => (Night: night, IsFinished: night.IsFinished(utcNow), StartTicks: StartOf(night).UtcTicks))
            .Where(entry => entry.Night.CreatorUserId == userId
                            || joined.Contains(entry.Night.Id)
                            || (keptByMyGroups.Contains(entry.Night.Id) && !entry.IsFinished))
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

    private static DateTimeOffset StartOf(Event night) =>
        EventSchedule.TryGetStartUtc(night.Date, night.Time, out var start) ? start : night.CreatedAt;
}
