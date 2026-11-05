using MoviePicker.Api.Domain.Entities;

namespace MoviePicker.Api.Application.UseCases.ListMyEvents;

internal sealed record MyEventRatingSummary(double? Average, double? MyRating, bool HasWinnerToRate);

internal sealed class MyEventRatings
{
    public static readonly MyEventRatings None = new([], [], []);

    private readonly ILookup<string, MovieRating> _ratingsByEventId;
    private readonly Dictionary<string, string> _myParticipantIdByEventId;
    private readonly HashSet<string> _ratingOpenEventIds;

    public MyEventRatings(
        IEnumerable<MovieRating> ratings,
        IEnumerable<Participant> myParticipations,
        HashSet<string> ratingOpenEventIds)
    {
        _ratingsByEventId = ratings.ToLookup(r => r.EventId);
        _myParticipantIdByEventId = myParticipations
            .DistinctBy(p => p.EventId)
            .ToDictionary(p => p.EventId, p => p.Id);
        _ratingOpenEventIds = ratingOpenEventIds;
    }

    public MyEventRatingSummary SummaryOf(string eventId, IReadOnlyCollection<string> winnerIds)
    {
        var winnerRatings = _ratingsByEventId[eventId].Where(r => winnerIds.Contains(r.MovieId)).ToList();
        var myParticipantId = _myParticipantIdByEventId.GetValueOrDefault(eventId);
        var ratedByMe = winnerRatings.Where(r => r.ParticipantId == myParticipantId).Select(r => r.MovieId);
        var hasWinnerToRate = myParticipantId is not null
            && _ratingOpenEventIds.Contains(eventId)
            && winnerIds.Except(ratedByMe).Any();

        var namedWinnerId = winnerIds.FirstOrDefault();
        var namedWinnerRatings = winnerRatings.Where(r => r.MovieId == namedWinnerId).ToList();
        var mine = namedWinnerRatings.Find(r => r.ParticipantId == myParticipantId);

        return new MyEventRatingSummary(AverageOf(namedWinnerRatings), mine?.Value, hasWinnerToRate);
    }

    private static double? AverageOf(List<MovieRating> ratings) =>
        ratings.Count == 0 ? null : ratings.Average(r => r.Value);
}
