using MoviePicker.Api.Application.DTOs;

namespace MoviePicker.Api.Application.UseCases.GetEventDetail;

public interface IGetEventDetailHandler
{
    Task<EventDetailResponse> HandleAsync(string idOrSlug, CancellationToken ct = default);
}
