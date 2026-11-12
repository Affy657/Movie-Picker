using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Domain.Entities;

namespace MoviePicker.Api.Application.UseCases.MovieNights;

public interface IGetMovieNightsHandler
{
    Task<MovieNightsResponse> HandleAsync(string userId, int tmdbId, MovieMediaType mediaType, CancellationToken ct = default);
}
