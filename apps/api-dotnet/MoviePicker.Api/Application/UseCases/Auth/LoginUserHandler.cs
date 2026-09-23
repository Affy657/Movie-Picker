using System.Security.Cryptography;
using System.Text;
using Microsoft.Extensions.Logging;
using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Domain.Exceptions;

namespace MoviePicker.Api.Application.UseCases.Auth;

public sealed class LoginUserHandler : ILoginUserHandler
{
    public const string UnknownUserDecoyHash =
        "AQAAAAIAAYagAAAAEO1qf3SK73PS6AINjL/a6odkskuuWmLLZ2dbhGrH4nIlBBAwQH/v47p2HGGY+2q3ng==";

    public const int MaxFailuresPerAccountAndAddress = 10;
    public const int MaxFailuresPerAccountWindow = 100;
    public const string AccountThrottledLogTemplate = "Sign-in refused: too many failed attempts on one account";

    public static readonly TimeSpan FailureWindow = TimeSpan.FromMinutes(15);

    private readonly IUserRepository _users;
    private readonly IPasswordHasher _passwordHasher;
    private readonly IRateLimitCounterStore _failures;
    private readonly IClientAddressAccessor _clientAddress;
    private readonly TimeProvider _clock;
    private readonly ILogger<LoginUserHandler> _logger;

    public LoginUserHandler(
        IUserRepository users,
        IPasswordHasher passwordHasher,
        IRateLimitCounterStore failures,
        IClientAddressAccessor clientAddress,
        TimeProvider clock,
        ILogger<LoginUserHandler> logger)
    {
        _users = users;
        _passwordHasher = passwordHasher;
        _failures = failures;
        _clientAddress = clientAddress;
        _clock = clock;
        _logger = logger;
    }

    public async Task<LoginResponse> HandleAsync(LoginRequest request, CancellationToken ct = default)
    {
        var email = request.Email.Trim();
        var attempt = FailureCounters(email);
        await ReserveAttemptAsync(attempt, ct);

        var user = await _users.GetByEmailAsync(email, ct);
        if (user is null || string.IsNullOrEmpty(user.PasswordHash))
        {
            _passwordHasher.Verify(UnknownUserDecoyHash, request.Password);
            throw Errors.InvalidCredentials();
        }

        if (_passwordHasher.Verify(user.PasswordHash, request.Password) == PasswordVerification.Failed)
            throw Errors.InvalidCredentials();

        await _failures.DecrementAsync(attempt.SourceKey, CancellationToken.None);
        await _failures.DecrementAsync(attempt.AccountKey, CancellationToken.None);
        return new LoginResponse { UserId = user.Id, DisplayName = user.DisplayName };
    }

    private async Task ReserveAttemptAsync(FailureCounterKeys attempt, CancellationToken ct)
    {
        if (await _failures.IncrementAsync(attempt.SourceKey, attempt.WindowEnd, ct) > MaxFailuresPerAccountAndAddress
            || await _failures.IncrementAsync(attempt.AccountKey, attempt.WindowEnd, ct) > MaxFailuresPerAccountWindow)
        {
            _logger.LogWarning(AccountThrottledLogTemplate);
            throw Errors.TooManySignInAttempts();
        }
    }

    private sealed record FailureCounterKeys(string SourceKey, string AccountKey, DateTimeOffset WindowEnd);

    private FailureCounterKeys FailureCounters(string email)
    {
        var now = _clock.GetUtcNow();
        var windowIndex = now.UtcTicks / FailureWindow.Ticks;
        var account = Digest(email.ToLowerInvariant());
        var source = Digest(_clientAddress.GetClientAddress());
        return new FailureCounterKeys(
            $"login-failures|{account}|{source}|{windowIndex}",
            $"login-failures|{account}|{windowIndex}",
            new DateTimeOffset((windowIndex + 1) * FailureWindow.Ticks, TimeSpan.Zero));
    }

    private static string Digest(string value) =>
        Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(value)))[..32];
}
