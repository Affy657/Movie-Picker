using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Domain.Exceptions;

namespace MoviePicker.Api.Application.UseCases.MovieRatings;

public sealed class DeleteMovieRatingHandler : IDeleteMovieRatingHandler
{
    private readonly IEventRepository _eventRepository;
    private readonly IParticipantRepository _participantRepository;
    private readonly IMovieRatingRepository _ratingRepository;
    private readonly ICurrentUserAccessor _currentUserAccessor;

    public DeleteMovieRatingHandler(
        IEventRepository eventRepository,
        IParticipantRepository participantRepository,
        IMovieRatingRepository ratingRepository,
        ICurrentUserAccessor currentUserAccessor)
    {
        _eventRepository = eventRepository;
        _participantRepository = participantRepository;
        _ratingRepository = ratingRepository;
        _currentUserAccessor = currentUserAccessor;
    }

    public async Task HandleAsync(string idOrSlug, string movieId, string participantId, CancellationToken ct = default)
    {
        var evt = await _eventRepository.GetRequiredByIdOrSlugAsync(idOrSlug, ct);
        var participant = await RatedParticipation.ResolveOwnAsync(
            _participantRepository, _currentUserAccessor, evt, participantId, ct);

        var deleted = await _ratingRepository.DeleteAsync(evt.Id, movieId, participant.Id, ct);
        if (!deleted)
            throw Errors.RatingNotFound();
        await _eventRepository.MarkChangedAsync(evt.Id, ct);
    }
}
