using Microsoft.Extensions.Logging;
using MoviePicker.Api.Application.Avatars;
using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.Profile;
using MoviePicker.Api.Application.UseCases.Shared;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Domain.Exceptions;

namespace MoviePicker.Api.Application.UseCases.Auth.OAuth;

public sealed class OAuthLoginHandler : IOAuthLoginHandler
{
    public static readonly DateTimeOffset AddressConfirmationRequiredSince = new(2026, 11, 26, 12, 0, 0, TimeSpan.Zero);

    private readonly IUserRepository _users;
    private readonly IOAuthProfilePhotoImporter _photoImporter;
    private readonly IAuthSessionInvalidator _sessions;
    private readonly IPushSubscriptionRepository _pushSubscriptions;
    private readonly TimeProvider _clock;
    private readonly ILogger<OAuthLoginHandler> _logger;

    public OAuthLoginHandler(
        IUserRepository users,
        IOAuthProfilePhotoImporter photoImporter,
        IAuthSessionInvalidator sessions,
        IPushSubscriptionRepository pushSubscriptions,
        TimeProvider clock,
        ILogger<OAuthLoginHandler> logger)
    {
        _users = users;
        _photoImporter = photoImporter;
        _sessions = sessions;
        _pushSubscriptions = pushSubscriptions;
        _clock = clock;
        _logger = logger;
    }

    public async Task<OAuthOutcome> HandleAsync(ExternalLoginInfo info, string? accessToken = null, CancellationToken ct = default)
    {
        var existing = await _users.GetByIdentityAsync(info.Provider, info.Subject, ct);
        if (existing is not null)
        {
            _logger.LogInformation("OAuth login: known identity {Provider} (userId={UserId})", info.Provider, existing.Id);
            return SignedIn(await ConfirmVouchedAddressAsync(existing, info, ct));
        }

        if (string.IsNullOrWhiteSpace(info.Email) || !info.EmailVerified)
        {
            _logger.LogWarning("OAuth login: unverified or missing email for provider {Provider}", info.Provider);
            return new OAuthOutcome { Kind = OAuthOutcomeKind.EmailNotVerified };
        }

        var now = _clock.GetUtcNow();
        var email = info.Email.Trim();
        var identity = new LinkedIdentity
        {
            Provider = info.Provider,
            Subject = info.Subject,
            Email = email,
            LinkedAt = now
        };

        var byEmail = await _users.GetByEmailAsync(email, ct);
        if (byEmail is not null && !string.IsNullOrEmpty(byEmail.PasswordHash))
        {
            if (CanBeTakenOverBy(byEmail, info))
                return SignedIn(await TakeOverUnconfirmedAccountAsync(byEmail, info, identity, now, ct));

            _logger.LogWarning(
                "OAuth login: {Provider} identity matches a password account by e-mail, manual link required (userId={UserId})",
                info.Provider,
                byEmail.Id);
            return new OAuthOutcome { Kind = OAuthOutcomeKind.PasswordAccountRequiresManualLink };
        }

        if (byEmail is not null && byEmail.UnlinkedIdentities.Any(u => u.Provider == info.Provider && u.Subject == info.Subject))
        {
            _logger.LogWarning(
                "OAuth login: {Provider} identity was unlinked from the account of this e-mail, manual link required (userId={UserId})",
                info.Provider,
                byEmail.Id);
            return new OAuthOutcome { Kind = OAuthOutcomeKind.UnlinkedIdentityRequiresManualLink };
        }

        if (byEmail is not null)
        {
            var linked = await SaveOrResolveRaceAsync(
                byEmail with
                {
                    Identities = [.. byEmail.Identities, identity],
                    EmailVerifiedAt = byEmail.EmailVerifiedAt ?? now,
                    UpdatedAt = now
                },
                info,
                ct);
            _logger.LogInformation(
                "OAuth login: auto-linked {Provider} to existing account (userId={UserId})", info.Provider, linked.Id);
            return SignedIn(linked);
        }

        var (createdUser, isNewAccount) = await CreateAccountAsync(info, email, identity, now, ct);
        if (isNewAccount)
            createdUser = await _photoImporter.ImportAsync(createdUser, info, accessToken, ct);
        _logger.LogInformation(
            "OAuth login: created account via {Provider} (userId={UserId})", info.Provider, createdUser.Id);
        return new OAuthOutcome { Kind = OAuthOutcomeKind.SignedIn, User = createdUser, IsNewAccount = isNewAccount };
    }

    private static OAuthOutcome SignedIn(User user) => new() { Kind = OAuthOutcomeKind.SignedIn, User = user };

    private static bool CanBeTakenOverBy(User occupied, ExternalLoginInfo info) =>
        occupied.EmailVerifiedAt is null
        && occupied.CreatedAt >= AddressConfirmationRequiredSince
        && !occupied.UnlinkedIdentities.Any(u => u.Provider == info.Provider && u.Subject == info.Subject);

    private async Task<User> ConfirmVouchedAddressAsync(User user, ExternalLoginInfo info, CancellationToken ct)
    {
        if (user.EmailVerifiedAt is not null || !info.VouchesFor(user.Email))
            return user;

        var now = _clock.GetUtcNow();
        await _users.MarkEmailVerifiedAsync(user.Id, now, ct);
        return user with { EmailVerifiedAt = now };
    }

    private async Task<User> TakeOverUnconfirmedAccountAsync(
        User occupied,
        ExternalLoginInfo info,
        LinkedIdentity identity,
        DateTimeOffset now,
        CancellationToken ct)
    {
        var owned = await SaveOrResolveRaceAsync(
            occupied with
            {
                PasswordHash = string.Empty,
                Identities = [identity],
                UnlinkedIdentities = [],
                EmailVerifiedAt = now,
                UpdatedAt = now
            },
            info,
            ct);
        var revoked = await AccountAccessRevocation.RevokeEveryDeviceAsync(owned.Id, _sessions, _pushSubscriptions, _logger, ct);
        _logger.LogWarning(
            "OAuth login: {Provider} proved the unconfirmed address of a password account, its password, identities, sessions and push subscriptions were revoked (userId={UserId}, droppedIdentities={Identities}, invalidatedSessions={Sessions}, revokedPushSubscriptions={PushSubscriptions})",
            info.Provider,
            owned.Id,
            occupied.Identities.Count,
            revoked.Sessions,
            revoked.PushSubscriptions);
        return owned;
    }

    private async Task<User> SaveOrResolveRaceAsync(User updated, ExternalLoginInfo info, CancellationToken ct)
    {
        try
        {
            return await _users.UpdateAsync(updated, ct);
        }
        catch (ConflictException ex) when (IsLostFirstSignInRace(ex))
        {
            return await ResolveIdentityRaceAsync(info, ex, ct);
        }
    }

    private async Task<(User User, bool IsNewAccount)> CreateAccountAsync(
        ExternalLoginInfo info,
        string email,
        LinkedIdentity identity,
        DateTimeOffset now,
        CancellationToken ct)
    {
        var displayName = string.IsNullOrWhiteSpace(info.DisplayName)
            ? "Membre"
            : TextTruncation.ToMaxLength(info.DisplayName.Trim(), AuthInputValidation.DisplayNameMaxLength);

        try
        {
            var created = await HandleAllocator.CreateWithUniqueHandleAsync(
                _users,
                displayName,
                handle => new User
                {
                    Email = email,
                    EmailVerifiedAt = now,
                    DisplayName = displayName,
                    Handle = handle,
                    IsProfilePublic = true,
                    Identities = [identity],
                    CreatedAt = now,
                    UpdatedAt = now
                },
                ct);
            return (created, true);
        }
        catch (ConflictException ex) when (IsLostFirstSignInRace(ex))
        {
            return (await ResolveIdentityRaceAsync(info, ex, ct), false);
        }
    }

    private static bool IsLostFirstSignInRace(ConflictException ex) =>
        ex.Reason is ErrorCodes.IdentityConflict or ErrorCodes.EmailTaken or ErrorCodes.ConcurrentUpdate;

    private async Task<User> ResolveIdentityRaceAsync(ExternalLoginInfo info, ConflictException conflict, CancellationToken ct)
    {
        var winner = await _users.GetByIdentityAsync(info.Provider, info.Subject, ct);
        _logger.LogWarning(
            "OAuth login: first {Provider} sign-in lost a race ({Reason}), identity found on re-read: {Found}",
            info.Provider,
            conflict.Reason,
            winner is not null);
        return winner ?? throw Errors.OAuthLinkFailed();
    }
}
