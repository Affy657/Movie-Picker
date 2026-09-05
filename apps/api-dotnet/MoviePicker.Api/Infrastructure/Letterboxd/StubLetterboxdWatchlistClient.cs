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

    public Task<LetterboxdWatchlistSnapshot> GetWatchlistAsync(string username, CancellationToken ct = default)
    {
        if (string.Equals(username, UnreachableUsername, StringComparison.OrdinalIgnoreCase))
            return Task.FromResult(LetterboxdWatchlistSnapshot.Failed());

        return Task.FromResult(new LetterboxdWatchlistSnapshot(Films, IsComplete: true));
    }
}
