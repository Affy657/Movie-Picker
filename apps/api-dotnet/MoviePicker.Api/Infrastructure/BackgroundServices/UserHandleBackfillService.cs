using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.Profile;

namespace MoviePicker.Api.Infrastructure.BackgroundServices;

public sealed class UserHandleBackfillService : BackgroundService
{
    private static readonly TimeSpan StartupDelay = TimeSpan.FromSeconds(5);

    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<UserHandleBackfillService> _logger;

    public UserHandleBackfillService(IServiceScopeFactory scopeFactory, ILogger<UserHandleBackfillService> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        try
        {
            await Task.Delay(StartupDelay, stoppingToken);
        }
        catch (OperationCanceledException)
        {
            return;
        }

        try
        {
            using var scope = _scopeFactory.CreateScope();
            var users = scope.ServiceProvider.GetRequiredService<IUserRepository>();

            var missing = await users.ListMissingHandleAsync(stoppingToken);
            if (missing.Count == 0)
                return;

            var assigned = 0;
            foreach (var user in missing)
            {
                if (stoppingToken.IsCancellationRequested)
                    break;
                try
                {
                    var handle = await HandleAllocator.AllocateFromDisplayNameAsync(users, user.DisplayName, stoppingToken);
                    await users.UpdateAsync(user with { Handle = handle }, stoppingToken);
                    assigned++;
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Échec backfill handle pour l'utilisateur {UserId}", user.Id);
                }
            }

            _logger.LogInformation("Backfill handles terminé : {Assigned}/{Total} comptes mis à jour", assigned, missing.Count);
        }
        catch (OperationCanceledException)
        {
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Échec du backfill des handles utilisateur");
        }
    }
}
