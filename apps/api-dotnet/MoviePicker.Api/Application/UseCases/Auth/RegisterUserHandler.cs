using Microsoft.Extensions.Logging;
using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.Profile;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Domain.Exceptions;

namespace MoviePicker.Api.Application.UseCases.Auth;

public sealed class RegisterUserHandler : IRegisterUserHandler
{
    private readonly IUserRepository _users;
    private readonly IPasswordHasher _passwordHasher;
    private readonly ILogger<RegisterUserHandler> _logger;

    public RegisterUserHandler(IUserRepository users, IPasswordHasher passwordHasher, ILogger<RegisterUserHandler> logger)
    {
        _users = users;
        _passwordHasher = passwordHasher;
        _logger = logger;
    }

    public async Task<RegisterResponse> HandleAsync(RegisterRequest request, CancellationToken ct = default)
    {
        var displayErr = AuthInputValidation.ValidateDisplayName(request.DisplayName);
        if (displayErr is not null)
            throw new BadRequestException(displayErr);

        var pwdErr = AuthInputValidation.ValidatePassword(request.Password);
        if (pwdErr is not null)
            throw new BadRequestException(pwdErr);

        var email = request.Email.Trim();
        if (await _users.GetByEmailAsync(email, ct) is not null)
            throw new ConflictException("Un compte existe déjà pour cette adresse e-mail.");

        var displayName = request.DisplayName.Trim();
        var now = DateTimeOffset.UtcNow;

        var created = await HandleAllocator.CreateWithUniqueHandleAsync(
            _users,
            displayName,
            handle =>
            {
                var draft = new User
                {
                    Email = email,
                    DisplayName = displayName,
                    Handle = handle,
                    IsProfilePublic = true,
                    CreatedAt = now,
                    UpdatedAt = now
                };
                return draft with { PasswordHash = _passwordHasher.Hash(request.Password) };
            },
            ct);

        _logger.LogInformation("User registered: {UserId}", created.Id);
        return new RegisterResponse { UserId = created.Id, DisplayName = created.DisplayName };
    }
}
