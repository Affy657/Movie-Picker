using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Domain.Entities;

namespace MoviePicker.Api.Application.UseCases.Shared;

public static class PushFanOut
{
    private const int MaxParallelSends = 8;

    public static Task SendToAllAsync(
        IPushNotificationSender sender,
        IEnumerable<PushSubscription> subscriptions,
        PushMessage message,
        CancellationToken ct = default) =>
        Parallel.ForEachAsync(
            subscriptions,
            new ParallelOptions { MaxDegreeOfParallelism = MaxParallelSends, CancellationToken = ct },
            async (subscription, token) => await sender.SendAsync(subscription, message, token));
}
