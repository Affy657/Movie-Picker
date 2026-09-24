using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.Extensions.Logging;
using MoviePicker.Api.Application.Ports;

namespace MoviePicker.Api.Infrastructure.Persistence.InMemory;

public sealed class InMemoryAuthSessionInvalidator(
    ITicketStore ticketStore,
    ILogger<InMemoryAuthSessionInvalidator> logger) : IAuthSessionInvalidator
{
    private readonly ITicketStore _ticketStore = ticketStore;
    private readonly ILogger<InMemoryAuthSessionInvalidator> _logger = logger;

    public Task<long> InvalidateAllForUserAsync(string userId, CancellationToken ct = default) =>
        InvalidateOthersForUserAsync(userId, null, ct);

    public Task<long> InvalidateOthersForUserAsync(string userId, string? keptSessionId, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(userId))
            return Task.FromResult(0L);

        if (_ticketStore is not MemoryAuthTicketStore memoryTickets)
        {
            _logger.LogWarning(
                "In-memory sessions: ticket store {TicketStore} cannot be searched by user, nothing invalidated for user {UserId}",
                _ticketStore.GetType().Name,
                userId);
            return Task.FromResult(0L);
        }

        return Task.FromResult(memoryTickets.RemoveAllForUser(userId, keptSessionId));
    }
}
