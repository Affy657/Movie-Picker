using System.Reflection;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.Auth;
using MoviePicker.Api.Application.UseCases.Shared;
using MoviePicker.Api.Infrastructure.Persistence.Mongo;
using Xunit;

namespace MoviePicker.Api.Tests.Infrastructure.Persistence.Mongo;

public sealed class PersistedReferenceInventoryTests
{
    private sealed record Handling(Type? Port, string? ExemptBecause)
    {
        public static Handling Through<TPort>() => new(typeof(TPort), null);

        public static Handling Exempt(string reason) => new(null, reason);
    }

    private sealed record AccountHandling(Handling Erasure, Handling Export);

    private static readonly Dictionary<string, string> CascadeBySuffix = new(StringComparer.Ordinal)
    {
        ["MovieId"] = nameof(EventChildData.PurgeMoviesAsync),
        ["ParticipantId"] = nameof(EventChildData.PurgeParticipantTracesAsync),
        ["EventId"] = nameof(EventChildData.PurgeEventAsync),
    };

    private static readonly string[] AccountSuffixes = ["UserId", "UserIds", "OwnerId", "FollowerId", "FolloweeId", "ActorHandle"];

    private const string ExpiresWithinMinutes = "expires by TTL a few minutes after the last heartbeat (event_presence_expiresAt_ttl)";

    private const string ExpiresWithinEightDays = "expires by TTL eight days after the push it deduplicates (push_dedup_markers_createdAt_ttl_8d)";

    private static readonly Dictionary<string, Handling> EventScoped = new(StringComparer.Ordinal)
    {
        ["MovieDocument.EventId"] = Handling.Through<IMovieRepository>(),
        ["MovieDocument.ParticipantId"] = Handling.Through<IMovieRepository>(),
        ["VoteDocument.EventId"] = Handling.Through<IVoteRepository>(),
        ["VoteDocument.MovieId"] = Handling.Through<IVoteRepository>(),
        ["VoteDocument.ParticipantId"] = Handling.Through<IVoteRepository>(),
        ["SeenMarkDocument.EventId"] = Handling.Through<ISeenMarkRepository>(),
        ["SeenMarkDocument.MovieId"] = Handling.Through<ISeenMarkRepository>(),
        ["SeenMarkDocument.ParticipantId"] = Handling.Through<ISeenMarkRepository>(),
        ["MovieRatingDocument.EventId"] = Handling.Through<IMovieRatingRepository>(),
        ["MovieRatingDocument.MovieId"] = Handling.Through<IMovieRatingRepository>(),
        ["MovieRatingDocument.ParticipantId"] = Handling.Through<IMovieRatingRepository>(),
        ["ParticipantDocument.EventId"] = Handling.Through<IParticipantRepository>(),
        ["UserNotificationDocument.EventId"] = Handling.Through<IUserNotificationRepository>(),
        ["EventWinnerDocument.MovieId"] = Handling.Exempt(
            "embedded in its event, which goes with it; a movie that won can be neither deleted nor taken away with its proposer (wheel lock)"),
        ["EventDocument.NextOccurrenceEventId"] = Handling.Exempt(
            "DeleteEventHandler clears it on the parent when the occurrence it names is deleted"),
        ["EventDocument.RecurrenceParentEventId"] = Handling.Exempt(
            "only read to find a parent that still exists; a deleted parent is simply not found"),
        ["EventPresenceDocument.EventId"] = Handling.Exempt(ExpiresWithinMinutes),
        ["EventPresenceDocument.ParticipantId"] = Handling.Exempt(ExpiresWithinMinutes),
        ["PushDedupMarkerDocument.EventId"] = Handling.Exempt(ExpiresWithinEightDays),
    };

    private static readonly Dictionary<string, AccountHandling> AccountScoped = new(StringComparer.Ordinal)
    {
        ["AuthSessionDocument.UserId"] = new(
            Handling.Through<IAuthSessionInvalidator>(),
            Handling.Exempt("a session only repeats claims of the profile, which the export already carries")),
        ["AvatarPhotoBlobDocument.UserId"] = new(
            Handling.Through<IAvatarPhotoRepository>(),
            Handling.Through<IAvatarPhotoRepository>()),
        ["BannerPhotoBlobDocument.UserId"] = new(
            Handling.Through<IBannerPhotoRepository>(),
            Handling.Through<IBannerPhotoRepository>()),
        ["EventDocument.CoHostUserIds"] = new(
            Handling.Through<IEventRepository>(),
            Handling.Exempt("a co-host role is a decision of the creator about their event, and the user still sees it on the event")),
        ["EventDocument.CreatorUserId"] = new(
            Handling.Through<IEventRepository>(),
            Handling.Through<IEventRepository>()),
        ["EventDocument.RemovedUserIds"] = new(
            Handling.Through<IEventRepository>(),
            Handling.Exempt("a removal is a decision of the host about their event; the notice sent to the user goes with the exported notifications")),
        ["FollowDocument.FollowerId"] = new(
            Handling.Through<IFollowRepository>(),
            Handling.Through<IFollowRepository>()),
        ["FollowDocument.FolloweeId"] = new(
            Handling.Through<IFollowRepository>(),
            Handling.Through<IFollowRepository>()),
        ["FriendGroupDocument.OwnerId"] = new(
            Handling.Through<IFriendGroupRepository>(),
            Handling.Through<IFriendGroupRepository>()),
        ["FriendGroupMemberDocument.UserId"] = new(
            Handling.Through<IFriendGroupRepository>(),
            Handling.Through<IFriendGroupRepository>()),
        ["FriendGroupInvitationDocument.UserId"] = new(
            Handling.Through<IFriendGroupRepository>(),
            Handling.Through<IFriendGroupRepository>()),
        ["MovieListDocument.OwnerId"] = new(
            Handling.Through<IMovieListRepository>(),
            Handling.Through<IMovieListRepository>()),
        ["MovieListMemberDocument.UserId"] = new(
            Handling.Through<IMovieListRepository>(),
            Handling.Through<IMovieListRepository>()),
        ["MovieListInvitationDocument.UserId"] = new(
            Handling.Through<IMovieListRepository>(),
            Handling.Through<IMovieListRepository>()),
        ["MovieListItemDocument.AddedByUserId"] = new(
            Handling.Exempt("the title stays in the list of its owner, and an author whose account is gone resolves to no card"),
            Handling.Exempt("a title added to a list someone else owns belongs to that list; the joined list itself is exported")),
        ["ParticipantDocument.UserId"] = new(
            Handling.Through<IParticipantRepository>(),
            Handling.Through<IParticipantRepository>()),
        ["PasswordResetTokenDocument.UserId"] = new(
            Handling.Through<IPasswordResetTokenRepository>(),
            Handling.Exempt("only the hash of a single-use secret, meaningless outside the reset flow")),
        ["PushDedupMarkerDocument.UserId"] = new(
            Handling.Exempt(ExpiresWithinEightDays),
            Handling.Exempt("delivery bookkeeping, nothing the user wrote or chose")),
        ["PushSubscriptionDocument.UserId"] = new(
            Handling.Through<IPushSubscriptionRepository>(),
            Handling.Through<IPushSubscriptionRepository>()),
        ["SavedListDocument.OwnerId"] = new(
            Handling.Through<ISavedListRepository>(),
            Handling.Through<ISavedListRepository>()),
        ["SavedListDocument.SourceOwnerId"] = new(
            Handling.Through<ISavedListRepository>(),
            Handling.Exempt("a list saved by someone else belongs to whoever saved it")),
        ["UserNotificationDocument.UserId"] = new(
            Handling.Through<IUserNotificationRepository>(),
            Handling.Through<IUserNotificationRepository>()),
        ["UserNotificationDocument.ActorHandle"] = new(
            Handling.Through<IUserNotificationRepository>(),
            Handling.Exempt("a notification sent to someone else belongs to its recipient")),
        ["WatchedTitleDocument.OwnerId"] = new(
            Handling.Through<IWatchedTitleRepository>(),
            Handling.Through<IWatchedTitleRepository>()),
        ["WatchlistItemDocument.UserId"] = new(
            Handling.Through<IWatchlistRepository>(),
            Handling.Through<IWatchlistRepository>()),
    };

    private static IEnumerable<Type> PersistedDocuments() =>
        typeof(EventDocument).Assembly.GetTypes()
            .Where(type => type.Namespace == typeof(EventDocument).Namespace
                && type is { IsClass: true, IsAbstract: false }
                && type.Name.EndsWith("Document", StringComparison.Ordinal));

    private static SortedSet<string> ReferencesOf(IEnumerable<Type> documents, IEnumerable<string> suffixes) =>
        new(
            documents.SelectMany(document => document
                .GetProperties(BindingFlags.Public | BindingFlags.Instance)
                .Where(property => suffixes.Any(suffix => property.Name.EndsWith(suffix, StringComparison.Ordinal)))
                .Select(property => $"{document.Name}.{property.Name}")),
            StringComparer.Ordinal);

    private static IEnumerable<string> Undeclared(IEnumerable<Type> documents, IEnumerable<string> suffixes, IEnumerable<string> declared) =>
        ReferencesOf(documents, suffixes).Except(declared, StringComparer.Ordinal);

    private static string SuffixOf(string reference) =>
        CascadeBySuffix.Keys.Single(suffix => reference.EndsWith(suffix, StringComparison.Ordinal));

    private static IEnumerable<string> PurgesNotReceivedByTheirCascade(IReadOnlyDictionary<string, Handling> table) =>
        table
            .Where(entry => entry.Value.Port is not null)
            .Where(entry => !typeof(EventChildData)
                .GetMethod(CascadeBySuffix[SuffixOf(entry.Key)])!
                .GetParameters()
                .Any(parameter => parameter.ParameterType == entry.Value.Port))
            .Select(entry => entry.Key);

    private static bool Receives(Type handler, Type port) =>
        handler.GetConstructors().Single().GetParameters().Any(parameter => parameter.ParameterType == port);

    private static IEnumerable<string> AccountPortsNotReceived(IReadOnlyDictionary<string, AccountHandling> table) =>
        table
            .Where(entry =>
                (entry.Value.Erasure.Port is { } erasedThrough && !Receives(typeof(DeleteAccountHandler), erasedThrough))
                || (entry.Value.Export.Port is { } exportedThrough && !Receives(typeof(ExportUserDataHandler), exportedThrough)))
            .Select(entry => entry.Key);

    [Fact]
    public void EveryEventScopedReference_IsDeclaredPurgedByItsCascadeOrExempted()
    {
        Assert.Equal(
            EventScoped.Keys.Order(StringComparer.Ordinal),
            ReferencesOf(PersistedDocuments(), CascadeBySuffix.Keys));
    }

    [Fact]
    public void EveryAccountReference_IsDeclaredErasedAndExportedOrExempted()
    {
        Assert.Equal(
            AccountScoped.Keys.Order(StringComparer.Ordinal),
            ReferencesOf(PersistedDocuments(), AccountSuffixes));
    }

    [Fact]
    public void EveryDeclaredPurge_NamesARepositoryItsCascadeReceives()
    {
        Assert.Empty(PurgesNotReceivedByTheirCascade(EventScoped));
    }

    [Fact]
    public void EveryDeclaredErasureAndExport_NamesARepositoryTheHandlerReceives()
    {
        Assert.Empty(AccountPortsNotReceived(AccountScoped));
    }

    [Fact]
    public void EveryExemption_SaysWhy()
    {
        var handlings = EventScoped.Values
            .Concat(AccountScoped.Values.SelectMany(handling => new[] { handling.Erasure, handling.Export }));

        Assert.All(handlings, handling => Assert.True(
            handling.Port is not null ^ !string.IsNullOrWhiteSpace(handling.ExemptBecause)));
    }

    [Fact]
    public void ANewDocument_CarryingAnEventOrAccountReference_IsReportedUntilDeclared()
    {
        Assert.Equal(
            ["StrayDocument.ParticipantId"],
            Undeclared([typeof(StrayDocument)], CascadeBySuffix.Keys, EventScoped.Keys));
        Assert.Equal(
            ["StrayDocument.ReviewerUserId"],
            Undeclared([typeof(StrayDocument)], AccountSuffixes, AccountScoped.Keys));
    }

    [Fact]
    public void ADeclaredPurge_ThroughARepositoryTheCascadeDoesNotReceive_IsReported()
    {
        var misdeclared = new Dictionary<string, Handling>
        {
            ["StrayDocument.ParticipantId"] = Handling.Through<IWatchlistRepository>(),
            ["VoteDocument.MovieId"] = Handling.Through<IVoteRepository>(),
        };

        Assert.Equal(["StrayDocument.ParticipantId"], PurgesNotReceivedByTheirCascade(misdeclared));
    }

    [Fact]
    public void AnAccountReference_ThroughARepositoryNeitherHandlerReceives_IsReported()
    {
        var misdeclared = new Dictionary<string, AccountHandling>
        {
            ["StrayDocument.ReviewerUserId"] = new(
                Handling.Through<IMovieRepository>(),
                Handling.Exempt("nothing to export")),
            ["WatchlistItemDocument.UserId"] = new(
                Handling.Through<IWatchlistRepository>(),
                Handling.Through<IWatchlistRepository>()),
        };

        Assert.Equal(["StrayDocument.ReviewerUserId"], AccountPortsNotReceived(misdeclared));
    }

    private sealed record StrayDocument(string ParticipantId, string ReviewerUserId);
}
