using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Domain.Exceptions;

namespace MoviePicker.Api.Application.UseCases.Auth.EmailVerification;

public sealed class ResendEmailVerificationHandler : IResendEmailVerificationHandler
{
    private readonly IUserRepository _users;
    private readonly IEmailVerificationMailer _mailer;

    public ResendEmailVerificationHandler(IUserRepository users, IEmailVerificationMailer mailer)
    {
        _users = users;
        _mailer = mailer;
    }

    public async Task HandleAsync(string userId, EmailVerificationRequest request, CancellationToken ct = default)
    {
        var user = await _users.GetByIdAsync(userId, ct) ?? throw Errors.UserNotFound();
        await _mailer.SendAsync(user, request.Locale, ct);
    }
}
