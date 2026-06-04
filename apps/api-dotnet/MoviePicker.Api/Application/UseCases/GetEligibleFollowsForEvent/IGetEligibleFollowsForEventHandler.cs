using MoviePicker.Api.Application.DTOs;

namespace MoviePicker.Api.Application.UseCases.GetEligibleFollowsForEvent;

public interface IGetEligibleFollowsForEventHandler
{
    Task<EligibleFollowsResponse> HandleAsync(string idOrSlug, CancellationToken ct = default);
}
