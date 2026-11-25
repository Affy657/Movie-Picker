using Microsoft.Extensions.Logging;
using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.Shared;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Domain.Exceptions;

namespace MoviePicker.Api.Application.UseCases.Auth;

public sealed class DeleteAccountHandler : IDeleteAccountHandler
{
    private readonly IUserRepository _users;
    private readonly IPasswordHasher _passwordHasher;
    private readonly IEventRepository _events;
    private readonly IParticipantRepository _participants;
    private readonly IUserNotificationRepository _notifications;
    private readonly IPushSubscriptionRepository _pushSubscriptions;
    private readonly IFollowRepository _follows;
    private readonly IWatchlistRepository _watchlist;
    private readonly IMovieListRepository _movieLists;
    private readonly IFriendGroupRepository _groups;
    private readonly IWatchedTitleRepository _watchedTitles;
    private readonly ISavedListRepository _savedLists;
    private readonly IPasswordResetTokenRepository _resetTokens;
    private readonly IEmailVerificationTokenRepository _verificationTokens;
    private readonly IAvatarPhotoRepository _avatarPhotos;
    private readonly IBannerPhotoRepository _bannerPhotos;
    private readonly IAuthSessionInvalidator _sessionInvalidator;
    private readonly HostedNightsHandover _handover;
    private readonly IUnitOfWork _unitOfWork;
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
        IMovieListRepository movieLists,
        IFriendGroupRepository groups,
        IWatchedTitleRepository watchedTitles,
        ISavedListRepository savedLists,
        IPasswordResetTokenRepository resetTokens,
        IEmailVerificationTokenRepository verificationTokens,
        IAvatarPhotoRepository avatarPhotos,
        IBannerPhotoRepository bannerPhotos,
        IAuthSessionInvalidator sessionInvalidator,
        HostedNightsHandover handover,
        IUnitOfWork unitOfWork,
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
        _movieLists = movieLists;
        _groups = groups;
        _watchedTitles = watchedTitles;
        _savedLists = savedLists;
        _resetTokens = resetTokens;
        _verificationTokens = verificationTokens;
        _avatarPhotos = avatarPhotos;
        _bannerPhotos = bannerPhotos;
        _sessionInvalidator = sessionInvalidator;
        _handover = handover;
        _unitOfWork = unitOfWork;
        _logger = logger;
    }

    public async Task HandleAsync(string userId, DeleteAccountRequest request, bool recentlyAuthenticated, CancellationToken ct = default)
    {
        var user = await _users.GetByIdAsync(userId, ct) ?? throw Errors.UserNotFound();

        if (string.IsNullOrEmpty(user.PasswordHash))
        {
            if (!recentlyAuthenticated)
            {
                _logger.LogWarning("DeleteAccount: refused on a stale session for {UserId}", LogText.SingleLine(userId));
                throw Errors.ReauthenticationRequired();
            }

            var confirmation = (request.Confirmation ?? string.Empty).Trim();
            var matchesHandle = !string.IsNullOrEmpty(user.Handle)
                && string.Equals(confirmation, user.Handle, StringComparison.OrdinalIgnoreCase);
            var matchesEmail = string.Equals(confirmation, user.Email, StringComparison.OrdinalIgnoreCase);
            if (!matchesHandle && !matchesEmail)
            {
                _logger.LogWarning("DeleteAccount: incorrect confirmation for {UserId}", LogText.SingleLine(userId));
                throw Errors.ConfirmationIncorrect();
            }
        }
        else
        {
            var verify = _passwordHasher.Verify(user.PasswordHash, request.Password ?? string.Empty);
            if (verify == PasswordVerification.Failed)
            {
                _logger.LogWarning("DeleteAccount: incorrect password for {UserId}", LogText.SingleLine(userId));
                throw Errors.WrongPassword();
            }
        }

        long anonymizedEvents = 0;
        long anonymizedParticipations = 0;
        IReadOnlyList<HostHandover> handovers = [];

        await _unitOfWork.ExecuteAsync(
            async token =>
            {
                handovers = await _handover.HandOverAsync(userId, token);
                anonymizedEvents = await _events.AnonymizeCreatorAsync(userId, token);
                await _events.ForgetUserAsync(userId, token);
                var joinedEventIds = await _participants.ListDistinctEventIdsByUserIdAsync(userId, token);
                anonymizedParticipations = await _participants.AnonymizeByUserIdAsync(
                    userId, ServerCopy.DeletedAccount.Pseudo, token);
                await MarkJoinedEventsChangedAsync(joinedEventIds, token);
                await _notifications.DeleteByUserIdAsync(userId, token);
                if (!string.IsNullOrWhiteSpace(user.Handle))
                    await _notifications.AnonymizeActorAsync(user.Handle, ServerCopy.DeletedAccount.Pseudo, token);
                await _pushSubscriptions.DeleteByUserIdAsync(userId, token);
                await _follows.DeleteAllForUserAsync(userId, token);
                await _watchlist.DeleteAllForUserAsync(userId, token);
                await WithdrawTheListsOfAsync(userId, token);
                await _movieLists.DeleteAllForOwnerAsync(userId, token);
                await _movieLists.RemoveFromOthersListsAsync(userId, token);
                await _movieLists.ForgetItemAuthorAsync(userId, token);
                await WithdrawTheGroupsOfAsync(userId, token);
                await _groups.DeleteAllForOwnerAsync(userId, token);
                await _groups.RemoveFromOthersGroupsAsync(userId, token);
                await _watchedTitles.DeleteAllForOwnerAsync(userId, token);
                await _savedLists.DeleteAllForOwnerAsync(userId, token);
                await _resetTokens.DeleteByUserIdAsync(userId, token);
                await _verificationTokens.DeleteByUserIdAsync(userId, token);
                await _avatarPhotos.DeleteByUserIdAsync(userId, token);
                await _bannerPhotos.DeleteByUserIdAsync(userId, token);
                await _users.DeleteAsync(userId, token);
            },
            ct);

        await _sessionInvalidator.InvalidateAllForUserAsync(userId, ct);
        await _handover.AnnounceAsync(handovers);

        _logger.LogInformation(
            "DeleteAccount: success for {EmailMasked} (userId={UserId}, anonymizedEvents={Events}, anonymizedParticipations={Participations})",
            EmailMasking.Mask(user.Email), LogText.SingleLine(userId), anonymizedEvents, anonymizedParticipations);
    }

    private async Task WithdrawTheListsOfAsync(string userId, CancellationToken ct)
    {
        var listIds = (await _movieLists.ListByOwnerAsync(userId, ct)).Select(list => list.Id).ToList();
        await _notifications.DeleteByListsAsync(listIds, ct);
        await _savedLists.ForgetListsOfCreatorAsync(userId, ct);
    }

    private async Task WithdrawTheGroupsOfAsync(string userId, CancellationToken ct)
    {
        var groupIds = (await _groups.ListByOwnerAsync(userId, ct)).Select(group => group.Id).ToList();
        await _events.DetachGroupsAsync(groupIds, ct);
        await _notifications.DeleteByGroupsAsync(groupIds, ct);
    }

    private async Task MarkJoinedEventsChangedAsync(IReadOnlyList<string> joinedEventIds, CancellationToken ct)
    {
        foreach (var joined in await _events.ListByIdsAsync(joinedEventIds, ct))
            await _events.MarkChangedAsync(joined.Id, ct);
    }
}
