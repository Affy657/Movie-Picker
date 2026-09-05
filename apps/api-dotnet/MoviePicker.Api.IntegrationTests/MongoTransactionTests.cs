using Microsoft.Extensions.DependencyInjection;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Domain.Entities;
using Xunit;

namespace MoviePicker.Api.IntegrationTests;

public sealed class MongoFactAttribute : FactAttribute
{
    public MongoFactAttribute()
    {
        if (string.IsNullOrWhiteSpace(Environment.GetEnvironmentVariable("MONGODB_TEST_URI")))
            Skip = "MONGODB_TEST_URI non défini : test réservé à une vraie base MongoDB en replica set.";
    }
}

public sealed class MongoTransactionTests : IClassFixture<MoviePickerApplicationFactory>
{
    private readonly MoviePickerApplicationFactory _factory;

    public MongoTransactionTests(MoviePickerApplicationFactory factory)
    {
        _factory = factory;
        _ = _factory.CreateClient();
    }

    private static Event NewEvent(string title) => new()
    {
        Id = string.Empty,
        Title = title,
        Date = "2026-12-24",
        Time = "20:30",
        HostToken = Guid.NewGuid().ToString("N"),
        Slug = "tx-" + Guid.NewGuid().ToString("N")[..8],
        CreatedAt = DateTimeOffset.UtcNow,
        UpdatedAt = DateTimeOffset.UtcNow
    };

    [MongoFact]
    public async Task FailedUnitOfWork_RollsBackEveryWrite()
    {
        using var scope = _factory.Services.CreateScope();
        var unitOfWork = scope.ServiceProvider.GetRequiredService<IUnitOfWork>();
        var events = scope.ServiceProvider.GetRequiredService<IEventRepository>();
        var participants = scope.ServiceProvider.GetRequiredService<IParticipantRepository>();

        var evt = NewEvent("Soirée annulée par erreur");
        string? createdEventId = null;

        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            unitOfWork.ExecuteAsync(async token =>
            {
                var created = await events.AddAsync(evt, token);
                createdEventId = created.Id;
                await participants.AddAsync(
                    new Participant
                    {
                        Id = string.Empty,
                        EventId = created.Id,
                        Pseudo = "Alice",
                        CreatedAt = DateTimeOffset.UtcNow,
                        UpdatedAt = DateTimeOffset.UtcNow
                    },
                    token);
                throw new InvalidOperationException("échec au milieu de la transaction");
            }));

        Assert.NotNull(createdEventId);
        Assert.Null(await events.GetByIdOrSlugAsync(evt.Slug));
        Assert.Empty(await participants.ListByEventIdAsync(createdEventId!));
    }

    [MongoFact]
    public async Task CommittedUnitOfWork_PersistsEveryWrite()
    {
        using var scope = _factory.Services.CreateScope();
        var unitOfWork = scope.ServiceProvider.GetRequiredService<IUnitOfWork>();
        var events = scope.ServiceProvider.GetRequiredService<IEventRepository>();
        var participants = scope.ServiceProvider.GetRequiredService<IParticipantRepository>();

        var evt = NewEvent("Soirée bien créée");
        string createdEventId = string.Empty;

        await unitOfWork.ExecuteAsync(async token =>
        {
            var created = await events.AddAsync(evt, token);
            createdEventId = created.Id;
            await participants.AddAsync(
                new Participant
                {
                    Id = string.Empty,
                    EventId = created.Id,
                    Pseudo = "Alice",
                    CreatedAt = DateTimeOffset.UtcNow,
                    UpdatedAt = DateTimeOffset.UtcNow
                },
                token);
        });

        Assert.NotNull(await events.GetByIdOrSlugAsync(evt.Slug));
        Assert.Single(await participants.ListByEventIdAsync(createdEventId));
    }
}
