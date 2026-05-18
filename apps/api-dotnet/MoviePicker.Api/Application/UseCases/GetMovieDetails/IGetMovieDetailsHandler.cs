using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Domain.Entities;

namespace MoviePicker.Api.Application.UseCases.GetMovieDetails;

public interface IGetMovieDetailsHandler
{
    Task<MovieDetailsResponse?> HandleAsync(int tmdbId, MovieMediaType mediaType, CancellationToken ct = default);
}
