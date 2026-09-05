using Microsoft.Extensions.Logging;
using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Domain.Exceptions;

namespace MoviePicker.Api.Application.UseCases.Auth;

public sealed class DeleteAccountHandler : IDeleteAccountHandler
{
    public const string AnonymizedParticipantPseudo = "Compte supprimé";

    private readonly IUserRepository _users;
    private readonly IPasswordHasher _passwordHasher;
    private readonly IEventRepository _events;
    private readonly IParticipantRepository _participants;
    private readonly IUserNotificationRepository _notifications;
    private readonly IPushSubscriptionRepository _pushSubscriptions;
    private readonly IFollowRepository _follows;
    private readonly IWatchlistRepository _watchlist;
    private readonly IPasswordResetTokenRepository _resetTokens;
    private readonly IAuthSessionInvalidator _sessionInvalidator;
    private readonly ILogger<DeleteAccountHandler> _logger;

    public DeleteAccountHandler(
        IUserRepository users,
        IPasswordHasher passwordHasher,
        IEventRepository events,
        IParticipantRepository participants,
        IUserNotificationRepository notifications,
        IPushSubscriptionRepository pushSubscriptions,
        IFollowRepository follows,
        IWatchlistRepository watchlist,
        IPasswordResetTokenRepository resetTokens,
        IAuthSessionInvalidator sessionInvalidator,
        ILogger<DeleteAccountHandler> logger)
    {
        _users = users;
        _passwordHasher = passwordHasher;
        _events = events;
        _participants = participants;
        _notifications = notifications;
        _pushSubscriptions = pushSubscriptions;
        _follows = follows;
        _watchlist = watchlist;
        _resetTokens = resetTokens;
        _sessionInvalidator = sessionInvalidator;
        _logger = logger;
    }

    public async Task HandleAsync(string userId, DeleteAccountRequest request, CancellationToken ct = default)
    {
        var user = await _users.GetByIdAsync(userId, ct) ?? throw new NotFoundException("Utilisateur introuvable.");

        if (string.IsNullOrEmpty(user.PasswordHash))
        {
            var confirmation = (request.Confirmation ?? string.Empty).Trim();
            var matchesHandle = !string.IsNullOrEmpty(user.Handle)
                && string.Equals(confirmation, user.Handle, StringComparison.OrdinalIgnoreCase);
            var matchesEmail = string.Equals(confirmation, user.Email, StringComparison.OrdinalIgnoreCase);
            if (!matchesHandle && !matchesEmail)
            {
                _logger.LogWarning("DeleteAccount: incorrect confirmation for {UserId}", userId);
                throw new UnauthorizedException("Confirmation incorrecte.");
            }
        }
        else
        {
            var verify = _passwordHasher.Verify(user.PasswordHash, request.Password ?? string.Empty);
            if (verify == PasswordVerification.Failed)
            {
                _logger.LogWarning("DeleteAccount: incorrect password for {UserId}", userId);
                throw new UnauthorizedException("Mot de passe incorrect.");
            }
        }

        var anonymizedEvents = await _events.AnonymizeCreatorAsync(userId, ct);
        var anonymizedParticipations = await _participants.AnonymizeByUserIdAsync(userId, AnonymizedParticipantPseudo, ct);
        await _notifications.DeleteByUserIdAsync(userId, ct);
        await _pushSubscriptions.DeleteByUserIdAsync(userId, ct);
        await _follows.DeleteAllForUserAsync(userId, ct);
        await _watchlist.DeleteAllForUserAsync(userId, ct);
        await _resetTokens.DeleteByUserIdAsync(userId, ct);
        await _sessionInvalidator.InvalidateAllForUserAsync(userId, ct);
        await _users.DeleteAsync(userId, ct);

        _logger.LogInformation(
            "DeleteAccount: success for {EmailMasked} (userId={UserId}, anonymizedEvents={Events}, anonymizedParticipations={Participations})",
            EmailMasking.Mask(user.Email), userId, anonymizedEvents, anonymizedParticipations);
    }
}
