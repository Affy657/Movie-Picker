using Microsoft.AspNetCore.Authentication.Cookies;
using MoviePicker.Api.Application.Ports;

namespace MoviePicker.Api.Infrastructure.Persistence.InMemory;

public sealed class InMemoryAuthSessionDirectory(ITicketStore ticketStore, TimeProvider clock) : IAuthSessionDirectory
{
    private readonly MemoryAuthTicketStore? _tickets = ticketStore as MemoryAuthTicketStore;
    private readonly TimeProvider _clock = clock;

    public Task<IReadOnlyList<StoredAuthSession>> ListActiveForUserAsync(string userId, CancellationToken ct = default)
    {
        IReadOnlyList<StoredAuthSession> sessions = _tickets is null
            ? []
            : _tickets.ListForUser(userId)
                .Select(entry => new StoredAuthSession(
                    entry.Key,
                    null,
                    entry.Ticket.Properties.IssuedUtc ?? _clock.GetUtcNow(),
                    null))
                .ToList();
        return Task.FromResult(sessions);
    }

    public Task<bool> RevokeForUserAsync(string userId, string sessionKey, CancellationToken ct = default) =>
        Task.FromResult(_tickets?.RemoveForUser(userId, sessionKey) ?? false);
}
