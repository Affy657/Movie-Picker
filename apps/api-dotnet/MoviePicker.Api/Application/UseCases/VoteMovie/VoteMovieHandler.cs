using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.Shared;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Domain.Exceptions;

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

        await EnsureWithinVoteLimitAsync(evt, movie, participant, ct);

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

    private async Task EnsureWithinVoteLimitAsync(Event evt, Movie movie, Participant participant, CancellationToken ct)
    {
        var maxVotes = evt.Config?.MaxVotesPerParticipant;
        if (maxVotes is not > 0)
            return;
        var votes = await _voteRepository.GetParticipantVotesByEventAsync(evt.Id, participant.Id, ct);
        if (votes.ContainsKey(movie.Id))
            return;
        if (votes.Count >= maxVotes)
            throw new ConflictException($"Limite de {maxVotes} vote(s) par participant atteinte.");
    }
}
