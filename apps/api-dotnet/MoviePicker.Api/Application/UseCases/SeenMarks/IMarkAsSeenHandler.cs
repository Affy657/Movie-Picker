using MoviePicker.Api.Application.DTOs;

namespace MoviePicker.Api.Application.UseCases.SeenMarks;

public interface IMarkAsSeenHandler
{
    Task<SeenMarkResponse> HandleAsync(string idOrSlug, string movieId, MarkAsSeenRequest request, CancellationToken ct = default);
}
