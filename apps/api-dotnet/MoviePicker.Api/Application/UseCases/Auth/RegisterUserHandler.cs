using Microsoft.AspNetCore.Identity;
using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Domain.Exceptions;

namespace MoviePicker.Api.Application.UseCases.Auth;

public sealed class RegisterUserHandler : IRegisterUserHandler
{
    private readonly IUserRepository _users;
    private readonly IPasswordHasher<User> _passwordHasher;

    public RegisterUserHandler(IUserRepository users, IPasswordHasher<User> passwordHasher)
    {
        _users = users;
        _passwordHasher = passwordHasher;
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

        var now = DateTimeOffset.UtcNow;
        var draft = new User
        {
            Id = string.Empty,
            Email = email,
            PasswordHash = string.Empty,
            DisplayName = request.DisplayName.Trim(),
            UiTheme = UiThemePreference.System,
            CreatedAt = now,
            UpdatedAt = now
        };
        var hash = _passwordHasher.HashPassword(draft, request.Password);
        var user = new User
        {
            Id = string.Empty,
            Email = email,
            PasswordHash = hash,
            DisplayName = draft.DisplayName,
            UiTheme = draft.UiTheme,
            CreatedAt = now,
            UpdatedAt = now
        };

        var created = await _users.AddAsync(user, ct);
        return new RegisterResponse { UserId = created.Id, DisplayName = created.DisplayName };
    }
}
