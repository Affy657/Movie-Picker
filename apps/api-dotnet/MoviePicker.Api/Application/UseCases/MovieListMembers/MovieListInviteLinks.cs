using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Domain.Entities;

namespace MoviePicker.Api.Application.UseCases.MovieListMembers;

public static class MovieListInviteLinks
{
    public static async Task<MovieList?> FindAsync(IMovieListRepository lists, string token, CancellationToken ct) =>
        string.IsNullOrWhiteSpace(token) || token.Length > MovieListInviteToken.MaxLength
            ? null
            : await lists.FindByInviteTokenAsync(token, ct);

    public static async Task<MovieList?> FindActiveAsync(
        IMovieListRepository lists,
        string token,
        DateTimeOffset now,
        CancellationToken ct) =>
        await FindAsync(lists, token, ct) is { } list && list.AcceptsInviteToken(token, now) ? list : null;
}
