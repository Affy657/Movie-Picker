using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Domain.Exceptions;

namespace MoviePicker.Api.Application.UseCases.MovieRatings;

public sealed class SetMovieRatingHandler : ISetMovieRatingHandler
{
    private readonly IEventRepository _eventRepository;
    private readonly IMovieRepository _movieRepository;
    private readonly IParticipantRepository _participantRepository;
    private readonly IMovieRatingRepository _ratingRepository;
    private readonly ICurrentUserAccessor _currentUserAccessor;
    private readonly TimeProvider _clock;

    public SetMovieRatingHandler(
        IEventRepository eventRepository,
        IMovieRepository movieRepository,
        IParticipantRepository participantRepository,
        IMovieRatingRepository ratingRepository,
        ICurrentUserAccessor currentUserAccessor,
        TimeProvider clock)
    {
        _eventRepository = eventRepository;
        _movieRepository = movieRepository;
        _participantRepository = participantRepository;
        _ratingRepository = ratingRepository;
        _currentUserAccessor = currentUserAccessor;
        _clock = clock;
    }

    public async Task<MovieRatingResponse> HandleAsync(
        string idOrSlug,
        string movieId,
        SetMovieRatingRequest request,
        CancellationToken ct = default)
    {
        var evt = await _eventRepository.GetRequiredByIdOrSlugAsync(idOrSlug, ct);
        var now = _clock.GetUtcNow();
        if (!evt.IsFinished(now))
            throw Errors.RatingOnlyAfterEvent();

        var movie = await _movieRepository.GetByIdAndEventIdAsync(movieId, evt.Id, ct)
            ?? throw Errors.MovieNotFound();
        if (!evt.GetWinnerMovieIds().Contains(movie.Id))
            throw Errors.RatingOnlyChosenMovie();

        var participant = await RatedParticipation.ResolveOwnAsync(
            _participantRepository, _currentUserAccessor, evt, request.ParticipantId, ct);

        if (!MovieRating.IsValidValue(request.Value))
            throw Errors.RatingOutOfRange();

        var saved = await _ratingRepository.UpsertAsync(
            new MovieRating
            {
                EventId = evt.Id,
                MovieId = movie.Id,
                ParticipantId = participant.Id,
                Value = request.Value
            },
            ct);
        await _eventRepository.MarkChangedAsync(evt.Id, ct);

        return MovieRatingResponse.FromDomain(saved);
    }
}
