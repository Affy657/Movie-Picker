using MoviePicker.Api.Application.DTOs;

namespace MoviePicker.Api.Application.UseCases.UserStats;

public interface IGetUserStatsHandler
{
    Task<UserStatsResponse> HandleAsync(string handle, CancellationToken ct = default);
}
