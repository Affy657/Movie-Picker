using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.ListMyEvents;
using MoviePicker.Api.Domain.Entities;

namespace MoviePicker.Api.Application.UseCases.FriendGroups;

public sealed class FriendGroupNightsReader
{
    public const int PastNightsShown = 12;

    private static readonly IReadOnlyDictionary<string, IReadOnlyList<string>> NoWinners =
        new Dictionary<string, IReadOnlyList<string>>();

    private static readonly IReadOnlySet<string> NoRatingOpen = new HashSet<string>();

    private readonly IEventRepository _events;
    private readonly IParticipantRepository _participants;
    private readonly MyEventSummaryEnricher _summaries;
    private readonly TimeProvider _clock;

    public FriendGroupNightsReader(
        IEventRepository events,
        IParticipantRepository participants,
        MyEventSummaryEnricher summaries,
        TimeProvider clock)
    {
        _events = events;
        _participants = participants;
        _summaries = summaries;
        _clock = clock;
    }

    public async Task<FriendGroupNightsView> ReadAsync(string viewerId, FriendGroup group, CancellationToken ct)
    {
        var nights = await _events.ListByGroupIdsAsync([group.Id], ct);
        if (nights.Count == 0)
            return FriendGroupNightsView.None;

        var now = _clock.GetUtcNow();
        var viewer = await ViewerOfAsync(viewerId, [group], ct);
        var upcoming = viewer.Summarize(nights.Where(night => !night.IsFinished(now) && group.KeepsNight(night)), now)
            .Where(MyEventSummaryEnricher.IsStillJoinable)
            .OrderBy(MyEventSummaryEnricher.StartInstant)
            .ToList();
        var finishedWithFilm = nights
            .Where(night => night.IsFinished(now) && night.HasWinner)
            .OrderByDescending(night => MyEventSummaryEnricher.StartInstant(viewer.Summarize(night, now)))
            .Take(PastNightsShown)
            .ToList();
        var past = viewer.Summarize(finishedWithFilm, now).ToList();

        var enrichedUpcoming = await _summaries.EnrichAsync(viewerId, upcoming, NoWinners, false, NoRatingOpen, ct);
        var enrichedPast = await _summaries.EnrichAsync(
            viewerId,
            past,
            finishedWithFilm.ToDictionary(night => night.Id, night => night.GetWinnerMovieIds()),
            true,
            finishedWithFilm.Where(night => night.IsRatingOpen(now)).Select(night => night.Id).ToHashSet(),
            ct);

        return new FriendGroupNightsView(enrichedUpcoming, enrichedPast, await ParticipantIdsAsync(upcoming, ct));
    }

    public async Task<IReadOnlyList<MyEventSummaryDto>> NextNightsAsync(
        string viewerId,
        IReadOnlyList<FriendGroup> groups,
        CancellationToken ct)
    {
        if (groups.Count == 0)
            return [];

        var nights = await _events.ListByGroupIdsAsync(groups.Select(group => group.Id).ToList(), ct);
        var now = _clock.GetUtcNow();
        var upcoming = FriendGroup.NightsKeptBy(nights, groups).Where(night => !night.IsFinished(now)).ToList();
        if (upcoming.Count == 0)
            return [];

        var viewer = await ViewerOfAsync(viewerId, groups, ct);
        var next = viewer.Summarize(upcoming, now)
            .Where(MyEventSummaryEnricher.IsStillJoinable)
            .GroupBy(summary => summary.GroupId)
            .Select(perGroup => perGroup.MinBy(MyEventSummaryEnricher.StartInstant)!)
            .OrderBy(MyEventSummaryEnricher.StartInstant)
            .ToList();
        return await _summaries.EnrichAsync(viewerId, next, NoWinners, false, NoRatingOpen, ct);
    }

    private async Task<IReadOnlyList<string>> ParticipantIdsAsync(List<MyEventSummaryDto> upcoming, CancellationToken ct)
    {
        if (upcoming.Count == 0)
            return [];

        var participants = await _participants.ListByEventIdAsync(upcoming[0].Id, ct);
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
