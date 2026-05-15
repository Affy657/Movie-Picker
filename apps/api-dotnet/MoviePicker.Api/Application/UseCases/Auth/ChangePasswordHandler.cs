using Microsoft.AspNetCore.Identity;
using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Domain.Exceptions;

namespace MoviePicker.Api.Application.UseCases.Auth;

public sealed class ChangePasswordHandler : IChangePasswordHandler
{
    private readonly IUserRepository _users;
    private readonly IPasswordHasher<User> _passwordHasher;

    public ChangePasswordHandler(IUserRepository users, IPasswordHasher<User> passwordHasher)
    {
        _users = users;
        _passwordHasher = passwordHasher;
    }

    public async Task HandleAsync(string userId, ChangePasswordRequest request, CancellationToken ct = default)
    {
        var user = await _users.GetByIdAsync(userId, ct) ?? throw new NotFoundException("Utilisateur introuvable.");

        var verify = _passwordHasher.VerifyHashedPassword(user, user.PasswordHash, request.CurrentPassword);
        if (verify == PasswordVerificationResult.Failed)
            throw new UnauthorizedException("Mot de passe actuel incorrect.");

        var validationError = AuthInputValidation.ValidatePassword(request.NewPassword);
        if (validationError is not null)
            throw new BadRequestException(validationError);

        var newHash = _passwordHasher.HashPassword(user, request.NewPassword);
        var updated = user with { PasswordHash = newHash, UpdatedAt = DateTimeOffset.UtcNow };
        await _users.UpdateAsync(updated, ct);
    }
}
