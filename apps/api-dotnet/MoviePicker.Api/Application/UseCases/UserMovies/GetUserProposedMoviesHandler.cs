using Microsoft.Extensions.Options;
using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.Profile;
using MoviePicker.Api.Application.UseCases.Shared;
using MoviePicker.Api.Configuration;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Domain.Exceptions;

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

    public async Task<UserProposedMoviesResponse> HandleAsync(
        string handle,
        string? currentUserId,
        bool winningOnly,
        CancellationToken ct = default)
    {
        var user = await PublicProfileGuard.RequirePublicUserAsync(_users, handle, ct);
        if (winningOnly && !PublicProfileGuard.CanSeeWatched(user, currentUserId))
            throw Errors.WatchedNotFound();

        return await HandleForUserAsync(user.Id, winningOnly, ct);
    }

    public Task<UserProposedMoviesResponse> HandleForUserAsync(
        string userId,
        bool winningOnly,
        CancellationToken ct = default) =>
        ListAsync(userId, winningOnly, proposerIsReading: false, ct);

    public Task<UserProposedMoviesResponse> HandleForOwnerAsync(
        string userId,
        bool winningOnly,
        CancellationToken ct = default) =>
        ListAsync(userId, winningOnly, proposerIsReading: true, ct);

    private async Task<UserProposedMoviesResponse> ListAsync(
        string userId,
        bool winningOnly,
        bool proposerIsReading,
        CancellationToken ct)
    {
        var participants = await _participants.ListByUserIdAsync(userId, ParticipantsCap, ct);
        if (participants.Count == 0)
            return new UserProposedMoviesResponse();

        var proposalsTask = _movies.ListByParticipantIdsAsync(participants.Select(p => p.Id).ToList(), ct);
        var nightsTask = _events.ListByIdsAsync(participants.Select(p => p.EventId).Distinct().ToList(), ct);
        await Task.WhenAll(proposalsTask, nightsTask);
        var nights = await nightsTask;
        IReadOnlyList<Movie> proposals = proposerIsReading
            ? await proposalsTask
            : AttributedProposals.Among(await proposalsTask, nights);
        if (winningOnly)
            proposals = WinnerMovies.AmongProposals(proposals, nights);

        var films = proposals
            .GroupBy(m => (m.TmdbId, m.MediaType))
            .Select(g => (Latest: g.MaxBy(m => m.CreatedAt)!, Count: g.Count()))
            .OrderByDescending(x => x.Latest.CreatedAt)
            .ToList();

        var enrichments = await TmdbEnrichments.LoadAsync(
            films.Select(x => (x.Latest.TmdbId, x.Latest.MediaType)), _tmdb, _options, CatalogLanguage.French, ct);

        return new UserProposedMoviesResponse
        {
            Items = films.ConvertAll(x => ToItem(x.Latest, x.Count, enrichments.GetValueOrDefault((x.Latest.TmdbId, x.Latest.MediaType)))),
        };
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
