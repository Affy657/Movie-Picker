using MoviePicker.Api.Application.DTOs;

namespace MoviePicker.Api.Application.UseCases.GetEligibleFollowsForEvent;

public interface IGetEligibleFollowsForEventHandler
{
    Task<EligibleFollowsResponse> HandleAsync(string currentUserId, string slug, CancellationToken ct = default);
}
