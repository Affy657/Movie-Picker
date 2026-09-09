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

    public ListMyEventsHandler(
        IEventRepository eventRepository,
        IParticipantRepository participantRepository,
        IMovieRepository movieRepository)
    {
        _eventRepository = eventRepository;
        _participantRepository = participantRepository;
        _movieRepository = movieRepository;
    }

    public async Task<MyEventsListResponse> HandleAsync(
        string userId, string? scope, int? limit, int? offset, string? q, CancellationToken ct = default)
    {
        var normalizedScope = MyEventListScope.Normalize(scope);
        var lim = limit is null ? 20 : Math.Clamp(limit.Value, 1, 100);
        var skip = offset is null ? 0 : Math.Max(0, offset.Value);
        var utcNow = DateTimeOffset.UtcNow;

        var created = await _eventRepository.ListByCreatorUserIdAsync(userId, 200, ct);
        var joinedIds = await _participantRepository.ListDistinctEventIdsByUserIdAsync(userId, ct);
        var joinedSet = new HashSet<string>(joinedIds);
        var createdIds = new HashSet<string>(created.Select(e => e.Id));

        var (merged, winnerMovieIdByEventId) =
            await BuildMergedEventsAsync(created, joinedIds, joinedSet, createdIds, utcNow, ct);

        var all = merged.Values.ToList();
        var totalActive = all.Count(x => x.Lifecycle != MyEventListLifecycle.Finished);
        var totalFinished = all.Count - totalActive;

        IEnumerable<MyEventSummaryDto> scoped = normalizedScope == MyEventListScope.Finished
            ? all.Where(x => x.Lifecycle == MyEventListLifecycle.Finished)
            : all.Where(x => x.Lifecycle != MyEventListLifecycle.Finished);

        if (normalizedScope == MyEventListScope.Finished && !string.IsNullOrWhiteSpace(q))
            scoped = await FilterBySearchAsync(scoped.ToList(), winnerMovieIdByEventId, q.Trim(), ct);

        var ordered = normalizedScope == MyEventListScope.Finished
            ? scoped.OrderByDescending(SortInstant).ToList()
            : scoped.OrderBy(SortInstant).ToList();

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

        var sliceIds = orderedSlice.ConvertAll(x => x.Id);
        var participantCountsTask = _participantRepository.CountByEventIdsAsync(sliceIds, ct);
        var movieCountsTask = _movieRepository.CountByEventIdsAsync(sliceIds, ct);

        var sliceWinnerIds = sliceIds
            .Where(winnerMovieIdByEventId.ContainsKey)
            .Select(id => winnerMovieIdByEventId[id])
            .Distinct()
            .ToList();

        var winnerMoviesTask = sliceWinnerIds.Count > 0
            ? _movieRepository.ListByIdsAsync(sliceWinnerIds, ct)
            : Task.FromResult<IReadOnlyList<Movie>>(Array.Empty<Movie>());

        await Task.WhenAll(participantCountsTask, movieCountsTask, winnerMoviesTask);

        var participantCounts = await participantCountsTask;
        var movieCounts = await movieCountsTask;
        var winnerMovies = (await winnerMoviesTask).ToDictionary(m => m.Id, m => m);

        var enriched = orderedSlice.ConvertAll(d =>
            EnrichSummary(d, winnerMovieIdByEventId, winnerMovies, participantCounts, movieCounts));

        return new MyEventsListResponse
        {
            Events = enriched,
            HasMore = hasMore,
            TotalActive = totalActive,
            TotalFinished = totalFinished,
        };
    }

    private async Task<List<MyEventSummaryDto>> FilterBySearchAsync(
        List<MyEventSummaryDto> events,
        Dictionary<string, string> winnerMovieIdByEventId,
        string q,
        CancellationToken ct)
    {
        var winnerIds = events
            .Where(x => winnerMovieIdByEventId.ContainsKey(x.Id))
            .Select(x => winnerMovieIdByEventId[x.Id])
            .Distinct()
            .ToList();

        var winnerTitles = winnerIds.Count > 0
            ? (await _movieRepository.ListByIdsAsync(winnerIds, ct)).ToDictionary(m => m.Id, m => m.Title)
            : [];

        return events.Where(x =>
            x.Title.Contains(q, StringComparison.OrdinalIgnoreCase) ||
            (winnerMovieIdByEventId.TryGetValue(x.Id, out var wid)
                && winnerTitles.TryGetValue(wid, out var wt)
                && wt.Contains(q, StringComparison.OrdinalIgnoreCase))
        ).ToList();
    }

    private static DateTimeOffset SortInstant(MyEventSummaryDto d) =>
        EventSchedule.TryGetStartUtc(d.Date, d.Time, out var startUtc) ? startUtc : d.CreatedAt;

    private async Task<(Dictionary<string, MyEventSummaryDto> Merged, Dictionary<string, string> WinnerIds)>
        BuildMergedEventsAsync(
            IReadOnlyList<Event> created,
            IReadOnlyList<string> joinedIds,
            HashSet<string> joinedSet,
            HashSet<string> createdIds,
            DateTimeOffset utcNow,
            CancellationToken ct)
    {
        var merged = new Dictionary<string, MyEventSummaryDto>();
        var winnerMovieIdByEventId = new Dictionary<string, string>();

        foreach (var e in created)
        {
            merged[e.Id] = ToDto(e, isCreator: true, isParticipant: joinedSet.Contains(e.Id), utcNow);
            if (!string.IsNullOrEmpty(e.WinnerMovieId))
                winnerMovieIdByEventId[e.Id] = e.WinnerMovieId;
        }

        var onlyJoined = joinedIds.Where(id => !createdIds.Contains(id)).ToList();
        if (onlyJoined.Count > 0)
        {
            var extra = await _eventRepository.ListByIdsAsync(onlyJoined, ct);
            foreach (var e in extra)
            {
                if (!merged.ContainsKey(e.Id))
                    merged[e.Id] = ToDto(e, isCreator: false, isParticipant: true, utcNow);
                if (!string.IsNullOrEmpty(e.WinnerMovieId))
                    winnerMovieIdByEventId[e.Id] = e.WinnerMovieId;
            }
        }

        return (merged, winnerMovieIdByEventId);
    }

    private static MyEventSummaryDto EnrichSummary(
        MyEventSummaryDto d,
        Dictionary<string, string> winnerMovieIdByEventId,
        Dictionary<string, Movie> winnerMovies,
        IReadOnlyDictionary<string, int> participantCounts,
        IReadOnlyDictionary<string, int> movieCounts)
    {
        var id = d.Id;
        Movie? winner = winnerMovieIdByEventId.TryGetValue(id, out var wId) && winnerMovies.TryGetValue(wId, out var wm)
            ? wm
            : null;
        return new MyEventSummaryDto
        {
            Id = d.Id,
            Slug = d.Slug,
            Title = d.Title,
            Date = d.Date,
            Time = d.Time,
            CreatedAt = d.CreatedAt,
            UpdatedAt = d.UpdatedAt,
            IsCreator = d.IsCreator,
            IsParticipant = d.IsParticipant,
            Lifecycle = d.Lifecycle,
            ParticipantCount = participantCounts.TryGetValue(id, out var pc) ? pc : 0,
            MovieCount = movieCounts.TryGetValue(id, out var mc) ? mc : 0,
            MaxParticipants = d.MaxParticipants,
            Theme = d.Theme,
            WinnerMovieTitle = winner?.Title,
            WinnerMoviePosterPath = winner?.PosterPath,
            AutoCloseAt = d.AutoCloseAt,
        };
    }

    private static MyEventSummaryDto ToDto(Event e, bool isCreator, bool isParticipant, DateTimeOffset utcNow) => new()
    {
        Id = e.Id,
        Slug = e.Slug,
        Title = e.Title,
        Date = e.Date,
        Time = e.Time,
        CreatedAt = e.CreatedAt,
        UpdatedAt = e.UpdatedAt,
        IsCreator = isCreator,
        IsParticipant = isParticipant,
        Lifecycle = MyEventListLifecycle.Compute(e, utcNow),
        ParticipantCount = 0,
        MovieCount = 0,
        MaxParticipants = e.Config?.MaxParticipants,
        Theme = string.IsNullOrWhiteSpace(e.Config?.Theme) ? null : e.Config.Theme,
        AutoCloseAt = ComputeAutoCloseAt(e),
    };

    private static DateTimeOffset? ComputeAutoCloseAt(Event e) =>
        EventSchedule.TryGetStartUtc(e.Date, e.Time, out var startUtc)
            ? startUtc + EventSchedule.PendingDelay + EventSchedule.AutoCloseDelay
            : null;
}
