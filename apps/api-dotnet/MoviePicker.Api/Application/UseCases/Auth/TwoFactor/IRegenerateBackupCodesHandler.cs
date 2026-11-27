using MoviePicker.Api.Application.DTOs;

namespace MoviePicker.Api.Application.UseCases.Auth.TwoFactor;

public interface IRegenerateBackupCodesHandler
{
    Task<TwoFactorBackupCodesResponse> HandleAsync(string userId, TwoFactorCodeRequest request, CancellationToken ct = default);
}
