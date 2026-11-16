using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Domain.Entities;

namespace MoviePicker.Api.Application.UseCases.UserMovies;

public sealed class WatchedKeys
{
    private readonly HashSet<(int TmdbId, MovieMediaType MediaType)> _keys;

    public WatchedKeys(IEnumerable<MovieListTitle> titles)
    {
        _keys = [.. titles.Select(title => (title.TmdbId, title.MediaType))];
    }

    public bool Contains(int tmdbId, MovieMediaType mediaType) => _keys.Contains((tmdbId, mediaType));

    public int CountAmong(IEnumerable<MovieListTitle> titles) =>
        titles.Count(title => Contains(title.TmdbId, title.MediaType));
}
