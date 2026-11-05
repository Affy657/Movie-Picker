using MoviePicker.Api.Domain.Entities;

namespace MoviePicker.Api.Application.Ports;

public interface IAvatarPhotoRepository
{
    Task SaveAsync(StoredAvatarPhoto photo, CancellationToken ct = default);
    Task<StoredAvatarPhoto?> GetByKeyAsync(string key, CancellationToken ct = default);
    Task DeleteAsync(string key, CancellationToken ct = default);
    Task<long> DeleteByUserIdAsync(string userId, CancellationToken ct = default);
}
