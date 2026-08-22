namespace MoviePicker.Api.Domain.Entities;

public static class NotificationPreferenceDefaults
{
    private static readonly IReadOnlyDictionary<UserNotificationType, bool> Values =
        new Dictionary<UserNotificationType, bool>
        {
            [UserNotificationType.NewFollower] = true,
            [UserNotificationType.MovieAdded] = false,
            [UserNotificationType.MoviePicked] = true,
            [UserNotificationType.ParticipantJoined] = true,
            [UserNotificationType.EventDeleted] = true,
            [UserNotificationType.EventReminder1h] = true,
            [UserNotificationType.EventReminder24h] = true,
            [UserNotificationType.EventInvitation] = true,
            [UserNotificationType.EventPending] = true,
            [UserNotificationType.MoviePickedManually] = true,
            [UserNotificationType.LetterboxdReconciliationPending] = true,
        };

    public static bool For(UserNotificationType type) =>
        Values.TryGetValue(type, out var value) ? value : true;

    public static IReadOnlyDictionary<UserNotificationType, bool> All() =>
        Enum.GetValues<UserNotificationType>().ToDictionary(t => t, For);
}

public static class UserNotificationPreferenceExtensions
{
    public static bool NotifiesOn(this User user, UserNotificationType type) =>
        user.NotificationPreferences.TryGetValue(type, out var enabled)
            ? enabled
            : NotificationPreferenceDefaults.For(type);
}
