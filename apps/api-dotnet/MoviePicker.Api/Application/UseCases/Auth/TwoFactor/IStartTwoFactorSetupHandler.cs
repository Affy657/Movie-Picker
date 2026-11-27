using MoviePicker.Api.Application.DTOs;

namespace MoviePicker.Api.Application.UseCases.Auth.TwoFactor;

public interface IStartTwoFactorSetupHandler
{
    Task<TwoFactorSetupResponse> HandleAsync(string userId, CancellationToken ct = default);
}
