using MoviePicker.Api.Application.DTOs;

namespace MoviePicker.Api.Application.UseCases.Auth.TwoFactor;

public interface IEnableTwoFactorHandler
{
    Task<TwoFactorBackupCodesResponse> HandleAsync(
        string userId,
        EnableTwoFactorRequest request,
        bool recentlyAuthenticated,
        CancellationToken ct = default);
}
