using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.MovieLists;
using MoviePicker.Api.Application.UseCases.Shared;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Domain.Exceptions;

namespace MoviePicker.Api.Application.UseCases.MovieListMembers;

public sealed class CreateMovieListInviteLinkHandler : ICreateMovieListInviteLinkHandler
{
    private readonly IMovieListRepository _lists;
    private readonly TimeProvider _clock;

    public CreateMovieListInviteLinkHandler(IMovieListRepository lists, TimeProvider clock)
    {
        _lists = lists;
        _clock = clock;
    }

    public async Task<MovieListInviteLinkResponse> HandleAsync(string userId, string listId, CancellationToken ct = default)
    {
        await MovieListPolicy.RequireOwnerAsync(_lists, userId, listId, ct);
        var now = _clock.StorageNow();
        var link = new MovieListInviteLink(MovieListInviteToken.New(), now + MovieList.InviteLinkLifetime, Disabled: false);
        if (!await _lists.SetInviteLinkAsync(userId, listId, link, ct))
            throw Errors.MovieListNotFound();
        return MovieListInviteLinkResponse.From(link, now);
    }
}
