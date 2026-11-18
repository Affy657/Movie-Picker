using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Domain.Entities;

namespace MoviePicker.Api.Application.UseCases.Notifications;

public static class NotificationActor
{
    public static UserNotification WithActor(this UserNotification notification, User? actor)
    {
        var person = actor is null ? null : DisplayedPerson.From(actor);
        return notification with
        {
            ActorHandle = person?.Handle,
            ActorDisplayName = person?.DisplayName,
            ActorAvatarId = person?.AvatarId
        };
    }
}
