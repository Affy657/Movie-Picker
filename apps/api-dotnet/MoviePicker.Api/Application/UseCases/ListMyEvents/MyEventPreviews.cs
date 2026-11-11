using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Domain.Entities;

namespace MoviePicker.Api.Application.UseCases.ListMyEvents;

public sealed class MyEventPreviews
{
    public const int PosterCount = 3;
    public const int ParticipantCount = 4;

    public static readonly MyEventPreviews None = new([], [], new Dictionary<string, VoteScoreAggregate>(), [], []);

    private readonly ILookup<string, Movie> _moviesByEvent;
    private readonly Dictionary<string, List<Participant>> _participantsByEvent;
    private readonly IReadOnlyDictionary<string, VoteScoreAggregate> _scores;
    private readonly HashSet<string> _votedEventIds;
    private readonly Dictionary<string, string> _avatarByUserId;

    public MyEventPreviews(
        IReadOnlyList<Movie> movies,
        IReadOnlyList<Participant> participants,
        IReadOnlyDictionary<string, VoteScoreAggregate> scores,
        IReadOnlyList<Vote> viewerVotes,
        IReadOnlyList<UserCard> userCards)
    {
        _moviesByEvent = movies.ToLookup(m => m.EventId);
        _participantsByEvent = PreviewedParticipants(participants);
        _scores = scores;
        _votedEventIds = viewerVotes.Select(v => v.EventId).ToHashSet();
        _avatarByUserId = userCards
            .GroupBy(c => c.Id)
            .ToDictionary(g => g.Key, g => g.First().AvatarId);
    }

    public static Dictionary<string, List<Participant>> PreviewedParticipants(IReadOnlyList<Participant> participants) =>
        participants
            .GroupBy(p => p.EventId)
            .ToDictionary(
                g => g.Key,
                g => g.OrderBy(p => p.CreatedAt).Take(ParticipantCount).ToList());

    public IReadOnlyList<MyEventMoviePreviewDto> TopMoviesOf(string eventId) =>
        _moviesByEvent[eventId]
            .OrderByDescending(m => _scores.TryGetValue(m.Id, out var aggregate) ? aggregate.Score : 0)
            .ThenBy(m => m.CreatedAt)
            .ThenBy(m => m.Id, StringComparer.Ordinal)
            .Take(PosterCount)
            .Select(m => new MyEventMoviePreviewDto { Title = m.Title, PosterPath = m.PosterPath })
            .ToList();

    public IReadOnlyList<MyEventParticipantPreviewDto> ParticipantsOf(string eventId) =>
        _participantsByEvent.TryGetValue(eventId, out var previewed)
            ? previewed.ConvertAll(p => new MyEventParticipantPreviewDto
            {
                Pseudo = p.Pseudo,
                AvatarId = p.UserId is not null && _avatarByUserId.TryGetValue(p.UserId, out var avatarId)
                    ? avatarId
                    : string.Empty,
            })
            : [];

    public bool HasVoted(string eventId) => _votedEventIds.Contains(eventId);
}
