using MoviePicker.Api.Domain.Entities;

namespace MoviePicker.Api.Application.Ports;

public interface IPhotoBlobRepository
{
    Task SaveAsync(StoredPhoto photo, CancellationToken ct = default);
    Task<StoredPhoto?> GetByKeyAsync(string key, CancellationToken ct = default);
    Task<long> EstimatedCountAsync(CancellationToken ct = default);
    Task DeleteAsync(string key, CancellationToken ct = default);
    Task<long> DeleteByUserIdAsync(string userId, CancellationToken ct = default);
}
