using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Domain.Exceptions;

namespace MoviePicker.Api.Application.UseCases.MovieRatings;

public sealed class DeleteMovieRatingHandler : IDeleteMovieRatingHandler
{
    private readonly IEventRepository _eventRepository;
    private readonly IParticipantRepository _participantRepository;
    private readonly IMovieRatingRepository _ratingRepository;

    public DeleteMovieRatingHandler(
        IEventRepository eventRepository,
        IParticipantRepository participantRepository,
        IMovieRatingRepository ratingRepository)
    {
        _eventRepository = eventRepository;
        _participantRepository = participantRepository;
        _ratingRepository = ratingRepository;
    }

    public async Task HandleAsync(string userId, string slug, string movieId, string participantId, CancellationToken ct = default)
    {
        var evt = await _eventRepository.GetRequiredBySlugAsync(slug, ct);
        var participant = await RatedParticipation.ResolveOwnAsync(
            _participantRepository, userId, evt, participantId, ct);

        var deleted = await _ratingRepository.DeleteAsync(evt.Id, movieId, participant.Id, ct);
        if (!deleted)
            throw Errors.RatingNotFound();
        await _eventRepository.MarkChangedAsync(evt.Id, ct);
    }
}
