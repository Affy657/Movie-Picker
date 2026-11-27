using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Configuration;
using MoviePicker.Api.Domain;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Domain.Exceptions;

namespace MoviePicker.Api.Application.UseCases.Auth.SignInDevices;

public sealed class SignInDeviceHandler : ISignInDeviceHandler
{
    public const string AlertQuotaScope = "new-sign-in-email";
    public const int MaxAlertsPerAccountPerDay = 5;

    private static readonly TimeSpan AlertQuotaWindow = TimeSpan.FromDays(1);

    private readonly IUserRepository _users;
    private readonly IKnownDeviceRepository _devices;
    private readonly IEmailSender _emailSender;
    private readonly ISharedQuota _quota;
    private readonly MoviePickerOptions _options;
    private readonly TimeProvider _clock;
    private readonly ILogger<SignInDeviceHandler> _logger;

    public SignInDeviceHandler(
        IUserRepository users,
        IKnownDeviceRepository devices,
        IEmailSender emailSender,
        ISharedQuota quota,
        IOptions<MoviePickerOptions> options,
        TimeProvider clock,
        ILogger<SignInDeviceHandler> logger)
    {
        _users = users;
        _devices = devices;
        _emailSender = emailSender;
        _quota = quota;
        _options = options.Value;
        _clock = clock;
        _logger = logger;
    }

    public async Task<SignInDevice> HandleAsync(SignInDeviceRequest request, CancellationToken ct = default)
    {
        var token = SignInDeviceTokens.IsWellFormed(request.PresentedToken)
            ? request.PresentedToken!
            : SignInDeviceTokens.Generate();
        var tokenHash = SignInDeviceTokens.Hash(request.UserId, token);
        var now = _clock.GetUtcNow();

        var known = await _devices.FindAsync(request.UserId, tokenHash, now, ct);
        if (known is not null)
        {
            await _devices.MarkSeenAsync(known.Id, now, ct);
            return new SignInDevice(token, known.Id);
        }

        var user = await _users.GetByIdAsync(request.UserId, ct) ?? throw Errors.UserNotFound();
        var hadKnownDevices = await _devices.AnyForUserAsync(user.Id, now, ct);
        var device = UserAgentDevice.Parse(request.UserAgent);
        var added = await _devices.TryAddAsync(
            new KnownDevice
            {
                UserId = user.Id,
                TokenHash = tokenHash,
                Browser = device.Browser,
                OperatingSystem = device.OperatingSystem,
                Kind = device.Kind,
                FirstSeenAt = now,
                LastSeenAt = now
            },
            ct);
        if (added is null)
        {
            var concurrent = await _devices.FindAsync(user.Id, tokenHash, now, ct);
            return new SignInDevice(token, concurrent?.Id ?? string.Empty);
        }

        if (hadKnownDevices)
            await AlertAsync(user, new NewSignIn(device, request.Method, now), request.Language, ct);
        return new SignInDevice(token, added.Id);
    }

    private async Task AlertAsync(User user, NewSignIn signIn, CatalogLanguage language, CancellationToken ct)
    {
        if (!await _quota.TryConsumeAsync(AlertQuotaScope, user.Id, MaxAlertsPerAccountPerDay, AlertQuotaWindow, ct))
        {
            _logger.LogWarning("NewSignIn: daily alert cap reached for {UserId}", user.Id);
            return;
        }

        var site = new Uri(_options.ResolvedWebBaseUrl());
        try
        {
            await _emailSender.SendAsync(NewSignInEmailFactory.Build(user.Email, signIn, language, site), ct);
            _logger.LogInformation("NewSignIn: alert sent for {UserId}", user.Id);
        }
        catch (EmailDeliveryException ex)
        {
            _logger.LogWarning(ex, "NewSignIn: alert not delivered for {UserId} (status={Status})", user.Id, ex.StatusCode);
        }
    }
}
