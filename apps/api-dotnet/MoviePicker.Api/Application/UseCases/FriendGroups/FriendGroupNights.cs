using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.ListMyEvents;
using MoviePicker.Api.Domain.Entities;

namespace MoviePicker.Api.Application.UseCases.FriendGroups;

public sealed class FriendGroupNightsReader
{
    public const int PastNightsShown = 60;

    private static readonly IReadOnlyDictionary<string, IReadOnlyList<string>> NoWinners =
        new Dictionary<string, IReadOnlyList<string>>();

    private static readonly IReadOnlySet<string> NoRatingOpen = new HashSet<string>();

    private readonly IEventRepository _events;
    private readonly IParticipantRepository _participants;
    private readonly MyEventSummaryEnricher _summaries;
    private readonly FriendGroupShowcaseReader _showcases;
    private readonly TimeProvider _clock;

    public FriendGroupNightsReader(
        IEventRepository events,
        IParticipantRepository participants,
        MyEventSummaryEnricher summaries,
        FriendGroupShowcaseReader showcases,
        TimeProvider clock)
    {
        _events = events;
        _participants = participants;
        _summaries = summaries;
        _showcases = showcases;
        _clock = clock;
    }

    public async Task<FriendGroupNightsView> ReadAsync(string viewerId, FriendGroup group, CancellationToken ct)
    {
        var now = _clock.GetUtcNow();
        var open = await _events.ListOpenByGroupIdsAsync([group.Id], now, ct);
        var held = await _events.ListHeldByGroupIdsAsync([group.Id], now, ct);
        if (open.Count == 0 && held.Count == 0)
            return FriendGroupNightsView.None;

        var viewer = await ViewerOfAsync(viewerId, [group], ct);
        var upcoming = viewer.Summarize(open.Where(night => !night.IsFinished(now) && group.KeepsNight(night)), now)
            .Where(MyEventSummaryEnricher.IsStillJoinable)
            .OrderBy(IsOnHold)
            .ThenBy(MyEventSummaryEnricher.StartInstant)
            .ToList();
        var finishedWithFilm = await ShownPastNightsAsync(held, ct);
        var past = viewer.Summarize(finishedWithFilm, now).ToList();

        var enrichedUpcoming = await _summaries.EnrichAsync(viewerId, upcoming, NoWinners, false, NoRatingOpen, ct);
        var enrichedPast = await _summaries.EnrichAsync(
            viewerId,
            past,
            finishedWithFilm.ToDictionary(night => night.Id, night => night.GetWinnerMovieIds()),
            true,
            finishedWithFilm.Where(night => night.IsRatingOpen(now)).Select(night => night.Id).ToHashSet(),
            ct);

        var covers = await _showcases.CoversAsync(held.Take(1).ToList(), ct);
        return new FriendGroupNightsView(
            enrichedUpcoming,
            enrichedPast,
            await ParticipantIdsAsync(upcoming, ct),
            await _showcases.StatsAsync(held, ct),
            held.Count == 0 ? null : covers.GetValueOrDefault(held[0].Id));
    }

    public async Task<FriendGroupListNights> ReadListAsync(
        string viewerId,
        IReadOnlyList<FriendGroup> groups,
        CancellationToken ct)
    {
        if (groups.Count == 0)
            return new FriendGroupListNights([], []);

        var now = _clock.GetUtcNow();
        var groupIds = groups.Select(group => group.Id).ToList();
        var showcases = await ShowcasesAsync(groups, await _events.ListHeldByGroupIdsAsync(groupIds, now, ct), ct);
        var open = await _events.ListOpenByGroupIdsAsync(groupIds, now, ct);
        var upcoming = FriendGroup.NightsKeptBy(open, groups).Where(night => !night.IsFinished(now)).ToList();
        if (upcoming.Count == 0)
            return new FriendGroupListNights([], showcases);

        var viewer = await ViewerOfAsync(viewerId, groups, ct);
        var next = viewer.Summarize(upcoming, now)
            .Where(summary => MyEventSummaryEnricher.IsStillJoinable(summary) && !IsOnHold(summary))
            .GroupBy(summary => summary.GroupId)
            .Select(perGroup => perGroup.MinBy(MyEventSummaryEnricher.StartInstant)!)
            .OrderBy(MyEventSummaryEnricher.StartInstant)
            .ToList();
        return new FriendGroupListNights(
            await _summaries.EnrichAsync(viewerId, next, NoWinners, false, NoRatingOpen, ct),
            showcases);
    }

    private async Task<IReadOnlyList<Event>> ShownPastNightsAsync(IReadOnlyList<HeldGroupNight> held, CancellationToken ct)
    {
        var shownIds = held.Take(PastNightsShown).Select(night => night.Id).ToList();
        if (shownIds.Count == 0)
            return [];

        var loaded = (await _events.ListByIdsAsync(shownIds, ct)).ToDictionary(night => night.Id, StringComparer.Ordinal);
        return shownIds.Select(loaded.GetValueOrDefault).OfType<Event>().ToList();
    }

    private async Task<IReadOnlyList<FriendGroupShowcaseResponse>> ShowcasesAsync(
        IReadOnlyList<FriendGroup> groups,
        IReadOnlyList<HeldGroupNight> heldNights,
        CancellationToken ct)
    {
        var heldByGroup = heldNights.ToLookup(night => night.GroupId);
        var lastNights = groups.Select(group => heldByGroup[group.Id].FirstOrDefault()).OfType<HeldGroupNight>().ToList();
        var covers = await _showcases.CoversAsync(lastNights, ct);
        return groups
            .Select(group =>
            {
                var held = heldByGroup[group.Id].ToList();
                return new FriendGroupShowcaseResponse
                {
                    GroupId = group.Id,
                    NightCount = held.Count,
                    Cover = held.Count == 0 ? null : covers.GetValueOrDefault(held[0].Id)
                };
            })
            .ToList();
    }

    private static bool IsOnHold(MyEventSummaryDto summary) => summary.Lifecycle == MyEventListLifecycle.Pending;

    private async Task<IReadOnlyList<string>> ParticipantIdsAsync(List<MyEventSummaryDto> upcoming, CancellationToken ct)
    {
        var next = upcoming.Find(summary => !IsOnHold(summary));
        if (next is null)
            return [];

        var participants = await _participants.ListByEventIdAsync(next.Id, ct);
        return participants.Select(participant => participant.UserId).OfType<string>().Distinct().ToList();
    }

    private async Task<NightViewer> ViewerOfAsync(string viewerId, IReadOnlyList<FriendGroup> groups, CancellationToken ct)
    {
        var joined = await _participants.ListDistinctEventIdsByUserIdAsync(viewerId, ct);
        return new NightViewer(viewerId, joined.ToHashSet(), groups.ToDictionary(group => group.Id, group => group.Name));
    }

    private sealed record NightViewer(
        string UserId,
        IReadOnlySet<string> JoinedNightIds,
        IReadOnlyDictionary<string, string> GroupNames)
    {
        public MyEventSummaryDto Summarize(Event night, DateTimeOffset now) =>
            MyEventSummaryEnricher.Summarize(
                night,
                isCreator: night.CreatorUserId == UserId,
                isParticipant: JoinedNightIds.Contains(night.Id),
                GroupNames,
                now);

        public IEnumerable<MyEventSummaryDto> Summarize(IEnumerable<Event> nights, DateTimeOffset now) =>
            nights.Select(night => Summarize(night, now));
    }
}
