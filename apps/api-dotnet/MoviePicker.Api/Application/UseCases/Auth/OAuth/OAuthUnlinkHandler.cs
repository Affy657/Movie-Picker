using Microsoft.Extensions.Logging;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Domain.Exceptions;

namespace MoviePicker.Api.Application.UseCases.Auth.OAuth;

public sealed class OAuthUnlinkHandler : IOAuthUnlinkHandler
{
    private readonly IUserRepository _users;
    private readonly TimeProvider _clock;
    private readonly ILogger<OAuthUnlinkHandler> _logger;

    public OAuthUnlinkHandler(IUserRepository users, TimeProvider clock, ILogger<OAuthUnlinkHandler> logger)
    {
        _users = users;
        _clock = clock;
        _logger = logger;
    }

    public async Task HandleAsync(string userId, string provider, CancellationToken ct = default)
    {
        var user = await _users.GetByIdAsync(userId, ct) ?? throw new NotFoundException("Utilisateur introuvable.");

        if (!user.Identities.Any(i => i.Provider == provider))
            throw new NotFoundException("Ce compte n'est pas lié à ce fournisseur.");

        var remainingIdentities = user.Identities.Count(i => i.Provider != provider);
        var hasPassword = !string.IsNullOrEmpty(user.PasswordHash);
        if (!hasPassword && remainingIdentities == 0)
            throw new BadRequestException("Impossible de retirer la dernière méthode de connexion du compte.");

        var updated = user with
        {
            Identities = user.Identities.Where(i => i.Provider != provider).ToList(),
            UpdatedAt = _clock.GetUtcNow()
        };
        await _users.UpdateAsync(updated, ct);

        _logger.LogInformation("OAuth unlink: removed {Provider} (userId={UserId})", provider, userId);
    }
}
