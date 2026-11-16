using MoviePicker.Api.Application.DTOs;

namespace MoviePicker.Api.Application.UseCases.MovieListMembers;

public interface IGetMovieListMembersHandler
{
    Task<MovieListMembersResponse> HandleAsync(string userId, string listId, CancellationToken ct = default);
}

public interface IListMovieListInvitableUsersHandler
{
    Task<MovieListInvitableUsersResponse> HandleAsync(
        string userId,
        string listId,
        string? query,
        CancellationToken ct = default);
}

public interface IInviteToMovieListHandler
{
    Task<MovieListPendingInvitationResponse> HandleAsync(
        string userId,
        string listId,
        InviteToMovieListRequest request,
        CancellationToken ct = default);
}

public interface ICancelMovieListInvitationHandler
{
    Task HandleAsync(string userId, string listId, string inviteeId, CancellationToken ct = default);
}

public interface IAcceptMovieListInvitationHandler
{
    Task<MovieListSummaryResponse> HandleAsync(string userId, string listId, CancellationToken ct = default);
}

public interface IDeclineMovieListInvitationHandler
{
    Task HandleAsync(string userId, string listId, CancellationToken ct = default);
}

public interface IRemoveMovieListMemberHandler
{
    Task HandleAsync(string userId, string listId, string memberId, CancellationToken ct = default);
}

public interface ILeaveMovieListHandler
{
    Task HandleAsync(string userId, string listId, CancellationToken ct = default);
}

public interface ICreateMovieListInviteLinkHandler
{
    Task<MovieListInviteLinkResponse> HandleAsync(string userId, string listId, CancellationToken ct = default);
}

public interface IDisableMovieListInviteLinkHandler
{
    Task HandleAsync(string userId, string listId, CancellationToken ct = default);
}

public interface IGetMovieListInvitePreviewHandler
{
    Task<MovieListInvitePreviewResponse> HandleAsync(string? viewerId, string token, CancellationToken ct = default);
}

public interface IJoinMovieListHandler
{
    Task<MovieListJoin> HandleAsync(string userId, string token, CancellationToken ct = default);
}

public sealed record MovieListJoin(MovieListSummaryResponse List, bool Joined);
