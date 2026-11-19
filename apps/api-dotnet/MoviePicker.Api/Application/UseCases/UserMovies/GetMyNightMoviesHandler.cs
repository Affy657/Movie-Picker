using Microsoft.Extensions.Options;
using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.Shared;
using MoviePicker.Api.Configuration;
using MoviePicker.Api.Domain.Entities;

namespace MoviePicker.Api.Application.UseCases.UserMovies;

public sealed class GetMyNightMoviesHandler : IGetMyNightMoviesHandler
{
    private readonly IEventRepository _events;
    private readonly IParticipantRepository _participants;
    private readonly IMovieRepository _movies;
    private readonly IUserRepository _users;
    private readonly WatchedHistoryReader _history;
    private readonly ITmdbMovieSearch _tmdb;
    private readonly MoviePickerOptions _options;

    public GetMyNightMoviesHandler(
        IEventRepository events,
        IParticipantRepository participants,
        IMovieRepository movies,
        IUserRepository users,
        WatchedHistoryReader history,
        ITmdbMovieSearch tmdb,
        IOptions<MoviePickerOptions> options)
    {
        _events = events;
        _participants = participants;
        _movies = movies;
        _users = users;
        _history = history;
        _tmdb = tmdb;
        _options = options.Value;
    }

    public async Task<MyNightMoviesResponse> HandleAsync(string userId, CancellationToken ct = default)
    {
        var (winnerMovieIds, proposals) = await LoadProposalsAsync(userId, ct);
        if (proposals.Count == 0)
            return new MyNightMoviesResponse();

        var films = proposals
            .GroupBy(m => (m.TmdbId, m.MediaType))
            .Select(g => g.OrderByDescending(m => m.CreatedAt).ThenBy(m => m.Id, StringComparer.Ordinal).ToList())
            .OrderByDescending(g => g[0].CreatedAt)
            .ToList();

        var proposersTask = LoadProposersAsync(proposals, films, ct);
        var watchedTask = _history.ReadKeysAsync(userId, ct);
        var enrichmentsTask = TmdbEnrichments.LoadAsync(
            films.Select(g => (g[0].TmdbId, g[0].MediaType)), _tmdb, _options, ct);
        await Task.WhenAll(proposersTask, watchedTask, enrichmentsTask);

        var (participantById, avatars) = await proposersTask;
        var context = new FilmContext(
            userId,
            participantById,
            winnerMovieIds,
            await watchedTask,
            avatars,
            await enrichmentsTask);

        return new MyNightMoviesResponse { Items = films.ConvertAll(context.ToItem) };
    }

    private async Task<(HashSet<string> WinnerMovieIds, List<Movie> Proposals)> LoadProposalsAsync(
        string userId,
        CancellationToken ct)
    {
        var nightIds = (await MyNights.ListIdsAsync(_events, _participants, userId, ct)).ToList();
        if (nightIds.Count == 0)
            return ([], []);

        var nightsTask = _events.ListByIdsAsync(nightIds, ct);
        var proposalsTask = _movies.ListByEventIdsAsync(nightIds, ct);
        await Task.WhenAll(nightsTask, proposalsTask);
        var nights = await nightsTask;
        var liveNightIds = nights.Select(n => n.Id).ToHashSet(StringComparer.Ordinal);
        var proposals = (await proposalsTask).Where(m => liveNightIds.Contains(m.EventId)).ToList();
        var winnerMovieIds = WinnerMovies.AmongProposals(proposals, nights)
            .Select(m => m.Id)
            .ToHashSet(StringComparer.Ordinal);
        return (winnerMovieIds, proposals);
    }

    private async Task<(Dictionary<string, Participant> ById, ParticipantAvatars Avatars)> LoadProposersAsync(
        List<Movie> proposals,
        List<List<Movie>> films,
        CancellationToken ct)
    {
        var participantById = (await _participants.ListByEventIdsAsync(
                proposals.Select(m => m.EventId).Distinct(StringComparer.Ordinal).ToList(), ct))
            .DistinctBy(p => p.Id)
            .ToDictionary(p => p.Id, StringComparer.Ordinal);
        var lastProposers = films
            .Select(g => participantById.GetValueOrDefault(g[0].ParticipantId))
            .OfType<Participant>();
        return (participantById, await ParticipantAvatars.LoadAsync(_users, lastProposers, ct));
    }

    private sealed record FilmContext(
        string UserId,
        Dictionary<string, Participant> ParticipantById,
        HashSet<string> WinnerMovieIds,
        WatchedKeys Watched,
        ParticipantAvatars Avatars,
        IReadOnlyDictionary<(int TmdbId, MovieMediaType MediaType), TmdbMovieEnrichment?> Enrichments)
    {
        public MyNightMovieItem ToItem(List<Movie> proposals)
        {
            var latest = proposals[0];
            var enrichment = Enrichments.GetValueOrDefault((latest.TmdbId, latest.MediaType));
            return new MyNightMovieItem
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
                ProposedByMe = proposals.Any(m => IsMine(ParticipantById.GetValueOrDefault(m.ParticipantId))),
                IsWinner = proposals.Any(m => WinnerMovieIds.Contains(m.Id)),
                IsWatched = Watched.Contains(latest.TmdbId, latest.MediaType),
                LastProposer = ParticipantById.TryGetValue(latest.ParticipantId, out var proposer)
                    ? ToProposer(proposer)
                    : null,
            };
        }

        private NightMovieProposerResponse ToProposer(Participant proposer) => new()
        {
            Pseudo = proposer.Pseudo,
            AvatarId = Avatars.Of(proposer),
            IsMe = IsMine(proposer),
        };

        private bool IsMine(Participant? participant) =>
            participant is not null && string.Equals(participant.UserId, UserId, StringComparison.Ordinal);
    }
}
