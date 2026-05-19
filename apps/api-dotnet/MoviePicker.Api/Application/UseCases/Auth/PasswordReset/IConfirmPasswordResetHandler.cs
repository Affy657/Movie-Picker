using MoviePicker.Api.Application.DTOs;

namespace MoviePicker.Api.Application.UseCases.Auth.PasswordReset;

public interface IConfirmPasswordResetHandler
{
    Task<PasswordResetConfirmResponse> HandleAsync(PasswordResetConfirmRequest request, CancellationToken ct = default);
}
