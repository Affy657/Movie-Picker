using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Domain.Exceptions;

namespace MoviePicker.Api.Application.UseCases.InviteUser;

public sealed class InviteUserHandler : IInviteUserHandler
{
    private readonly IEventRepository _events;
    private readonly IParticipantRepository _participants;
    private readonly IFollowRepository _follows;
    private readonly IUserRepository _users;
    private readonly IUserNotificationRepository _notifications;
    private readonly ICurrentUserAccessor _currentUserAccessor;
    private readonly TimeProvider _clock;

    public InviteUserHandler(
        IEventRepository events,
        IParticipantRepository participants,
        IFollowRepository follows,
        IUserRepository users,
        IUserNotificationRepository notifications,
        ICurrentUserAccessor currentUserAccessor,
        TimeProvider clock)
    {
        _events = events;
        _participants = participants;
        _follows = follows;
        _users = users;
        _notifications = notifications;
        _currentUserAccessor = currentUserAccessor;
        _clock = clock;
    }

    public async Task<InviteUserResponse> HandleAsync(string idOrSlug, InviteUserRequest request, CancellationToken ct = default)
    {
        var currentUserId = _currentUserAccessor.GetUserId();
        if (string.IsNullOrEmpty(currentUserId))
            throw new UnauthorizedException("Un compte est requis pour inviter un utilisateur.");

        var evt = await _events.GetRequiredByIdOrSlugAsync(idOrSlug, ct);

        if (evt.IsFinished(DateTimeOffset.UtcNow))
            throw new ConflictException("Impossible d'inviter : la soirée est terminée.");

        if (evt.CreatorUserId != currentUserId)
            throw new ForbiddenException("Seul l'hôte peut envoyer des invitations.");

        var targetUserId = request.TargetUserId;

        var isFollow = await _follows.IsFollowingAsync(currentUserId, targetUserId, ct);
        if (!isFollow)
            throw new BadRequestException("Vous ne pouvez inviter que des utilisateurs que vous suivez.");

        var alreadyParticipant = await _participants.FindByEventAndUserIdAsync(evt.Id, targetUserId, ct);
        if (alreadyParticipant is not null)
            throw new ConflictException("Cet utilisateur participe déjà à la soirée.");

        var alreadyInvited = await _notifications.ExistsAsync(targetUserId, UserNotificationType.EventInvitation, evt.Id, ct);
        if (alreadyInvited)
            throw new ConflictException("Une invitation a déjà été envoyée à cet utilisateur pour cette soirée.");

        var actor = await _users.GetByIdAsync(currentUserId, ct);

        await _notifications.AddAsync(new UserNotification
        {
            UserId = targetUserId,
            Type = UserNotificationType.EventInvitation,
            ActorHandle = actor?.Handle,
            ActorDisplayName = actor?.DisplayName,
            ActorAvatarId = actor?.AvatarId,
            EventId = evt.Id,
            EventSlug = evt.Slug,
            EventTitle = evt.Title,
            IsRead = false,
            CreatedAt = _clock.GetUtcNow()
        }, ct);

        return new InviteUserResponse { Message = "Invitation envoyée." };
    }
}
