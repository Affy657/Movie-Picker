using Microsoft.Extensions.Options;
using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.Profile;
using MoviePicker.Api.Application.UseCases.Shared;
using MoviePicker.Api.Configuration;
using MoviePicker.Api.Domain.Entities;

namespace MoviePicker.Api.Application.UseCases.UserMovies;

public sealed class GetUserProposedMoviesHandler : IGetUserProposedMoviesHandler
{
    private const int ParticipantsCap = 500;

    private readonly IUserRepository _users;
    private readonly IParticipantRepository _participants;
    private readonly IEventRepository _events;
    private readonly IMovieRepository _movies;
    private readonly ITmdbMovieSearch _tmdb;
    private readonly MoviePickerOptions _options;

    public GetUserProposedMoviesHandler(
        IUserRepository users,
        IParticipantRepository participants,
        IEventRepository events,
        IMovieRepository movies,
        ITmdbMovieSearch tmdb,
        IOptions<MoviePickerOptions> options)
    {
        _users = users;
        _participants = participants;
        _events = events;
        _movies = movies;
        _tmdb = tmdb;
        _options = options.Value;
    }

    public async Task<UserProposedMoviesResponse> HandleAsync(string handle, bool winningOnly, CancellationToken ct = default)
    {
        var user = await PublicProfileGuard.RequirePublicUserAsync(_users, handle, ct);

        var participants = await _participants.ListByUserIdAsync(user.Id, ParticipantsCap, ct);
        if (participants.Count == 0)
            return new UserProposedMoviesResponse();

        var proposals = await _movies.ListByParticipantIdsAsync(participants.Select(p => p.Id).ToList(), ct);
        if (winningOnly)
            proposals = await KeepWinnersAsync(proposals, ct);

        var films = proposals
            .GroupBy(m => (m.TmdbId, m.MediaType))
            .Select(g => (Latest: g.MaxBy(m => m.CreatedAt)!, Count: g.Count()))
            .OrderByDescending(x => x.Latest.CreatedAt)
            .ToList();

        var enrichments = await WatchedMoviesFacts.LoadEnrichmentsAsync(
            films.Select(x => (x.Latest.TmdbId, x.Latest.MediaType)), _tmdb, _options, ct);

        return new UserProposedMoviesResponse
        {
            Items = films.ConvertAll(x => ToItem(x.Latest, x.Count, enrichments.GetValueOrDefault((x.Latest.TmdbId, x.Latest.MediaType)))),
        };
    }

    private async Task<IReadOnlyList<Movie>> KeepWinnersAsync(IReadOnlyList<Movie> proposals, CancellationToken ct)
    {
        var events = await _events.ListByIdsAsync(proposals.Select(m => m.EventId).Distinct().ToList(), ct);
        return WinnerMovies.AmongProposals(proposals, events);
    }

    private static UserProposedMovieItem ToItem(Movie latest, int proposalCount, TmdbMovieEnrichment? enrichment) => new()
    {
        TmdbId = latest.TmdbId,
        Title = latest.Title,
        Year = latest.Year,
        PosterPath = latest.PosterPath,
        VoteAverage = enrichment?.VoteAverage,
        RuntimeMinutes = enrichment?.RuntimeMinutes,
        GenreIds = latest.GenreIds,
        MediaType = latest.MediaType,
        LastProposedAt = latest.CreatedAt,
        ProposalCount = proposalCount,
    };
}
