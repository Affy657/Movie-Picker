using MoviePicker.Api.Application.DTOs;

namespace MoviePicker.Api.Application.UseCases.Auth.PasswordReset;

public interface IRequestPasswordResetHandler
{
    Task HandleAsync(
        PasswordResetRequest request,
        string? clientIp,
        string? userAgent,
        CancellationToken ct = default);
}
