using Microsoft.AspNetCore.Identity;
using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Domain.Exceptions;

namespace MoviePicker.Api.Application.UseCases.Auth;

public sealed class LoginUserHandler : ILoginUserHandler
{
    private readonly IUserRepository _users;
    private readonly IPasswordHasher<User> _passwordHasher;

    public LoginUserHandler(IUserRepository users, IPasswordHasher<User> passwordHasher)
    {
        _users = users;
        _passwordHasher = passwordHasher;
    }

    public async Task<LoginResponse> HandleAsync(LoginRequest request, CancellationToken ct = default)
    {
        var user = await _users.GetByEmailAsync(request.Email.Trim(), ct);
        if (user is null || string.IsNullOrEmpty(user.PasswordHash))
            throw new UnauthorizedException("Identifiants incorrects.");

        var verify = _passwordHasher.VerifyHashedPassword(user, user.PasswordHash, request.Password);
        if (verify == PasswordVerificationResult.Failed)
            throw new UnauthorizedException("Identifiants incorrects.");

        return new LoginResponse { UserId = user.Id, DisplayName = user.DisplayName };
    }
}
