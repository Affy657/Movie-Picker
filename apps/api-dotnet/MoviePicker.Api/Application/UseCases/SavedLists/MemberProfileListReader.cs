using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.UserMovies;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Domain.Exceptions;

namespace MoviePicker.Api.Application.UseCases.SavedLists;

public sealed class MemberProfileListReader
{
    private const int WatchedTake = 1_000;

    private readonly IUserRepository _users;
    private readonly IGetUserWatchedMoviesHandler _watched;
    private readonly IGetUserProposedMoviesHandler _proposals;

    public MemberProfileListReader(
        IUserRepository users,
        IGetUserWatchedMoviesHandler watched,
        IGetUserProposedMoviesHandler proposals)
    {
        _users = users;
        _watched = watched;
        _proposals = proposals;
    }

    public static bool Covers(ListSourceType type) =>
        type is ListSourceType.MemberWatched or ListSourceType.MemberProposals or ListSourceType.MemberWinningProposals;

    public async Task<ListSource?> ResolveAsync(ListSource byHandle, CancellationToken ct = default) =>
        await _users.GetByHandleAsync(byHandle.Id, ct) is { } member ? new ListSource(byHandle.Type, member.Id) : null;

    public async Task<(ListSource Source, ListSourceContent Content)> RequireSavableAsync(
        string userId,
        ListSource byHandle,
        CancellationToken ct = default)
    {
        var member = await _users.GetByHandleAsync(byHandle.Id, ct) ?? throw Errors.ListSourceNotFound();
        if (member.Id == userId)
            throw Errors.ListAlreadyYours();

        var content = await ContentOfAsync(byHandle.Type, member, ct);
        if (!content.IsAvailable)
            throw Errors.ListSourceNotFound();
        return (new ListSource(byHandle.Type, member.Id), content);
    }

    public async Task<ListSourceContent> ReadAsync(ListSource source, CancellationToken ct = default) =>
        await _users.GetByIdAsync(source.Id, ct) is { } member
            ? await ContentOfAsync(source.Type, member, ct)
            : ListSourceContent.Withdrawn(ListSourceUnavailableReason.Deleted);

    private async Task<ListSourceContent> ContentOfAsync(ListSourceType type, User member, CancellationToken ct)
    {
        if (!IsVisible(type, member))
            return ListSourceContent.Withdrawn(ListSourceUnavailableReason.Private);

        IReadOnlyList<SavedListTitle> titles = type == ListSourceType.MemberWatched
            ? [.. (await _watched.HandleNightsForUserAsync(member.Id, WatchedTake, ct)).Items.Select(TitleOf)]
            : [.. (await _proposals.HandleForUserAsync(member.Id, type == ListSourceType.MemberWinningProposals, ct)).Items.Select(TitleOf)];
        return ListSourceContent.OfMemberProfile(member, titles);
    }

    private static bool IsVisible(ListSourceType type, User member) =>
        member.IsProfilePublic && (type == ListSourceType.MemberProposals || member.IsWatchedPublic);

    private static SavedListTitle TitleOf(UserWatchedMovieItem item) => new()
    {
        TmdbId = item.TmdbId,
        MediaType = item.MediaType,
        Title = item.Title,
        Year = item.Year,
        PosterPath = item.PosterPath,
        VoteAverage = item.VoteAverage,
        RuntimeMinutes = item.RuntimeMinutes,
        GenreIds = item.GenreIds
    };

    private static SavedListTitle TitleOf(UserProposedMovieItem item) => new()
    {
        TmdbId = item.TmdbId,
        MediaType = item.MediaType,
        Title = item.Title,
        Year = item.Year,
        PosterPath = item.PosterPath,
        VoteAverage = item.VoteAverage,
        RuntimeMinutes = item.RuntimeMinutes,
        GenreIds = item.GenreIds
    };
}
