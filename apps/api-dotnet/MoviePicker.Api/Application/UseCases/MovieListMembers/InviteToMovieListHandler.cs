using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.MovieLists;
using MoviePicker.Api.Application.UseCases.Notifications;
using MoviePicker.Api.Application.UseCases.Shared;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Domain.Exceptions;

namespace MoviePicker.Api.Application.UseCases.MovieListMembers;

public sealed class InviteToMovieListHandler : IInviteToMovieListHandler
{
    public const string PairQuotaScope = "list-invite-pair";
    public const int MaxInvitationsPerPairPerDay = 5;

    private static readonly TimeSpan PairQuotaWindow = TimeSpan.FromHours(24);

    private readonly IMovieListRepository _lists;
    private readonly IFollowRepository _follows;
    private readonly IUserRepository _users;
    private readonly IUserNotificationRepository _notifications;
    private readonly IPushSubscriptionRepository _pushSubscriptions;
    private readonly IPushNotificationSender _pushSender;
    private readonly ISharedQuota _quota;
    private readonly TimeProvider _clock;

    public InviteToMovieListHandler(
        IMovieListRepository lists,
        IFollowRepository follows,
        IUserRepository users,
        IUserNotificationRepository notifications,
        IPushSubscriptionRepository pushSubscriptions,
        IPushNotificationSender pushSender,
        ISharedQuota quota,
        TimeProvider clock)
    {
        _lists = lists;
        _follows = follows;
        _users = users;
        _notifications = notifications;
        _pushSubscriptions = pushSubscriptions;
        _pushSender = pushSender;
        _quota = quota;
        _clock = clock;
    }

    public async Task<MovieListPendingInvitationResponse> HandleAsync(
        string userId,
        string listId,
        InviteToMovieListRequest request,
        CancellationToken ct = default)
    {
        var list = await MovieListPolicy.RequireOwnerAsync(_lists, userId, listId, ct);
        var targetId = request.UserId.Trim();
        var now = _clock.StorageNow();
        EnsureInvitable(list, targetId, now);
        if (!await _follows.IsFollowingAsync(userId, targetId, ct))
            throw Errors.InviteOnlyFollowed();
        if (list.IsFull(now))
            throw Errors.MovieListMembersLimitReached(MovieList.MaxMembers);
        if (!await _quota.TryConsumeAsync(
                PairQuotaScope, $"{userId}|{targetId}", MaxInvitationsPerPairPerDay, PairQuotaWindow, ct))
            throw Errors.InvitationLimitReached();

        var target = await _users.GetByIdAsync(targetId, ct);
        var owner = await _users.GetByIdAsync(userId, ct);
        var invitation = new MovieListInvitation(targetId, now);
        if (!await _lists.AddInvitationAsync(list.Id, invitation, MovieList.MaxMembers, ct))
            throw await WhyRefusedAsync(list.Id, targetId, now, ct);

        await NotifyAsync(list, owner, target, targetId, ct);

        return MovieListPendingInvitationResponse.From(
            target is null ? DisplayedPerson.Unknown(targetId) : DisplayedPerson.From(target),
            invitation.InvitedAt);
    }

    private static void EnsureInvitable(MovieList list, string targetId, DateTimeOffset now)
    {
        if (list.RoleOf(targetId) is not null)
            throw Errors.MovieListAlreadyMember();
        if (list.IsInvited(targetId, now))
            throw Errors.MovieListInvitationAlreadySent();
    }

    private async Task<Exception> WhyRefusedAsync(string listId, string targetId, DateTimeOffset now, CancellationToken ct)
    {
        var current = await _lists.FindAsync(listId, ct);
        if (current is null)
            return Errors.MovieListNotFound();
        if (current.RoleOf(targetId) is not null)
            return Errors.MovieListAlreadyMember();
        if (current.IsInvited(targetId, now))
            return Errors.MovieListInvitationAlreadySent();
        return current.IsFull(now) ? Errors.MovieListMembersLimitReached(MovieList.MaxMembers) : Errors.ConcurrentUpdate();
    }

    private async Task NotifyAsync(MovieList list, User? owner, User? target, string targetId, CancellationToken ct)
    {
        var withheld = target is not null && !target.NotifiesOn(UserNotificationType.ListInvitation);
        try
        {
            await _notifications.DeleteByListAsync(list.Id, targetId, ct);
            await _notifications.AddAsync(new UserNotification
            {
                UserId = targetId,
                Type = UserNotificationType.ListInvitation,
                ListId = list.Id,
                ListName = list.Name,
                IsRead = false,
                IsWithheld = withheld,
                CreatedAt = _clock.GetUtcNow()
            }.WithActor(owner), ct);
        }
        catch (Exception)
        {
            await _lists.RemoveInvitationAsync(list.Id, targetId, CancellationToken.None);
            throw;
        }

        if (target is null || withheld)
            return;

        var subscriptions = await _pushSubscriptions.ListByUserIdAsync(targetId, ct);
        var message = ServerCopy.Push.ListInvitation(owner?.DisplayName, list.Name).ToMessage(
            tag: $"list-invite-{list.Id}",
            url: FrontRoutes.Notifications);
        await PushFanOut.SendToAllAsync(_pushSender, subscriptions, message, ct);
    }
}
