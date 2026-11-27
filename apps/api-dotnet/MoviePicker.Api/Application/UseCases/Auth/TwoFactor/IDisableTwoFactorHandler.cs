using MoviePicker.Api.Application.DTOs;

namespace MoviePicker.Api.Application.UseCases.Auth.TwoFactor;

public interface IDisableTwoFactorHandler
{
    Task HandleAsync(string userId, TwoFactorCodeRequest request, CancellationToken ct = default);
}
