using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.MovieListMembers;
using MoviePicker.Api.Application.UseCases.MovieLists;
using MoviePicker.Api.Application.UseCases.UserMovies;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Infrastructure.Persistence.InMemory;
using MoviePicker.Api.Tests.Builders;
using MoviePicker.Api.Tests.UseCases.Watched;

namespace MoviePicker.Api.Tests.UseCases.MovieLists;

internal sealed class SteppingClock : TimeProvider
{
    public SteppingClock(DateTimeOffset now) => Now = now;

    public DateTimeOffset Now { get; private set; }

    public void Advance(TimeSpan by) => Now += by;

    public override DateTimeOffset GetUtcNow() => Now;
}

internal sealed class MovieListTestKit
{
    public const string Owner = "owner-1";
    public const string Stranger = "stranger-1";
    public const string Member = "member-1";
    public const string Invitee = "invitee-1";

    public static readonly DateTimeOffset Start = new(2026, 11, 13, 20, 0, 0, TimeSpan.Zero);

    public MovieListTestKit()
    {
        Posters.Setup(p => p.ToPublicPosterPath(It.IsAny<string?>())).Returns((string? path) => path);
        Tmdb
            .Setup(t => t.GetDetailsAsync(It.IsAny<int>(), It.IsAny<MovieMediaType>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((TmdbMovieDetails?)null);
    }

    public InMemoryMovieListRepository Lists { get; } = new();

    public InMemoryUserRepository Users { get; } = new();

    public InMemoryUserNotificationRepository Notifications { get; } = new();

    public InMemoryFollowRepository Follows { get; } = new();

    public InMemoryPushSubscriptionRepository PushSubscriptions { get; } = new();

    public Mock<IPushNotificationSender> Push { get; } = new();

    public RecordingSharedQuota Quota { get; } = new();

    public Mock<IPosterImageStore> Posters { get; } = new();

    public Mock<ITmdbMovieSearch> Tmdb { get; } = new();

    public SteppingClock Clock { get; } = new(Start);

    public MovieListItemFactory Items => new(Posters.Object, Tmdb.Object, NullLogger<MovieListItemFactory>.Instance);

    public WatchedTestKit Watching { get; } = new();

    public WatchedHistoryReader History => Watching.History;

    public ListMovieListsHandler ListHandler() => new(Lists, History, Users);

    public CreateMovieListHandler CreateHandler() => new(Lists, Items, History, Users, Clock);

    public GetMovieListHandler GetHandler() => new(Lists, History, Users);

    public UpdateMovieListHandler UpdateHandler() => new(Lists, History, Users, Clock);

    public DeleteMovieListHandler DeleteHandler() => new(Lists, Notifications);

    public AddMovieListItemHandler AddItemHandler() => new(Lists, Items, History, Users, Clock);

    public GetMovieListMembersHandler MembersHandler() => new(Lists, Users, Clock);

    public ListMovieListInvitableUsersHandler InvitableHandler() => new(Lists, Follows, Users);

    public InviteToMovieListHandler InviteHandler() =>
        new(Lists, Follows, Users, Notifications, PushSubscriptions, Push.Object, Quota, Clock);

    public CancelMovieListInvitationHandler CancelInvitationHandler() => new(Lists, Notifications);

    public AcceptMovieListInvitationHandler AcceptHandler() => new(Lists, History, Users, Clock);

    public DeclineMovieListInvitationHandler DeclineHandler() => new(Lists);

    public RemoveMovieListMemberHandler RemoveMemberHandler() => new(Lists);

    public LeaveMovieListHandler LeaveHandler() => new(Lists);

    public CreateMovieListInviteLinkHandler CreateLinkHandler() => new(Lists, Clock);

    public DisableMovieListInviteLinkHandler DisableLinkHandler() => new(Lists);

    public GetMovieListInvitePreviewHandler PreviewHandler() => new(Lists, Users, Clock);

    public JoinMovieListHandler JoinHandler() => new(Lists, History, Users, Clock);

    public Task<User> PersonAsync(string id, string displayName, bool isProfilePublic = true) =>
        Users.AddAsync(new User
        {
            Id = id,
            Email = $"{id}@test.local",
            DisplayName = displayName,
            Handle = id.Replace("-", string.Empty, StringComparison.Ordinal),
            AvatarId = $"avatar-{id}",
            IsProfilePublic = isProfilePublic,
            CreatedAt = Start,
            UpdatedAt = Start
        });

    public async Task ShareAsync(string listId, params string[] members)
    {
        foreach (var member in members)
        {
            await Lists.AddInvitationAsync(listId, new MovieListInvitation(member, Clock.Now), MovieList.MaxMembers);
            await Lists.AcceptInvitationAsync(listId, new MovieListMember(member, Clock.Now));
        }
    }

    public Task InviteAsync(string listId, string invitee) =>
        Lists.AddInvitationAsync(listId, new MovieListInvitation(invitee, Clock.Now), MovieList.MaxMembers);

    public Task<WatchedTitle> WatchElsewhereAsync(
        int tmdbId,
        MovieMediaType mediaType = MovieMediaType.Movie,
        string owner = Owner) =>
        Watching.Watched.AddIfAbsentAsync(new WatchedTitle
        {
            OwnerId = owner,
            TmdbId = tmdbId,
            MediaType = mediaType,
            Title = $"Film {tmdbId}",
            Year = "1999",
            WatchedAt = Start,
            CreatedAt = Start,
            UpdatedAt = Start
        });

    public RemoveMovieListItemHandler RemoveItemHandler() => new(Lists, Clock);

    public Task<MovieListSummaryResponse> CreateAsync(
        string name,
        string owner = Owner,
        string? description = null,
        AddWatchlistItemRequest? firstItem = null) =>
        CreateHandler().HandleAsync(owner, new CreateMovieListRequest { Name = name, Description = description, FirstItem = firstItem });

    public Task<MovieListItemAddition> AddAsync(string listId, AddWatchlistItemRequest title, string owner = Owner) =>
        AddItemHandler().HandleAsync(owner, listId, title);

    public static AddWatchlistItemRequest Title(
        int tmdbId,
        string? posterPath = null,
        MovieMediaType mediaType = MovieMediaType.Movie,
        string? title = null,
        IReadOnlyList<int>? genreIds = null,
        int? runtimeMinutes = null,
        double? voteAverage = null) => new()
        {
            TmdbId = tmdbId,
            MediaType = mediaType,
            Title = title ?? $"Film {tmdbId}",
            Year = "1999",
            PosterPath = posterPath,
            GenreIds = genreIds,
            RuntimeMinutes = runtimeMinutes,
            VoteAverage = voteAverage
        };

    public static string Poster(int tmdbId) => $"https://image.tmdb.org/t/p/w500/poster-{tmdbId}.jpg";
}
