using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Infrastructure.Posters;

namespace MoviePicker.Api.Infrastructure.Persistence.InMemory;

public static class InMemoryPersistenceServiceCollectionExtensions
{
    public static IServiceCollection ReplacePersistenceWithInMemoryDoubles(this IServiceCollection services)
    {
        Replace<IEventRepository, InMemoryEventRepository>(services);
        Replace<IParticipantRepository, InMemoryParticipantRepository>(services);
        Replace<IUserRepository, InMemoryUserRepository>(services);
        Replace<IPasswordResetTokenRepository, InMemoryPasswordResetTokenRepository>(services);
        Replace<IEmailVerificationTokenRepository, InMemoryEmailVerificationTokenRepository>(services);
        Replace<IAvatarPhotoRepository, InMemoryAvatarPhotoRepository>(services);
        Replace<IBannerPhotoRepository, InMemoryBannerPhotoRepository>(services);
        Replace<IMovieRepository, InMemoryMovieRepository>(services);
        Replace<IVoteRepository, InMemoryVoteRepository>(services);
        Replace<ISeenMarkRepository, InMemorySeenMarkRepository>(services);
        Replace<IMovieRatingRepository, InMemoryMovieRatingRepository>(services);
        Replace<IAuthSessionInvalidator, InMemoryAuthSessionInvalidator>(services);
        Replace<IAuthSessionDirectory, InMemoryAuthSessionDirectory>(services);
        Replace<IPushSubscriptionRepository, InMemoryPushSubscriptionRepository>(services);
        Replace<IFollowRepository, InMemoryFollowRepository>(services);
        Replace<IWatchlistRepository, InMemoryWatchlistRepository>(services);
        Replace<IMovieListRepository, InMemoryMovieListRepository>(services);
        Replace<IFriendGroupRepository, InMemoryFriendGroupRepository>(services);
        Replace<IWatchedTitleRepository, InMemoryWatchedTitleRepository>(services);
        Replace<ISavedListRepository, InMemorySavedListRepository>(services);
        Replace<IUserNotificationRepository, InMemoryUserNotificationRepository>(services);
        Replace<IKofiWebhookLogRepository, InMemoryKofiWebhookLogRepository>(services);
        Replace<IUsageCountRepository, InMemoryUsageCountRepository>(services);
        Replace<INotificationDedupRepository, InMemoryNotificationDedupRepository>(services);
        Replace<IRateLimitCounterStore, InMemoryRateLimitCounterStore>(services);
        Replace<IDatabaseHealthProbe, InMemoryDatabaseHealthProbe>(services);
        Replace<IMigrationHistoryRepository, InMemoryMigrationHistoryRepository>(services);
        Replace<IUnitOfWork, InMemoryUnitOfWork>(services);
        Replace<ISharedCache, InMemorySharedCache>(services);
        Replace<IEventPresenceRepository, InMemoryEventPresenceRepository>(services);

        if (services.Any(d => d.ServiceType == typeof(IPosterImageStore) && d.ImplementationType == typeof(MongoPosterImageStore)))
            Replace<IPosterImageStore, MemoryPosterImageStore>(services);

        return services;
    }

    private static void Replace<TService, TImplementation>(IServiceCollection services)
        where TService : class
        where TImplementation : class, TService
    {
        services.RemoveAll<TService>();
        services.AddSingleton<TService, TImplementation>();
    }
}
