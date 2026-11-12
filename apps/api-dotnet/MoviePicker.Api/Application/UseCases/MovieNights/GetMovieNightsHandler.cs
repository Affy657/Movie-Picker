using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Domain;
using MoviePicker.Api.Domain.Entities;

namespace MoviePicker.Api.Application.UseCases.MovieNights;

public sealed class GetMovieNightsHandler : IGetMovieNightsHandler
{
    public const int MaxNights = 10;
    public const int MaxViewers = 8;

    private readonly IEventRepository _events;
    private readonly IParticipantRepository _participants;
    private readonly IMovieRepository _movies;
    private readonly IMovieRatingRepository _ratings;
    private readonly ISeenMarkRepository _seenMarks;
    private readonly IUserRepository _users;
    private readonly TimeProvider _clock;

    public GetMovieNightsHandler(
        IEventRepository events,
        IParticipantRepository participants,
        IMovieRepository movies,
        IMovieRatingRepository ratings,
        ISeenMarkRepository seenMarks,
        IUserRepository users,
        TimeProvider clock)
    {
        _events = events;
        _participants = participants;
        _movies = movies;
        _ratings = ratings;
        _seenMarks = seenMarks;
        _users = users;
        _clock = clock;
    }

    public async Task<MovieNightsResponse> HandleAsync(
        string userId,
        int tmdbId,
        MovieMediaType mediaType,
        CancellationToken ct = default)
    {
        if (tmdbId <= 0)
            return new MovieNightsResponse();

        var myNights = await ListMyNightsAsync(userId, ct);
        if (myNights.Count == 0)
            return new MovieNightsResponse();

        var proposals = await _movies.ListByEventIdsAndTmdbIdAsync(myNights.Keys.ToList(), tmdbId, mediaType, ct);
        var proposalByEventId = proposals
            .Where(movie => myNights.ContainsKey(movie.EventId))
            .GroupBy(movie => movie.EventId)
            .ToDictionary(group => group.Key, group => group.OrderBy(movie => movie.CreatedAt).First());
        if (proposalByEventId.Count == 0)
            return new MovieNightsResponse();

        var eventIds = proposalByEventId.Keys.ToList();
        var proposalIds = proposals.Select(movie => movie.Id).ToHashSet(StringComparer.Ordinal);
        var participantsTask = _participants.ListByEventIdsAsync(eventIds, ct);
        var ratingsTask = _ratings.ListByEventIdsAsync(eventIds, ct);
        await Task.WhenAll(participantsTask, ratingsTask);
        var participants = await participantsTask;
        var participantById = participants.DistinctBy(p => p.Id).ToDictionary(p => p.Id, StringComparer.Ordinal);

        var utcNow = _clock.GetUtcNow();
        var nights = eventIds.ConvertAll(id => myNights[id]);
        var viewers = await ListViewersAsync(participants, participantById, proposalIds, ct);

        return new MovieNightsResponse
        {
            Nights = nights
                .OrderByDescending(SortInstant)
                .ThenByDescending(night => night.CreatedAt)
                .Take(MaxNights)
                .Select(night => ToNight(night, proposalByEventId[night.Id], proposalIds, participantById, utcNow))
                .ToList(),
            ProposalCount = nights.Count,
            WinCount = nights.Count(night => IsWonByTheTitle(night, proposalIds)),
            Rating = Rate((await ratingsTask).Where(rating => proposalIds.Contains(rating.MovieId)).ToList()),
            SeenBy = await DescribeViewersAsync(viewers.Take(MaxViewers).ToList(), ct),
            SeenCount = viewers.Count,
        };
    }

    private async Task<Dictionary<string, Event>> ListMyNightsAsync(string userId, CancellationToken ct)
    {
        var createdTask = _events.ListAllByCreatorUserIdAsync(userId, ct);
        var joinedIdsTask = _participants.ListDistinctEventIdsByUserIdAsync(userId, ct);
        await Task.WhenAll(createdTask, joinedIdsTask);

        var nights = (await createdTask).DistinctBy(night => night.Id).ToDictionary(night => night.Id, StringComparer.Ordinal);
        var onlyJoinedIds = (await joinedIdsTask).Where(id => !nights.ContainsKey(id)).Distinct().ToList();
        if (onlyJoinedIds.Count == 0)
            return nights;

        foreach (var joined in await _events.ListByIdsAsync(onlyJoinedIds, ct))
            nights.TryAdd(joined.Id, joined);
        return nights;
    }

    private async Task<List<Participant>> ListViewersAsync(
        IReadOnlyList<Participant> participants,
        Dictionary<string, Participant> participantById,
        HashSet<string> proposalIds,
        CancellationToken ct)
    {
        if (participants.Count == 0)
            return [];

        var marks = await _seenMarks.ListByParticipantIdsAsync(participantById.Keys.ToList(), ct);
        return marks
            .Where(mark => proposalIds.Contains(mark.MovieId) && participantById.ContainsKey(mark.ParticipantId))
            .OrderBy(mark => mark.CreatedAt)
            .ThenBy(mark => mark.Id, StringComparer.Ordinal)
            .Select(mark => participantById[mark.ParticipantId])
            .DistinctBy(ViewerKey)
            .ToList();
    }

    private async Task<IReadOnlyList<MovieNightViewerResponse>> DescribeViewersAsync(
        List<Participant> shown,
        CancellationToken ct)
    {
        var userIds = shown.Select(p => p.UserId).OfType<string>().Where(id => id.Length > 0).Distinct().ToList();
        var avatarByUserId = userIds.Count == 0
            ? new Dictionary<string, string>(StringComparer.Ordinal)
            : (await _users.ListCardsByIdsAsync(userIds, ct))
                .DistinctBy(card => card.Id)
                .ToDictionary(card => card.Id, card => card.AvatarId, StringComparer.Ordinal);

        return shown.ConvertAll(p => new MovieNightViewerResponse
        {
            Pseudo = p.Pseudo,
            AvatarId = p.UserId is not null && avatarByUserId.TryGetValue(p.UserId, out var avatarId) && avatarId.Length > 0
                ? avatarId
                : null,
        });
    }

    private static string ViewerKey(Participant participant) =>
        string.IsNullOrEmpty(participant.UserId)
            ? "pseudo:" + participant.Pseudo.Trim().ToUpperInvariant()
            : "user:" + participant.UserId;

    private static MovieNightResponse ToNight(
        Event night,
        Movie proposal,
        HashSet<string> proposalIds,
        Dictionary<string, Participant> participantById,
        DateTimeOffset utcNow)
    {
        var isFinished = night.IsFinished(utcNow);
        return new MovieNightResponse
        {
            Slug = night.Slug,
            Title = night.Title,
            Date = string.IsNullOrWhiteSpace(night.Date) ? null : night.Date,
            IsWinner = IsWonByTheTitle(night, proposalIds),
            IsFinished = isFinished,
            RecapSlug = isFinished && night.HasWinner && !string.IsNullOrWhiteSpace(night.RecapSlug) ? night.RecapSlug : null,
            ProposerPseudo = participantById.TryGetValue(proposal.ParticipantId, out var proposer) ? proposer.Pseudo : string.Empty,
        };
    }

    private static bool IsWonByTheTitle(Event night, HashSet<string> proposalIds) =>
        night.Winners.Any(winner => proposalIds.Contains(winner.MovieId));

    private static MovieNightsRatingResponse? Rate(List<MovieRating> ratings) =>
        ratings.Count == 0
            ? null
            : new MovieNightsRatingResponse
            {
                Average = Math.Round(ratings.Average(rating => rating.Value), 1, MidpointRounding.AwayFromZero),
                Count = ratings.Count,
            };

    private static DateTimeOffset SortInstant(Event night) =>
        EventSchedule.TryGetStartUtc(night.Date, night.Time, out var startUtc) ? startUtc : night.CreatedAt;
}
