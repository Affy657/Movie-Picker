using MoviePicker.Api.Domain.Entities;

namespace MoviePicker.Api.Application.Ports;

public interface IPushSubscriptionRepository
{
    Task UpsertAsync(PushSubscription subscription, CancellationToken ct = default);
    Task DeleteByEndpointAsync(string userId, string endpoint, CancellationToken ct = default);
    Task<IReadOnlyList<PushSubscription>> ListByUserIdAsync(string userId, CancellationToken ct = default);
    Task<IReadOnlyList<PushSubscription>> ListByUserIdsAsync(IReadOnlyCollection<string> userIds, CancellationToken ct = default);
}
