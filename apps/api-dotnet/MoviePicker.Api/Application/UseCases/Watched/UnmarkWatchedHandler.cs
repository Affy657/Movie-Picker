using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Domain.Entities;

namespace MoviePicker.Api.Application.UseCases.Watched;

public sealed class UnmarkWatchedHandler : IUnmarkWatchedHandler
{
    private readonly IWatchedTitleRepository _watched;

    public UnmarkWatchedHandler(IWatchedTitleRepository watched)
    {
        _watched = watched;
    }

    public Task HandleAsync(string userId, int tmdbId, MovieMediaType mediaType, CancellationToken ct = default) =>
        _watched.RemoveAsync(userId, tmdbId, mediaType, ct);
}
