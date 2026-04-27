using MoviePicker.Api.Application.DTOs;

namespace MoviePicker.Api.Application.UseCases.DeleteEvent;

public interface IDeleteEventHandler
{
    Task<DeleteEventResponse> HandleAsync(string idOrSlug, CancellationToken ct = default);
}
