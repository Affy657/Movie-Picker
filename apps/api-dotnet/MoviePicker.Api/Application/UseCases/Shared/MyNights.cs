using MoviePicker.Api.Application.Ports;

namespace MoviePicker.Api.Application.UseCases.Shared;

public static class MyNights
{
    public static async Task<HashSet<string>> ListIdsAsync(
        IEventRepository events,
        IParticipantRepository participants,
        string userId,
        CancellationToken ct)
    {
        var createdIdsTask = events.ListIdsByCreatorUserIdAsync(userId, ct);
        var joinedIdsTask = participants.ListDistinctEventIdsByUserIdAsync(userId, ct);
        await Task.WhenAll(createdIdsTask, joinedIdsTask);

        var ids = (await createdIdsTask).ToHashSet(StringComparer.Ordinal);
        ids.UnionWith(await joinedIdsTask);
        ids.RemoveWhere(string.IsNullOrWhiteSpace);
        return ids;
    }
}
