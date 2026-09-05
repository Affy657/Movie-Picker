using Microsoft.Extensions.Logging;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.Profile;

namespace MoviePicker.Api.Infrastructure.Migrations;

public sealed class AssignMissingUserHandlesMigration : IDataMigration
{
    private readonly IUserRepository _users;
    private readonly ILogger<AssignMissingUserHandlesMigration> _logger;

    public AssignMissingUserHandlesMigration(
        IUserRepository users,
        ILogger<AssignMissingUserHandlesMigration> logger)
    {
        _users = users;
        _logger = logger;
    }

    public string Id => "2026-09-05-001-assign-missing-user-handles";

    public async Task<long> ExecuteAsync(CancellationToken ct = default)
    {
        var missing = await _users.ListMissingHandleAsync(ct);
        var assigned = 0L;

        foreach (var user in missing)
        {
            ct.ThrowIfCancellationRequested();
            try
            {
                var handle = await HandleAllocator.AllocateFromDisplayNameAsync(_users, user.DisplayName, ct);
                await _users.UpdateAsync(user with { Handle = handle }, ct);
                assigned++;
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                _logger.LogWarning(ex, "Handle non attribué pour l'utilisateur {UserId}", user.Id);
            }
        }

        return assigned;
    }
}
