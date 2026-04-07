using System.Collections.Concurrent;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Domain.Entities;

namespace MoviePicker.Api.Infrastructure.Persistence.InMemory;

public sealed class InMemoryUserRepository : IUserRepository
{
    private readonly ConcurrentDictionary<string, User> _byId = new();
    private readonly ConcurrentDictionary<string, string> _emailToId = new(StringComparer.OrdinalIgnoreCase);

    public Task<User?> GetByIdAsync(string id, CancellationToken ct = default) =>
        Task.FromResult(_byId.TryGetValue(id, out var u) ? u : null);

    public Task<User?> GetByEmailAsync(string email, CancellationToken ct = default)
    {
        var n = Normalize(email);
        if (n is null)
            return Task.FromResult<User?>(null);
        return Task.FromResult(_emailToId.TryGetValue(n, out var id) && _byId.TryGetValue(id, out var u) ? u : null);
    }

    public Task<User> AddAsync(User user, CancellationToken ct = default)
    {
        var id = string.IsNullOrEmpty(user.Id) ? Guid.NewGuid().ToString("N")[..24] : user.Id;
        var email = Normalize(user.Email) ?? user.Email.Trim();
        var created = new User
        {
            Id = id,
            Email = email,
            PasswordHash = user.PasswordHash,
            DisplayName = user.DisplayName,
            UiTheme = user.UiTheme,
            CreatedAt = user.CreatedAt,
            UpdatedAt = user.UpdatedAt
        };
        _byId[id] = created;
        _emailToId[email] = id;
        return Task.FromResult(created);
    }

    public Task<User> UpdateAsync(User user, CancellationToken ct = default)
    {
        if (_byId.TryGetValue(user.Id, out var previous))
        {
            var prevEmail = Normalize(previous.Email) ?? previous.Email.Trim();
            _emailToId.TryRemove(prevEmail, out _);
        }

        var email = Normalize(user.Email) ?? user.Email.Trim();
        var updated = new User
        {
            Id = user.Id,
            Email = email,
            PasswordHash = user.PasswordHash,
            DisplayName = user.DisplayName,
            UiTheme = user.UiTheme,
            CreatedAt = user.CreatedAt,
            UpdatedAt = user.UpdatedAt
        };
        _byId[user.Id] = updated;
        _emailToId[email] = user.Id;
        return Task.FromResult(updated);
    }

    private static string? Normalize(string? email)
    {
        if (string.IsNullOrWhiteSpace(email))
            return null;
        return email.Trim().ToLowerInvariant();
    }
}
