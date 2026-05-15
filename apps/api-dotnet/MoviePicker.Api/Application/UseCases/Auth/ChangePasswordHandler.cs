using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Logging;
using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Domain.Exceptions;

namespace MoviePicker.Api.Application.UseCases.Auth;

public sealed class ChangePasswordHandler : IChangePasswordHandler
{
    private readonly IUserRepository _users;
    private readonly IPasswordHasher<User> _passwordHasher;
    private readonly IAuthSessionInvalidator _sessionInvalidator;
    private readonly TimeProvider _clock;
    private readonly ILogger<ChangePasswordHandler> _logger;

    public ChangePasswordHandler(
        IUserRepository users,
        IPasswordHasher<User> passwordHasher,
        IAuthSessionInvalidator sessionInvalidator,
        TimeProvider clock,
        ILogger<ChangePasswordHandler> logger)
    {
        _users = users;
        _passwordHasher = passwordHasher;
        _sessionInvalidator = sessionInvalidator;
        _clock = clock;
        _logger = logger;
    }

    public async Task HandleAsync(string userId, ChangePasswordRequest request, CancellationToken ct = default)
    {
        var user = await _users.GetByIdAsync(userId, ct) ?? throw new NotFoundException("Utilisateur introuvable.");

        var verify = _passwordHasher.VerifyHashedPassword(user, user.PasswordHash, request.CurrentPassword);
        if (verify == PasswordVerificationResult.Failed)
        {
            _logger.LogWarning("ChangePassword: incorrect current password for {UserId}", userId);
            throw new UnauthorizedException("Mot de passe actuel incorrect.");
        }

        var validationError = AuthInputValidation.ValidatePassword(request.NewPassword);
        if (validationError is not null)
            throw new BadRequestException(validationError);

        var now = _clock.GetUtcNow();
        var newHash = _passwordHasher.HashPassword(user, request.NewPassword);
        var updated = user with { PasswordHash = newHash, UpdatedAt = now };
        await _users.UpdateAsync(updated, ct);

        // Sécurité : on invalide toutes les sessions actives (y compris celle qui vient
        // de faire l'appel). Le contrôleur clear le cookie courant pour aligner le client.
        var invalidatedSessions = await _sessionInvalidator.InvalidateAllForUserAsync(userId, ct);

        _logger.LogInformation(
            "ChangePassword: success for {EmailMasked} (userId={UserId}, invalidatedSessions={Sessions})",
            EmailMasking.Mask(user.Email), userId, invalidatedSessions);
    }
}
