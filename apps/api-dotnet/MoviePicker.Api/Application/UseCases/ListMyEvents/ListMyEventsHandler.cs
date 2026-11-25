using System.Linq;
using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Domain;
using MoviePicker.Api.Domain.Entities;

namespace MoviePicker.Api.Application.UseCases.ListMyEvents;

public sealed class ListMyEventsHandler : IListMyEventsHandler
{
    private readonly IEventRepository _eventRepository;
    private readonly IParticipantRepository _participantRepository;
    private readonly IMovieRepository _movieRepository;
    private readonly IFriendGroupRepository _groups;
    private readonly MyEventSummaryEnricher _summaries;
    private readonly TimeProvider _clock;

    public ListMyEventsHandler(
        IEventRepository eventRepository,
        IParticipantRepository participantRepository,
        IMovieRepository movieRepository,
        IMovieRatingRepository ratingRepository,
        IVoteRepository voteRepository,
        IUserRepository userRepository,
        IFriendGroupRepository groups,
        TimeProvider clock)
    {
        _eventRepository = eventRepository;
        _participantRepository = participantRepository;
        _movieRepository = movieRepository;
        _groups = groups;
        _summaries = new MyEventSummaryEnricher(participantRepository, movieRepository, ratingRepository, voteRepository, userRepository);
        _clock = clock;
    }

    public async Task<MyEventsListResponse> HandleAsync(
        string userId, string? scope, int? limit, int? offset, string? q, bool previews = true, CancellationToken ct = default)
    {
        var normalizedScope = MyEventListScope.Normalize(scope);
        var lim = limit is null ? 20 : Math.Clamp(limit.Value, 1, 100);
        var skip = offset is null ? 0 : Math.Max(0, offset.Value);
        var utcNow = _clock.GetUtcNow();

        var created = await _eventRepository.ListAllByCreatorUserIdAsync(userId, ct);
        var joinedIds = await _participantRepository.ListDistinctEventIdsByUserIdAsync(userId, ct);
        var joinedSet = new HashSet<string>(joinedIds);
        var createdIds = new HashSet<string>(created.Select(e => e.Id));
        var onlyJoined = await ListOnlyJoinedAsync(joinedIds, createdIds, ct);
        var myGroups = await _groups.ListAdmittingAsync(userId, ct);
        var groupNames = myGroups.ToDictionary(g => g.Id, g => g.Name);
        var groupNights = groupNames.Count == 0
            ? []
            : FriendGroup.NightsKeptBy(await _eventRepository.ListOpenByGroupIdsAsync(groupNames.Keys, utcNow, ct), myGroups)
                .Where(night => !night.HasRemoved(userId))
                .ToList();

        var (merged, winnerMovieIdByEventId) = BuildMergedEvents(
            new MyNightSources(created, onlyJoined, groupNights), joinedSet, groupNames, utcNow);
        var ratingOpenEventIds = created.Concat(onlyJoined)
            .Where(e => e.IsRatingOpen(utcNow))
            .Select(e => e.Id)
            .ToHashSet();

        var all = merged.Values.ToList();
        var totalActive = all.Count(x => x.Lifecycle != MyEventListLifecycle.Finished);
        var totalFinished = all.Count - totalActive;

        IEnumerable<MyEventSummaryDto> scoped = normalizedScope == MyEventListScope.Finished
            ? all.Where(x => x.Lifecycle == MyEventListLifecycle.Finished)
            : all.Where(x => x.Lifecycle != MyEventListLifecycle.Finished);

        if (normalizedScope == MyEventListScope.Finished && !string.IsNullOrWhiteSpace(q))
            scoped = await FilterBySearchAsync(scoped.ToList(), winnerMovieIdByEventId, q.Trim(), ct);

        var ordered = normalizedScope == MyEventListScope.Finished
            ? scoped.OrderByDescending(MyEventSummaryEnricher.StartInstant).ToList()
            : scoped.OrderBy(MyEventSummaryEnricher.StartInstant).ToList();

        var hasMore = ordered.Count > skip + lim;
        var orderedSlice = ordered.Skip(skip).Take(lim).ToList();

        if (orderedSlice.Count == 0)
        {
            return new MyEventsListResponse
            {
                Events = orderedSlice,
                HasMore = hasMore,
                TotalActive = totalActive,
                TotalFinished = totalFinished,
            };
        }

        var enriched = await _summaries.EnrichAsync(
            userId,
            orderedSlice,
            winnerMovieIdByEventId,
            DetailOf(normalizedScope, previews),
            ratingOpenEventIds,
            ct);

        return new MyEventsListResponse
        {
            Events = enriched,
            HasMore = hasMore,
            TotalActive = totalActive,
            TotalFinished = totalFinished,
        };
    }

    private static MyEventSummaryDetail DetailOf(string scope, bool previews)
    {
        if (scope == MyEventListScope.Finished)
            return MyEventSummaryDetail.Ratings;
        return previews ? MyEventSummaryDetail.Previews : MyEventSummaryDetail.Counts;
    }

    private async Task<List<MyEventSummaryDto>> FilterBySearchAsync(
        List<MyEventSummaryDto> events,
        Dictionary<string, IReadOnlyList<string>> winnerMovieIdsByEventId,
        string q,
        CancellationToken ct)
    {
        var winnerIds = winnerMovieIdsByEventId.Values.SelectMany(ids => ids).Distinct().ToList();

        var winnerTitles = winnerIds.Count > 0
            ? (await _movieRepository.ListByIdsAsync(winnerIds, ct)).ToDictionary(m => m.Id, m => m.Title)
            : [];

        return events.Where(x =>
            x.Title.Contains(q, StringComparison.OrdinalIgnoreCase) ||
            (winnerMovieIdsByEventId.TryGetValue(x.Id, out var wids)
                && wids.Any(wid => winnerTitles.TryGetValue(wid, out var wt)
                    && wt.Contains(q, StringComparison.OrdinalIgnoreCase)))
        ).ToList();
    }

    private async Task<IReadOnlyList<Event>> ListOnlyJoinedAsync(
        IReadOnlyList<string> joinedIds,
        HashSet<string> createdIds,
        CancellationToken ct)
    {
        var onlyJoinedIds = joinedIds.Where(id => !createdIds.Contains(id)).ToList();
        return onlyJoinedIds.Count == 0
            ? []
            : await _eventRepository.ListByIdsAsync(onlyJoinedIds, ct);
    }

    private sealed record MyNightSources(
        IReadOnlyList<Event> Created,
        IReadOnlyList<Event> OnlyJoined,
        IReadOnlyList<Event> OfMyGroups);

    private static (Dictionary<string, MyEventSummaryDto> Merged, Dictionary<string, IReadOnlyList<string>> WinnerIds)
        BuildMergedEvents(
            MyNightSources sources,
            HashSet<string> joinedSet,
            IReadOnlyDictionary<string, string> groupNames,
            DateTimeOffset utcNow)
    {
        var merged = new Dictionary<string, MyEventSummaryDto>();
        var winnerMovieIdByEventId = new Dictionary<string, IReadOnlyList<string>>();

        foreach (var e in sources.Created)
        {
            merged[e.Id] = MyEventSummaryEnricher.Summarize(e, isCreator: true, isParticipant: joinedSet.Contains(e.Id), groupNames, utcNow);
            if (e.HasWinner)
                winnerMovieIdByEventId[e.Id] = e.GetWinnerMovieIds();
        }

        foreach (var e in sources.OnlyJoined)
        {
            if (!merged.ContainsKey(e.Id))
                merged[e.Id] = MyEventSummaryEnricher.Summarize(e, isCreator: false, isParticipant: true, groupNames, utcNow);
            if (e.HasWinner)
                winnerMovieIdByEventId[e.Id] = e.GetWinnerMovieIds();
        }

        foreach (var e in sources.OfMyGroups.Where(e => !merged.ContainsKey(e.Id)))
        {
            var summary = MyEventSummaryEnricher.Summarize(e, isCreator: false, isParticipant: false, groupNames, utcNow);
            if (!MyEventSummaryEnricher.IsStillJoinable(summary))
                continue;
            merged[e.Id] = summary;
            if (e.HasWinner)
                winnerMovieIdByEventId[e.Id] = e.GetWinnerMovieIds();
        }

        return (merged, winnerMovieIdByEventId);
    }

}
