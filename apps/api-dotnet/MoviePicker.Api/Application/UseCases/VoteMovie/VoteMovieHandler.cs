using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.Shared;
using MoviePicker.Api.Domain.Entities;

namespace MoviePicker.Api.Application.UseCases.VoteMovie;

public sealed class VoteMovieHandler : IVoteMovieHandler
{
    private readonly IEventRepository _eventRepository;
    private readonly IMovieRepository _movieRepository;
    private readonly IParticipantRepository _participantRepository;
    private readonly IVoteRepository _voteRepository;
    private readonly ICurrentUserAccessor _currentUserAccessor;

    public VoteMovieHandler(
        IEventRepository eventRepository,
        IMovieRepository movieRepository,
        IParticipantRepository participantRepository,
        IVoteRepository voteRepository,
        ICurrentUserAccessor currentUserAccessor)
    {
        _eventRepository = eventRepository;
        _movieRepository = movieRepository;
        _participantRepository = participantRepository;
        _voteRepository = voteRepository;
        _currentUserAccessor = currentUserAccessor;
    }

    public async Task<VoteResponse> HandleAsync(string idOrSlug, string movieId, VoteRequest request, CancellationToken ct = default)
    {
        var (evt, movie, participant) = await MovieActionContext.ResolveOwnedMovieAsync(
            _eventRepository,
            _movieRepository,
            _participantRepository,
            _currentUserAccessor,
            idOrSlug,
            movieId,
            request.ParticipantId,
            "Vous ne pouvez voter que pour votre propre participation.",
            ct);

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
