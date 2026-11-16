using MoviePicker.Api.Application.Ports;

namespace MoviePicker.Api.Infrastructure.Letterboxd;

public sealed class StubLetterboxdWatchlistClient : ILetterboxdWatchlistClient
{
    public const string UnreachableUsername = "e2eintrouvable";

    private static readonly LetterboxdFilm[] Films =
    [
        new("film-e2e-stub", "Film E2E Stub", "2024"),
        new("titre-ambigu-e2e", "Titre ambigu E2E", "2022"),
    ];

    private static readonly LetterboxdFilm[] WatchedFilms =
    [
        new("film-e2e-stub", "Film E2E Stub", "2024", Rating: 8, WatchedOn: new DateOnly(2026, 11, 1)),
    ];

    public Task<LetterboxdFilmsSnapshot> GetWatchlistAsync(string username, CancellationToken ct = default) =>
        Task.FromResult(Read(username, Films));

    public Task<LetterboxdFilmsSnapshot> GetWatchedFilmsAsync(string username, CancellationToken ct = default) =>
        Task.FromResult(Read(username, WatchedFilms));

    private static LetterboxdFilmsSnapshot Read(string username, LetterboxdFilm[] films) =>
        string.Equals(username, UnreachableUsername, StringComparison.OrdinalIgnoreCase)
            ? LetterboxdFilmsSnapshot.Failed()
            : new LetterboxdFilmsSnapshot(films, IsComplete: true);
}
