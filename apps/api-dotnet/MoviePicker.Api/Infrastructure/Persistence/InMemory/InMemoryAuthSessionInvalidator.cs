using Microsoft.Extensions.Logging;
using MoviePicker.Api.Application.Ports;

namespace MoviePicker.Api.Infrastructure.Persistence.InMemory;

public sealed class InMemoryAuthSessionInvalidator(
    ILogger<InMemoryAuthSessionInvalidator> logger) : IAuthSessionInvalidator
{
    private readonly ILogger<InMemoryAuthSessionInvalidator> _logger = logger;

    public Task<long> InvalidateAllForUserAsync(string userId, CancellationToken ct = default)
    {
        _logger.LogInformation(
            "Sessions in-memory: rien à invalider pour l'utilisateur {UserId}",
            userId);
        return Task.FromResult(0L);
    }
}
