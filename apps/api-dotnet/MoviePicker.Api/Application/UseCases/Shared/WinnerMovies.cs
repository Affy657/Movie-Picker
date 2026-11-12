using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Domain.Entities;

namespace MoviePicker.Api.Application.UseCases.Shared;

public static class WinnerMovies
{
    public static Task<IReadOnlyList<Movie>> ListAsync(IMovieRepository movies, Event evt, CancellationToken ct) =>
        ListAsync(movies, evt, evt.GetWinnerMovieIds(), ct);

    public static async Task<IReadOnlyList<Movie>> ListAsync(
        IMovieRepository movies,
        Event evt,
        IReadOnlyList<string> movieIds,
        CancellationToken ct)
    {
        if (movieIds.Count == 0)
            return [];

        var byId = (await movies.ListByIdsAsync(movieIds, ct))
            .Where(m => m.EventId == evt.Id)
            .ToDictionary(m => m.Id);

        return movieIds
            .Select(id => byId.GetValueOrDefault(id))
            .OfType<Movie>()
            .ToList();
    }

    public static IReadOnlyList<Movie> AmongProposals(IEnumerable<Movie> proposals, IEnumerable<Event> events)
    {
        var winnerMovieIds = events.SelectMany(e => e.GetWinnerMovieIds()).ToHashSet();
        return proposals.Where(m => winnerMovieIds.Contains(m.Id)).ToList();
    }
}
