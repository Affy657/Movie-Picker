using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.Auth;
using MoviePicker.Api.Domain.Entities;
using Xunit;

namespace MoviePicker.Api.IntegrationTests;

public sealed class DeleteAccountRollbackTests : IClassFixture<MoviePickerApplicationFactory>
{
    private sealed class ThrowingResetTokenRepository : IPasswordResetTokenRepository
    {
        public Task<PasswordResetToken> AddAsync(PasswordResetToken token, CancellationToken ct = default) =>
            throw new NotSupportedException();

        public Task<PasswordResetToken?> GetByTokenHashAsync(string tokenHash, CancellationToken ct = default) =>
            throw new NotSupportedException();

        public Task MarkConsumedAsync(string tokenId, DateTimeOffset consumedAt, CancellationToken ct = default) =>
            throw new NotSupportedException();

        public Task InvalidateActiveForUserAsync(string userId, DateTimeOffset consumedAt, CancellationToken ct = default) =>
            throw new NotSupportedException();

        public Task<PasswordResetToken?> GetMostRecentForUserAsync(string userId, CancellationToken ct = default) =>
            throw new NotSupportedException();

        public Task<long> DeleteByUserIdAsync(string userId, CancellationToken ct = default) =>
            throw new InvalidOperationException("purge des jetons de réinitialisation en échec");
    }

    private readonly MoviePickerApplicationFactory _factory;

    public DeleteAccountRollbackTests(MoviePickerApplicationFactory factory)
    {
        _factory = factory;
        _ = _factory.CreateClient();
    }

    private sealed record Fixture(
        string UserId,
        string FollowedUserId,
        string EventId,
        string EventSlug,
        string ParticipantId);

    private static async Task<Fixture> SeedAsync(IServiceProvider services)
    {
        var users = services.GetRequiredService<IUserRepository>();
        var events = services.GetRequiredService<IEventRepository>();
        var participants = services.GetRequiredService<IParticipantRepository>();
        var notifications = services.GetRequiredService<IUserNotificationRepository>();
        var pushSubscriptions = services.GetRequiredService<IPushSubscriptionRepository>();
        var follows = services.GetRequiredService<IFollowRepository>();
        var watchlist = services.GetRequiredService<IWatchlistRepository>();
        var hasher = services.GetRequiredService<IPasswordHasher>();

        var suffix = Guid.NewGuid().ToString("N")[..8];
        var now = DateTimeOffset.UtcNow;

        var user = await users.AddAsync(new User
        {
            Id = string.Empty,
            Email = $"rollback-{suffix}@example.test",
            PasswordHash = hasher.Hash("MotDePasse1!"),
            DisplayName = "Rollback",
            Handle = "rollback" + suffix,
            CreatedAt = now,
            UpdatedAt = now
        });

        var followed = await users.AddAsync(new User
        {
            Id = string.Empty,
            Email = $"suivi-{suffix}@example.test",
            DisplayName = "Suivi",
            Handle = "suivi" + suffix,
            CreatedAt = now,
            UpdatedAt = now
        });

        var evt = await events.AddAsync(new Event
        {
            Id = string.Empty,
            Title = "Soirée à conserver",
            Date = "2030-01-01",
            Time = "20:30",
            HostToken = Guid.NewGuid().ToString("N"),
            Slug = "rollback-" + suffix,
            CreatorUserId = user.Id,
            CreatedAt = now,
            UpdatedAt = now
        });

        var participant = await participants.AddAsync(new Participant
        {
            Id = string.Empty,
            EventId = evt.Id,
            Pseudo = "Rollback",
            UserId = user.Id,
            CreatedAt = now,
            UpdatedAt = now
        });

        await notifications.AddAsync(new UserNotification
        {
            UserId = user.Id,
            Type = UserNotificationType.NewFollower,
            EventId = evt.Id,
            EventSlug = evt.Slug,
            EventTitle = evt.Title,
            IsRead = false,
            CreatedAt = now
        });

        await pushSubscriptions.UpsertAsync(new PushSubscription
        {
            Id = string.Empty,
            UserId = user.Id,
            Endpoint = "https://push.example.test/" + suffix,
            P256dh = "clef",
            Auth = "auth"
        });

        await follows.FollowAsync(user.Id, followed.Id);

        await watchlist.AddAsync(new WatchlistItem
        {
            Id = string.Empty,
            UserId = user.Id,
            TmdbId = 550,
            MediaType = MovieMediaType.Movie,
            Title = "Fight Club",
            Year = "1999",
            CreatedAt = now
        });

        return new Fixture(user.Id, followed.Id, evt.Id, evt.Slug, participant.Id);
    }

    private static DeleteAccountHandler BuildHandlerFailingOnResetTokens(IServiceProvider services) =>
        new(
            services.GetRequiredService<IUserRepository>(),
            services.GetRequiredService<IPasswordHasher>(),
            services.GetRequiredService<IEventRepository>(),
            services.GetRequiredService<IParticipantRepository>(),
            services.GetRequiredService<IUserNotificationRepository>(),
            services.GetRequiredService<IPushSubscriptionRepository>(),
            services.GetRequiredService<IFollowRepository>(),
            services.GetRequiredService<IWatchlistRepository>(),
            new ThrowingResetTokenRepository(),
            services.GetRequiredService<IAuthSessionInvalidator>(),
            services.GetRequiredService<IUnitOfWork>(),
            NullLogger<DeleteAccountHandler>.Instance);

    [MongoFact]
    public async Task FailedDeletion_LeavesTheAccountAndEveryLinkedDocumentIntact()
    {
        using var scope = _factory.Services.CreateScope();
        var services = scope.ServiceProvider;
        var fixture = await SeedAsync(services);

        var handler = BuildHandlerFailingOnResetTokens(services);

        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            handler.HandleAsync(fixture.UserId, new DeleteAccountRequest { Password = "MotDePasse1!" }));

        var users = services.GetRequiredService<IUserRepository>();
        var events = services.GetRequiredService<IEventRepository>();
        var participants = services.GetRequiredService<IParticipantRepository>();
        var notifications = services.GetRequiredService<IUserNotificationRepository>();
        var pushSubscriptions = services.GetRequiredService<IPushSubscriptionRepository>();
        var follows = services.GetRequiredService<IFollowRepository>();
        var watchlist = services.GetRequiredService<IWatchlistRepository>();

        Assert.NotNull(await users.GetByIdAsync(fixture.UserId));

        var evt = await events.GetByIdOrSlugAsync(fixture.EventSlug);
        Assert.NotNull(evt);
        Assert.Equal(fixture.UserId, evt!.CreatorUserId);

        var eventParticipants = await participants.ListByEventIdAsync(fixture.EventId);
        var participant = Assert.Single(eventParticipants);
        Assert.Equal(fixture.UserId, participant.UserId);
        Assert.NotEqual(DeleteAccountHandler.AnonymizedParticipantPseudo, participant.Pseudo);

        Assert.NotEmpty(await notifications.ListByUserIdAsync(fixture.UserId));
        Assert.NotEmpty(await pushSubscriptions.ListByUserIdAsync(fixture.UserId));
        Assert.True(await follows.IsFollowingAsync(fixture.UserId, fixture.FollowedUserId));
        Assert.NotEmpty(await watchlist.ListByUserIdAsync(fixture.UserId));
    }

    [MongoFact]
    public async Task SuccessfulDeletion_RemovesThePersonalDataAndAnonymizesWhatIsShared()
    {
        using var scope = _factory.Services.CreateScope();
        var services = scope.ServiceProvider;
        var fixture = await SeedAsync(services);

        var handler = services.GetRequiredService<IDeleteAccountHandler>();

        await handler.HandleAsync(fixture.UserId, new DeleteAccountRequest { Password = "MotDePasse1!" });

        var users = services.GetRequiredService<IUserRepository>();
        var events = services.GetRequiredService<IEventRepository>();
        var participants = services.GetRequiredService<IParticipantRepository>();
        var notifications = services.GetRequiredService<IUserNotificationRepository>();
        var pushSubscriptions = services.GetRequiredService<IPushSubscriptionRepository>();
        var follows = services.GetRequiredService<IFollowRepository>();
        var watchlist = services.GetRequiredService<IWatchlistRepository>();

        Assert.Null(await users.GetByIdAsync(fixture.UserId));
        Assert.Empty(await notifications.ListByUserIdAsync(fixture.UserId));
        Assert.Empty(await pushSubscriptions.ListByUserIdAsync(fixture.UserId));
        Assert.False(await follows.IsFollowingAsync(fixture.UserId, fixture.FollowedUserId));
        Assert.Empty(await watchlist.ListByUserIdAsync(fixture.UserId));

        var evt = await events.GetByIdOrSlugAsync(fixture.EventSlug);
        Assert.NotNull(evt);
        Assert.True(string.IsNullOrEmpty(evt!.CreatorUserId));

        var participant = Assert.Single(await participants.ListByEventIdAsync(fixture.EventId));
        Assert.Equal(DeleteAccountHandler.AnonymizedParticipantPseudo, participant.Pseudo);
        Assert.True(string.IsNullOrEmpty(participant.UserId));
    }

    [MongoFact]
    public async Task WrongPassword_RefusesBeforeOpeningAnyTransaction()
    {
        using var scope = _factory.Services.CreateScope();
        var services = scope.ServiceProvider;
        var fixture = await SeedAsync(services);

        var handler = services.GetRequiredService<IDeleteAccountHandler>();

        await Assert.ThrowsAsync<Domain.Exceptions.UnauthorizedException>(() =>
            handler.HandleAsync(fixture.UserId, new DeleteAccountRequest { Password = "MauvaisMotDePasse!" }));

        var users = services.GetRequiredService<IUserRepository>();
        var watchlist = services.GetRequiredService<IWatchlistRepository>();

        Assert.NotNull(await users.GetByIdAsync(fixture.UserId));
        Assert.NotEmpty(await watchlist.ListByUserIdAsync(fixture.UserId));
    }
}
