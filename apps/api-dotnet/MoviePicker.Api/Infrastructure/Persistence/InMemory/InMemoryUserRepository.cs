using System.Collections.Concurrent;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Domain.Entities;

namespace MoviePicker.Api.Infrastructure.Persistence.InMemory;

public sealed class InMemoryUserRepository : IUserRepository
{
    private readonly ConcurrentDictionary<string, User> _byId = new();
    private readonly ConcurrentDictionary<string, string> _emailToId = new(StringComparer.OrdinalIgnoreCase);
    private readonly ConcurrentDictionary<string, string> _handleToId = new(StringComparer.OrdinalIgnoreCase);

    public Task<User?> GetByIdAsync(string id, CancellationToken ct = default) =>
        Task.FromResult(_byId.TryGetValue(id, out var u) ? u : null);

    public Task<IReadOnlyList<User>> ListByIdsAsync(IReadOnlyCollection<string> ids, CancellationToken ct = default)
    {
        IReadOnlyList<User> result = ids
            .Select(id => _byId.TryGetValue(id, out var u) ? u : null)
            .OfType<User>()
            .ToList();
        return Task.FromResult(result);
    }

    public Task<User?> GetByEmailAsync(string email, CancellationToken ct = default)
    {
        var n = Normalize(email);
        if (n is null)
            return Task.FromResult<User?>(null);
        return Task.FromResult(_emailToId.TryGetValue(n, out var id) && _byId.TryGetValue(id, out var u) ? u : null);
    }

    public Task<User?> GetByHandleAsync(string handle, CancellationToken ct = default)
    {
        var n = NormalizeHandle(handle);
        if (n is null)
            return Task.FromResult<User?>(null);
        return Task.FromResult(_handleToId.TryGetValue(n, out var id) && _byId.TryGetValue(id, out var u) ? u : null);
    }

    public Task<IReadOnlyList<User>> ListMissingHandleAsync(CancellationToken ct = default)
    {
        IReadOnlyList<User> result = _byId.Values
            .Where(u => string.IsNullOrEmpty(u.Handle))
            .ToList();
        return Task.FromResult(result);
    }

    public Task<IReadOnlyList<PublicProfileRef>> ListPublicProfilesAsync(int limit, CancellationToken ct = default)
    {
        IReadOnlyList<PublicProfileRef> result = _byId.Values
            .Where(u => u.IsProfilePublic && !string.IsNullOrWhiteSpace(u.Handle))
            .OrderByDescending(u => u.UpdatedAt)
            .Take(limit > 0 ? limit : int.MaxValue)
            .Select(u => new PublicProfileRef(u.Handle, u.UpdatedAt))
            .ToList();
        return Task.FromResult(result);
    }

    public Task<User> AddAsync(User user, CancellationToken ct = default)
    {
        var id = string.IsNullOrEmpty(user.Id) ? Guid.NewGuid().ToString("N")[..24] : user.Id;
        var email = Normalize(user.Email) ?? user.Email.Trim();
        var handle = NormalizeHandle(user.Handle);
        var created = new User
        {
            Id = id,
            Email = email,
            PasswordHash = user.PasswordHash,
            DisplayName = user.DisplayName,
            Handle = handle ?? string.Empty,
            Bio = user.Bio,
            IsProfilePublic = user.IsProfilePublic,
            UiTheme = user.UiTheme,
            AccentColor = user.AccentColor,
            RatingScale = user.RatingScale,
            NotificationPreferences = user.NotificationPreferences,
            CreatedAt = user.CreatedAt,
            UpdatedAt = user.UpdatedAt
        };
        _byId[id] = created;
        _emailToId[email] = id;
        if (handle is not null)
            _handleToId[handle] = id;
        return Task.FromResult(created);
    }

    public Task<User> UpdateAsync(User user, CancellationToken ct = default)
    {
        if (_byId.TryGetValue(user.Id, out var previous))
        {
            var prevEmail = Normalize(previous.Email) ?? previous.Email.Trim();
            _emailToId.TryRemove(prevEmail, out _);
            var prevHandle = NormalizeHandle(previous.Handle);
            if (prevHandle is not null)
                _handleToId.TryRemove(prevHandle, out _);
        }

        var email = Normalize(user.Email) ?? user.Email.Trim();
        var handle = NormalizeHandle(user.Handle);
        var updated = new User
        {
            Id = user.Id,
            Email = email,
            PasswordHash = user.PasswordHash,
            DisplayName = user.DisplayName,
            Handle = handle ?? string.Empty,
            Bio = user.Bio,
            IsProfilePublic = user.IsProfilePublic,
            UiTheme = user.UiTheme,
            AccentColor = user.AccentColor,
            RatingScale = user.RatingScale,
            NotificationPreferences = user.NotificationPreferences,
            CreatedAt = user.CreatedAt,
            UpdatedAt = user.UpdatedAt
        };
        _byId[user.Id] = updated;
        _emailToId[email] = user.Id;
        if (handle is not null)
            _handleToId[handle] = user.Id;
        return Task.FromResult(updated);
    }

    public Task<bool> DeleteAsync(string id, CancellationToken ct = default)
    {
        if (!_byId.TryRemove(id, out var removed))
            return Task.FromResult(false);

        var email = Normalize(removed.Email) ?? removed.Email.Trim();
        _emailToId.TryRemove(email, out _);
        var handle = NormalizeHandle(removed.Handle);
        if (handle is not null)
            _handleToId.TryRemove(handle, out _);
        return Task.FromResult(true);
    }

    private static string? Normalize(string? email)
    {
        if (string.IsNullOrWhiteSpace(email))
            return null;
        return email.Trim().ToLowerInvariant();
    }

    private static string? NormalizeHandle(string? handle)
    {
        if (string.IsNullOrWhiteSpace(handle))
            return null;
        return handle.Trim().ToLowerInvariant();
    }
}
