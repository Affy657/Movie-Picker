using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Domain;
using MoviePicker.Api.Domain.Entities;

namespace MoviePicker.Api.Application.UseCases.ListMyEvents;

public sealed class MyEventSummaryEnricher
{
    private readonly IParticipantRepository _participants;
    private readonly IMovieRepository _movies;
    private readonly IMovieRatingRepository _ratings;
    private readonly IVoteRepository _votes;
    private readonly IUserRepository _users;

    public MyEventSummaryEnricher(
        IParticipantRepository participants,
        IMovieRepository movies,
        IMovieRatingRepository ratings,
        IVoteRepository votes,
        IUserRepository users)
    {
        _participants = participants;
        _movies = movies;
        _ratings = ratings;
        _votes = votes;
        _users = users;
    }

    public async Task<List<MyEventSummaryDto>> EnrichAsync(
        string userId,
        List<MyEventSummaryDto> slice,
        IReadOnlyDictionary<string, IReadOnlyList<string>> winnerMovieIdByEventId,
        MyEventSummaryDetail detail,
        IReadOnlySet<string> ratingOpenEventIds,
        CancellationToken ct)
    {
        if (slice.Count == 0)
            return [];

        var sliceIds = slice.ConvertAll(x => x.Id);
        var participantCountsTask = _participants.CountByEventIdsAsync(sliceIds, ct);
        var movieCountsTask = _movies.CountByEventIdsAsync(sliceIds, ct);

        var sliceWinnerIds = sliceIds
            .Where(winnerMovieIdByEventId.ContainsKey)
            .SelectMany(id => winnerMovieIdByEventId[id])
            .Distinct()
            .ToList();

        var winnerMoviesTask = sliceWinnerIds.Count > 0
            ? _movies.ListByIdsAsync(sliceWinnerIds, ct)
            : Task.FromResult<IReadOnlyList<Movie>>(Array.Empty<Movie>());

        var ratingsTask = detail == MyEventSummaryDetail.Ratings
            ? LoadRatingsAsync(userId, sliceIds.Where(winnerMovieIdByEventId.ContainsKey).ToList(), ratingOpenEventIds, ct)
            : Task.FromResult(MyEventRatings.None);

        var previewsTask = detail == MyEventSummaryDetail.Previews
            ? LoadPreviewsAsync(userId, sliceIds, ct)
            : Task.FromResult(MyEventPreviews.None);

        await Task.WhenAll(participantCountsTask, movieCountsTask, winnerMoviesTask, ratingsTask, previewsTask);

        var counts = new SliceCounts(await participantCountsTask, await movieCountsTask);
        var winnerMovies = (await winnerMoviesTask).ToDictionary(m => m.Id, m => m);
        var ratings = await ratingsTask;
        var previews = await previewsTask;

        return slice.ConvertAll(d =>
            EnrichSummary(d, winnerMovieIdByEventId, winnerMovies, counts, ratings, previews));
    }

    private async Task<MyEventPreviews> LoadPreviewsAsync(
        string userId,
        List<string> eventIds,
        CancellationToken ct)
    {
        var moviesTask = _movies.ListTopVotedByEventIdsAsync(eventIds, MyEventPreviews.PosterCount, ct);
        var participantsTask = _participants.ListFirstByEventIdsAsync(eventIds, MyEventPreviews.ParticipantCount, ct);
        var votedTask = ListEventIdsVotedByViewerAsync(userId, eventIds, ct);
        await Task.WhenAll(moviesTask, participantsTask, votedTask);
        var participants = await participantsTask;

        var previewedUserIds = participants
            .Select(p => p.UserId)
            .OfType<string>()
            .Distinct()
            .ToList();
        var cards = previewedUserIds.Count > 0
            ? await _users.ListCardsByIdsAsync(previewedUserIds, ct)
            : [];

        return new MyEventPreviews(await moviesTask, participants, await votedTask, cards);
    }

    private async Task<IReadOnlyList<string>> ListEventIdsVotedByViewerAsync(
        string userId,
        List<string> eventIds,
        CancellationToken ct)
    {
        var pageEventIds = eventIds.ToHashSet(StringComparer.Ordinal);
        var viewerParticipantIds = (await _participants.ListByUserIdAsync(userId, ct: ct))
            .Where(p => pageEventIds.Contains(p.EventId))
            .Select(p => p.Id)
            .ToList();
        return viewerParticipantIds.Count > 0
            ? await _votes.ListEventIdsVotedByAsync(viewerParticipantIds, ct)
            : [];
    }

    private async Task<MyEventRatings> LoadRatingsAsync(
        string userId,
        List<string> eventIdsWithWinner,
        IReadOnlySet<string> ratingOpenEventIds,
        CancellationToken ct)
    {
        if (eventIdsWithWinner.Count == 0)
            return MyEventRatings.None;

        var ratingsTask = _ratings.ListByEventIdsAsync(eventIdsWithWinner, ct);
        var myParticipationsTask = _participants.ListByUserIdAsync(userId, ct: ct);
        await Task.WhenAll(ratingsTask, myParticipationsTask);

        return new MyEventRatings(await ratingsTask, await myParticipationsTask, ratingOpenEventIds);
    }

    public static bool IsStillJoinable(MyEventSummaryDto d) =>
        d.IsParticipant || d.Lifecycle is MyEventListLifecycle.Upcoming or MyEventListLifecycle.Live;

    public static DateTimeOffset StartInstant(MyEventSummaryDto d) =>
        EventSchedule.TryGetStartUtc(d.Date, d.Time, out var startUtc) ? startUtc : d.CreatedAt;

    private sealed record SliceCounts(
        IReadOnlyDictionary<string, int> Participants,
        IReadOnlyDictionary<string, int> Movies);

    private static MyEventSummaryDto EnrichSummary(
        MyEventSummaryDto d,
        IReadOnlyDictionary<string, IReadOnlyList<string>> winnerMovieIdByEventId,
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
            GroupId = d.GroupId,
            GroupName = d.GroupName,
        };
    }

    public static MyEventSummaryDto Summarize(
        Event e,
        bool isCreator,
        bool isParticipant,
        IReadOnlyDictionary<string, string> groupNames,
        DateTimeOffset utcNow) => new()
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
            GroupId = e.GroupId is { } groupId && groupNames.ContainsKey(groupId) ? groupId : null,
            GroupName = e.GroupId is { } named ? groupNames.GetValueOrDefault(named) : null,
        };

    private static DateTimeOffset? ComputeAutoCloseAt(Event e) =>
        EventSchedule.TryGetStartUtc(e.Date, e.Time, out var startUtc)
            ? startUtc + EventSchedule.PendingDelay + EventSchedule.AutoCloseDelay
            : null;
}
