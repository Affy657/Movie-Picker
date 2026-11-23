using MoviePicker.Api.Application.DTOs;

namespace MoviePicker.Api.Application.UseCases.Auth.PasswordReset;

public interface IVerifyPasswordResetHandler
{
    Task HandleAsync(PasswordResetVerifyRequest request, CancellationToken ct = default);
}
