using Microsoft.AspNetCore.Identity;
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
    private readonly IPasswordHasher<User> _passwordHasher;
    private readonly ILogger<RegisterUserHandler> _logger;

    public RegisterUserHandler(IUserRepository users, IPasswordHasher<User> passwordHasher, ILogger<RegisterUserHandler> logger)
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

        // Retry loop: rare but possible TOCTOU when two registrations race on the same handle.
        User? created = null;
        const int MaxHandleAttempts = 5;
        for (var attempt = 1; attempt <= MaxHandleAttempts; attempt++)
        {
            var handle = await HandleAllocator.AllocateFromDisplayNameAsync(_users, displayName, ct);
            var draft = new User
            {
                Email = email,
                DisplayName = displayName,
                Handle = handle,
                IsProfilePublic = true,
                CreatedAt = now,
                UpdatedAt = now
            };
            var user = draft with { PasswordHash = _passwordHasher.HashPassword(draft, request.Password) };
            try
            {
                created = await _users.AddAsync(user, ct);
                break;
            }
            catch (ConflictException ex) when (ex.Message == "handle_conflict" && attempt < MaxHandleAttempts)
            {
                // Another concurrent registration claimed the same handle — retry with a fresh one.
            }
        }

        if (created is null)
            throw new ConflictException("Impossible d'allouer un handle unique. Réessayez.");

        _logger.LogInformation("User registered: {UserId}", created.Id);
        return new RegisterResponse { UserId = created.Id, DisplayName = created.DisplayName };
    }
}
