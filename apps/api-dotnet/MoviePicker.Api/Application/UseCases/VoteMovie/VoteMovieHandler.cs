using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Domain.Exceptions;

namespace MoviePicker.Api.Application.UseCases.VoteMovie;

public sealed class VoteMovieHandler : IVoteMovieHandler
{
    private readonly IEventRepository _eventRepository;
    private readonly IMovieRepository _movieRepository;
    private readonly IParticipantRepository _participantRepository;
    private readonly IVoteRepository _voteRepository;

    public VoteMovieHandler(
        IEventRepository eventRepository,
        IMovieRepository movieRepository,
        IParticipantRepository participantRepository,
        IVoteRepository voteRepository)
    {
        _eventRepository = eventRepository;
        _movieRepository = movieRepository;
        _participantRepository = participantRepository;
        _voteRepository = voteRepository;
    }

    public async Task<VoteResponse> HandleAsync(string idOrSlug, string movieId, VoteRequest request, CancellationToken ct = default)
    {
        var evt = await _eventRepository.GetByIdOrSlugAsync(idOrSlug, ct)
            ?? throw new NotFoundException("Soirée introuvable");

        if (evt.IsFinished(DateTimeOffset.UtcNow))
            throw new BadRequestException("Soirée terminée. Lecture seule.");

        var movie = await _movieRepository.GetByIdAndEventIdAsync(movieId, evt.Id, ct);
        if (movie is null)
            throw new NotFoundException("Film introuvable");

        var participant = await _participantRepository.FindByIdAndEventIdAsync(request.ParticipantId, evt.Id, ct);
        if (participant is null)
            throw new BadRequestException("Participant invalide pour cette soirée");

        var vote = new Vote
        {
            Id = string.Empty,
            EventId = evt.Id,
            MovieId = movie.Id,
            ParticipantId = participant.Id,
            Value = request.Value,
            CreatedAt = default,
            UpdatedAt = default
        };

        var saved = await _voteRepository.UpsertAsync(vote, ct);

        return new VoteResponse
        {
            Id = saved.Id,
            EventId = saved.EventId,
            MovieId = saved.MovieId,
            ParticipantId = saved.ParticipantId,
            Value = saved.Value,
            CreatedAt = saved.CreatedAt,
            UpdatedAt = saved.UpdatedAt
        };
    }
}
