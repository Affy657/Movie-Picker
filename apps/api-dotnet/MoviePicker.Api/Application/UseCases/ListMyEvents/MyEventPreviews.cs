using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Domain.Entities;

namespace MoviePicker.Api.Application.UseCases.ListMyEvents;

public sealed class MyEventPreviews
{
    public const int PosterCount = 3;
    public const int ParticipantCount = 4;

    public static readonly MyEventPreviews None = new([], [], [], []);

    private readonly ILookup<string, EventMoviePreview> _moviesByEvent;
    private readonly Dictionary<string, List<Participant>> _participantsByEvent;
    private readonly HashSet<string> _votedEventIds;
    private readonly Dictionary<string, UserCard> _cardByUserId;

    public MyEventPreviews(
        IReadOnlyList<EventMoviePreview> topMovies,
        IReadOnlyList<Participant> firstParticipants,
        IReadOnlyCollection<string> votedEventIds,
        IReadOnlyList<UserCard> userCards)
    {
        _moviesByEvent = topMovies.ToLookup(m => m.EventId);
        _participantsByEvent = PreviewedParticipants(firstParticipants);
        _votedEventIds = votedEventIds.ToHashSet(StringComparer.Ordinal);
        _cardByUserId = userCards
            .GroupBy(c => c.Id)
            .ToDictionary(g => g.Key, g => g.First());
    }

    private static Dictionary<string, List<Participant>> PreviewedParticipants(IReadOnlyList<Participant> participants) =>
        participants
            .GroupBy(p => p.EventId)
            .ToDictionary(
                g => g.Key,
                g => g.OrderBy(p => p.CreatedAt).Take(ParticipantCount).ToList());

    public IReadOnlyList<MyEventMoviePreviewDto> TopMoviesOf(string eventId) =>
        _moviesByEvent[eventId]
            .Take(PosterCount)
            .Select(m => new MyEventMoviePreviewDto { Title = m.Title, PosterPath = m.PosterPath })
            .ToList();

    public IReadOnlyList<MyEventParticipantPreviewDto> ParticipantsOf(string eventId) =>
        _participantsByEvent.TryGetValue(eventId, out var previewed)
            ? previewed.ConvertAll(p => new MyEventParticipantPreviewDto
            {
                Pseudo = p.Pseudo,
                AvatarId = DisplayedPerson.LinkedTo(p, _cardByUserId)?.AvatarId ?? string.Empty,
            })
            : [];

    public bool HasVoted(string eventId) => _votedEventIds.Contains(eventId);
}
