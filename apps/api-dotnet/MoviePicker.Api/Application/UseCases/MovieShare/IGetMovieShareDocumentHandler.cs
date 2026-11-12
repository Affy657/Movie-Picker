using MoviePicker.Api.Application.UseCases.Shared;
using MoviePicker.Api.Domain.Entities;

namespace MoviePicker.Api.Application.UseCases.MovieShare;

public interface IGetMovieShareDocumentHandler
{
    Task<ShareDocument> HandleAsync(
        string movieRef,
        MovieMediaType mediaType,
        string apiPublicBaseUrl,
        CancellationToken ct = default);
}
