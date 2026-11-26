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
        var tally = (await _events.TallyHeldByGroupIdsAsync([group.Id], now, ct)).FirstOrDefault();
        if (open.Count == 0 && tally is null)
            return FriendGroupNightsView.None;

        var viewer = await ViewerOfAsync(viewerId, [group], ct);
        var upcoming = viewer.Summarize(open.Where(night => viewer.IsOffered(night, now) && group.KeepsNight(night)), now)
            .Where(MyEventSummaryEnricher.IsStillJoinable)
            .OrderBy(IsOnHold)
            .ThenBy(MyEventSummaryEnricher.StartInstant)
            .ToList();
        var finishedWithFilm = tally is null
            ? []
            : await _events.ListLatestHeldByGroupIdAsync(group.Id, now, PastNightsShown, ct);
        var past = viewer.Summarize(finishedWithFilm, now).ToList();

        var enrichedUpcoming = await _summaries.EnrichAsync(viewerId, upcoming, NoWinners, MyEventSummaryDetail.Previews, NoRatingOpen, ct);
        var enrichedPast = await _summaries.EnrichAsync(
            viewerId,
            past,
            finishedWithFilm.ToDictionary(night => night.Id, night => night.GetWinnerMovieIds()),
            MyEventSummaryDetail.Ratings,
            finishedWithFilm.Where(night => night.IsRatingOpen(now)).Select(night => night.Id).ToHashSet(),
            ct);

        var covers = await _showcases.CoversAsync(tally is null ? [] : [tally.LastNight], ct);
        return new FriendGroupNightsView(
            enrichedUpcoming,
            enrichedPast,
            await ParticipantIdsAsync(upcoming, ct),
            FriendGroupShowcaseReader.Stats(tally),
            tally is null ? null : covers.GetValueOrDefault(tally.LastNight.Id));
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
        var showcases = await ShowcasesAsync(groups, await _events.TallyHeldByGroupIdsAsync(groupIds, now, ct), ct);
        var open = await _events.ListOpenByGroupIdsAsync(groupIds, now, ct);
        var upcoming = FriendGroup.NightsKeptBy(open, groups)
            .Where(night => !night.IsFinished(now) && !night.HasRemoved(viewerId))
            .ToList();
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
            await _summaries.EnrichAsync(viewerId, next, NoWinners, MyEventSummaryDetail.Previews, NoRatingOpen, ct),
            showcases);
    }

    private async Task<IReadOnlyList<FriendGroupShowcaseResponse>> ShowcasesAsync(
        IReadOnlyList<FriendGroup> groups,
        IReadOnlyList<HeldGroupNightTally> tallies,
        CancellationToken ct)
    {
        var tallyByGroup = tallies.ToDictionary(tally => tally.GroupId, StringComparer.Ordinal);
        var covers = await _showcases.CoversAsync(tallies.Select(tally => tally.LastNight).ToList(), ct);
        return groups
            .Select(group =>
            {
                var tally = tallyByGroup.GetValueOrDefault(group.Id);
                return new FriendGroupShowcaseResponse
                {
                    GroupId = group.Id,
                    NightCount = tally?.NightCount ?? 0,
                    Cover = tally is null ? null : covers.GetValueOrDefault(tally.LastNight.Id)
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

        public bool IsOffered(Event night, DateTimeOffset now) => !night.IsFinished(now) && !night.HasRemoved(UserId);
    }
}
