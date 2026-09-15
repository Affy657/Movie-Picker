using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Domain.Exceptions;

namespace MoviePicker.Api.Application.UseCases.Auth;

public sealed class LoginUserHandler : ILoginUserHandler
{
    public const string DecoyPasswordHash =
        "AQAAAAIAAYagAAAAEO1qf3SK73PS6AINjL/a6odkskuuWmLLZ2dbhGrH4nIlBBAwQH/v47p2HGGY+2q3ng==";

    private readonly IUserRepository _users;
    private readonly IPasswordHasher _passwordHasher;

    public LoginUserHandler(IUserRepository users, IPasswordHasher passwordHasher)
    {
        _users = users;
        _passwordHasher = passwordHasher;
    }

    public async Task<LoginResponse> HandleAsync(LoginRequest request, CancellationToken ct = default)
    {
        var user = await _users.GetByEmailAsync(request.Email.Trim(), ct);
        if (user is null || string.IsNullOrEmpty(user.PasswordHash))
        {
            _passwordHasher.Verify(DecoyPasswordHash, request.Password);
            throw new UnauthorizedException("Identifiants incorrects.");
        }

        var verify = _passwordHasher.Verify(user.PasswordHash, request.Password);
        if (verify == PasswordVerification.Failed)
            throw new UnauthorizedException("Identifiants incorrects.");

        return new LoginResponse { UserId = user.Id, DisplayName = user.DisplayName };
    }
}
