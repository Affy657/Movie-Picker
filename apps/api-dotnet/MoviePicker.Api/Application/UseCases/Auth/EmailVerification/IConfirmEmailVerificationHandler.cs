using MoviePicker.Api.Application.DTOs;

namespace MoviePicker.Api.Application.UseCases.Auth.EmailVerification;

public interface IConfirmEmailVerificationHandler
{
    Task HandleAsync(EmailVerificationConfirmRequest request, CancellationToken ct = default);
}
