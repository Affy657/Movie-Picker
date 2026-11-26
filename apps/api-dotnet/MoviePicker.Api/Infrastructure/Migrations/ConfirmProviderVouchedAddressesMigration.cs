using MoviePicker.Api.Application.Ports;

namespace MoviePicker.Api.Infrastructure.Migrations;

public sealed class ConfirmProviderVouchedAddressesMigration : IDataMigration
{
    private readonly IUserRepository _users;

    public ConfirmProviderVouchedAddressesMigration(IUserRepository users)
    {
        _users = users;
    }

    public string Id => "2026-11-26-001-confirm-provider-vouched-addresses";

    public async Task<long> ExecuteAsync(CancellationToken ct = default)
    {
        var confirmed = 0L;
        foreach (var user in await _users.ListUnconfirmedPasswordlessAsync(ct))
        {
            ct.ThrowIfCancellationRequested();
            var vouching = user.Identities
                .Where(identity => string.Equals(identity.Email.Trim(), user.Email.Trim(), StringComparison.OrdinalIgnoreCase))
                .OrderBy(identity => identity.LinkedAt)
                .FirstOrDefault();
            if (vouching is not null && await _users.MarkEmailVerifiedAsync(user.Id, vouching.LinkedAt, ct))
                confirmed++;
        }

        return confirmed;
    }
}
