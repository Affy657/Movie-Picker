using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Domain.Exceptions;

namespace MoviePicker.Api.Application.UseCases.GetEligibleFollowsForEvent;

public sealed class GetEligibleFollowsForEventHandler : IGetEligibleFollowsForEventHandler
{
    private readonly IEventRepository _events;
    private readonly IParticipantRepository _participants;
    private readonly IFollowRepository _follows;
    private readonly IUserRepository _users;
    private readonly IUserNotificationRepository _notifications;
    private readonly ICurrentUserAccessor _currentUserAccessor;

    public GetEligibleFollowsForEventHandler(
        IEventRepository events,
        IParticipantRepository participants,
        IFollowRepository follows,
        IUserRepository users,
        IUserNotificationRepository notifications,
        ICurrentUserAccessor currentUserAccessor)
    {
        _events = events;
        _participants = participants;
        _follows = follows;
        _users = users;
        _notifications = notifications;
        _currentUserAccessor = currentUserAccessor;
    }

    public async Task<EligibleFollowsResponse> HandleAsync(string idOrSlug, CancellationToken ct = default)
    {
        var currentUserId = _currentUserAccessor.GetUserId();
        if (string.IsNullOrEmpty(currentUserId))
            throw new UnauthorizedException("Un compte est requis.");

        var evt = await _events.GetRequiredByIdOrSlugAsync(idOrSlug, ct);

        if (evt.CreatorUserId != currentUserId)
            throw new ForbiddenException("Seul l'hôte peut consulter cette liste.");

        var followingIds = await _follows.GetFollowingIdsAsync(currentUserId, ct: ct);
        if (followingIds.Count == 0)
            return new EligibleFollowsResponse { Follows = [] };

        var usersTask = _users.ListByIdsAsync(followingIds, ct);
        var participantsTask = _participants.ListByEventIdAsync(evt.Id, ct);
        var invitedTask = _notifications.ListUserIdsByTypeAndEventAsync(UserNotificationType.EventInvitation, evt.Id, ct);

        await Task.WhenAll(usersTask, participantsTask, invitedTask);

        var followUsers = await usersTask;
        var eventParticipants = await participantsTask;
        var invitedUserIds = await invitedTask;

        var participantUserIds = eventParticipants
            .Where(p => !string.IsNullOrEmpty(p.UserId))
            .Select(p => p.UserId!)
            .ToHashSet();

        var items = new List<EligibleFollowItem>(followingIds.Count);
        foreach (var userId in followingIds)
        {
            var user = followUsers.FirstOrDefault(u => u.Id == userId);
            if (user is null)
                continue;

            var isParticipant = participantUserIds.Contains(userId);
            var isInvited = invitedUserIds.Contains(userId);

            items.Add(new EligibleFollowItem
            {
                UserId = userId,
                Handle = user.Handle,
                DisplayName = user.DisplayName,
                AvatarId = user.AvatarId,
                IsAlreadyParticipant = isParticipant,
                IsAlreadyInvited = isInvited
            });
        }

        return new EligibleFollowsResponse { Follows = items };
    }
}
