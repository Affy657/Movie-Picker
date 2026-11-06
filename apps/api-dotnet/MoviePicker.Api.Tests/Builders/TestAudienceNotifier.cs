using Microsoft.Extensions.Logging.Abstractions;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.Shared;

namespace MoviePicker.Api.Tests.Builders;

public static class TestAudienceNotifier
{
    public static EventAudienceNotifier Over(
        IParticipantRepository participants,
        IUserRepository users,
        IPushSubscriptionRepository subscriptions,
        IPushNotificationSender sender,
        IUserNotificationRepository notifications) =>
        new(participants, users, subscriptions, sender, notifications, NullLogger<EventAudienceNotifier>.Instance, TimeProvider.System);
}
