using MoviePicker.Api.Application.DTOs;

namespace MoviePicker.Api.Application.UseCases.Auth.EmailVerification;

public interface IResendEmailVerificationHandler
{
    Task HandleAsync(string userId, EmailVerificationRequest request, CancellationToken ct = default);
}
