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
    private readonly IMovieRatingRepository _ratingRepository;
    private readonly IVoteRepository _voteRepository;
    private readonly IUserRepository _userRepository;
    private readonly TimeProvider _clock;

    public ListMyEventsHandler(
        IEventRepository eventRepository,
        IParticipantRepository participantRepository,
        IMovieRepository movieRepository,
        IMovieRatingRepository ratingRepository,
        IVoteRepository voteRepository,
        IUserRepository userRepository,
        TimeProvider clock)
    {
        _eventRepository = eventRepository;
        _participantRepository = participantRepository;
        _movieRepository = movieRepository;
        _ratingRepository = ratingRepository;
        _voteRepository = voteRepository;
        _userRepository = userRepository;
        _clock = clock;
    }

    public async Task<MyEventsListResponse> HandleAsync(
        string userId, string? scope, int? limit, int? offset, string? q, CancellationToken ct = default)
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

        var (merged, winnerMovieIdByEventId) = BuildMergedEvents(created, onlyJoined, joinedSet, utcNow);
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
            .SelectMany(id => winnerMovieIdByEventId[id])
            .Distinct()
            .ToList();

        var winnerMoviesTask = sliceWinnerIds.Count > 0
            ? _movieRepository.ListByIdsAsync(sliceWinnerIds, ct)
            : Task.FromResult<IReadOnlyList<Movie>>(Array.Empty<Movie>());

        var ratingsTask = normalizedScope == MyEventListScope.Finished
            ? LoadRatingsAsync(userId, sliceIds.Where(winnerMovieIdByEventId.ContainsKey).ToList(), ratingOpenEventIds, ct)
            : Task.FromResult(MyEventRatings.None);

        var previewsTask = normalizedScope == MyEventListScope.Finished
            ? Task.FromResult(MyEventPreviews.None)
            : LoadPreviewsAsync(userId, sliceIds, ct);

        await Task.WhenAll(participantCountsTask, movieCountsTask, winnerMoviesTask, ratingsTask, previewsTask);

        var counts = new SliceCounts(await participantCountsTask, await movieCountsTask);
        var winnerMovies = (await winnerMoviesTask).ToDictionary(m => m.Id, m => m);
        var ratings = await ratingsTask;
        var previews = await previewsTask;

        var enriched = orderedSlice.ConvertAll(d =>
            EnrichSummary(d, winnerMovieIdByEventId, winnerMovies, counts, ratings, previews));

        return new MyEventsListResponse
        {
            Events = enriched,
            HasMore = hasMore,
            TotalActive = totalActive,
            TotalFinished = totalFinished,
        };
    }

    private async Task<MyEventPreviews> LoadPreviewsAsync(
        string userId,
        List<string> eventIds,
        CancellationToken ct)
    {
        var moviesTask = _movieRepository.ListByEventIdsAsync(eventIds, ct);
        var participantsTask = _participantRepository.ListByEventIdsAsync(eventIds, ct);
        await Task.WhenAll(moviesTask, participantsTask);
        var movies = await moviesTask;
        var participants = await participantsTask;

        var viewerParticipantIds = participants.Where(p => p.UserId == userId).Select(p => p.Id).ToList();
        var previewedUserIds = MyEventPreviews.PreviewedParticipants(participants)
            .Values
            .SelectMany(previewed => previewed)
            .Select(p => p.UserId)
            .OfType<string>()
            .Distinct()
            .ToList();

        var scoresTask = movies.Count > 0
            ? _voteRepository.AggregateScoresByMovieIdsAsync(movies.Select(m => m.Id).ToList(), ct)
            : Task.FromResult<IReadOnlyDictionary<string, VoteScoreAggregate>>(new Dictionary<string, VoteScoreAggregate>());
        var votesTask = viewerParticipantIds.Count > 0
            ? _voteRepository.ListByParticipantIdsAsync(viewerParticipantIds, ct)
            : Task.FromResult<IReadOnlyList<Vote>>([]);
        var cardsTask = previewedUserIds.Count > 0
            ? _userRepository.ListCardsByIdsAsync(previewedUserIds, ct)
            : Task.FromResult<IReadOnlyList<UserCard>>([]);
        await Task.WhenAll(scoresTask, votesTask, cardsTask);

        return new MyEventPreviews(movies, participants, await scoresTask, await votesTask, await cardsTask);
    }

    private async Task<MyEventRatings> LoadRatingsAsync(
        string userId,
        List<string> eventIdsWithWinner,
        HashSet<string> ratingOpenEventIds,
        CancellationToken ct)
    {
        if (eventIdsWithWinner.Count == 0)
            return MyEventRatings.None;

        var ratingsTask = _ratingRepository.ListByEventIdsAsync(eventIdsWithWinner, ct);
        var myParticipationsTask = _participantRepository.ListByUserIdAsync(userId, ct: ct);
        await Task.WhenAll(ratingsTask, myParticipationsTask);

        return new MyEventRatings(await ratingsTask, await myParticipationsTask, ratingOpenEventIds);
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

    private static DateTimeOffset SortInstant(MyEventSummaryDto d) =>
        EventSchedule.TryGetStartUtc(d.Date, d.Time, out var startUtc) ? startUtc : d.CreatedAt;

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

    private static (Dictionary<string, MyEventSummaryDto> Merged, Dictionary<string, IReadOnlyList<string>> WinnerIds)
        BuildMergedEvents(
            IReadOnlyList<Event> created,
            IReadOnlyList<Event> onlyJoined,
            HashSet<string> joinedSet,
            DateTimeOffset utcNow)
    {
        var merged = new Dictionary<string, MyEventSummaryDto>();
        var winnerMovieIdByEventId = new Dictionary<string, IReadOnlyList<string>>();

        foreach (var e in created)
        {
            merged[e.Id] = ToDto(e, isCreator: true, isParticipant: joinedSet.Contains(e.Id), utcNow);
            if (e.HasWinner)
                winnerMovieIdByEventId[e.Id] = e.GetWinnerMovieIds();
        }

        foreach (var e in onlyJoined)
        {
            if (!merged.ContainsKey(e.Id))
                merged[e.Id] = ToDto(e, isCreator: false, isParticipant: true, utcNow);
            if (e.HasWinner)
                winnerMovieIdByEventId[e.Id] = e.GetWinnerMovieIds();
        }

        return (merged, winnerMovieIdByEventId);
    }

    private sealed record SliceCounts(
        IReadOnlyDictionary<string, int> Participants,
        IReadOnlyDictionary<string, int> Movies);

    private static MyEventSummaryDto EnrichSummary(
        MyEventSummaryDto d,
        Dictionary<string, IReadOnlyList<string>> winnerMovieIdByEventId,
        Dictionary<string, Movie> winnerMovies,
        SliceCounts counts,
        MyEventRatings ratings,
        MyEventPreviews previews)
    {
        var id = d.Id;
        var winners = winnerMovieIdByEventId.TryGetValue(id, out var wIds)
            ? wIds.Select(wId => winnerMovies.GetValueOrDefault(wId)).OfType<Movie>().ToList()
            : [];
        var rating = ratings.SummaryOf(id, winners.ConvertAll(m => m.Id));
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
            ParticipantCount = counts.Participants.TryGetValue(id, out var pc) ? pc : 0,
            MovieCount = counts.Movies.TryGetValue(id, out var mc) ? mc : 0,
            MaxParticipants = d.MaxParticipants,
            Theme = d.Theme,
            WinnerMovies = winners.ConvertAll(m => new MyEventWinnerMovieDto { Title = m.Title, PosterPath = m.PosterPath }),
            AverageRating = rating.Average,
            MyRating = rating.MyRating,
            HasWinnerToRate = rating.HasWinnerToRate,
            AutoCloseAt = d.AutoCloseAt,
            TopMovies = previews.TopMoviesOf(id),
            ParticipantsPreview = previews.ParticipantsOf(id),
            HasVoted = previews.HasVoted(id),
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
