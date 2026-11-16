using MoviePicker.Api.Domain.Entities;

namespace MoviePicker.Api.Application.Ports;

public interface ISavedListRepository
{
    Task<IReadOnlyList<SavedList>> ListByOwnerAsync(string ownerId, CancellationToken ct = default);

    Task<SavedList?> GetAsync(string ownerId, string savedListId, CancellationToken ct = default);

    Task<SavedList?> FindBySourceAsync(string ownerId, ListSource source, CancellationToken ct = default);

    Task<long> CountByOwnerAsync(string ownerId, CancellationToken ct = default);

    Task<SavedList> AddIfAbsentAsync(SavedList list, CancellationToken ct = default);

    Task<bool> RefreshSnapshotAsync(
        string ownerId,
        string savedListId,
        string? sourceOwnerId,
        string name,
        IReadOnlyList<SavedListTitle> snapshot,
        CancellationToken ct = default);

    Task<long> ForgetListsOfCreatorAsync(string creatorId, CancellationToken ct = default);

    Task<bool> DeleteAsync(string ownerId, string savedListId, CancellationToken ct = default);

    Task<long> DeleteAllForOwnerAsync(string ownerId, CancellationToken ct = default);
}
