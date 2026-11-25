using MoviePicker.Api.Domain.Entities;

namespace MoviePicker.Api.Application.UseCases.Auth.EmailVerification;

public interface IEmailVerificationMailer
{
    Task SendAsync(User user, string? locale, CancellationToken ct = default);
}
