using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.MovieLists;
using MoviePicker.Api.Application.UseCases.Shared;
using MoviePicker.Api.Application.UseCases.UserMovies;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Domain.Exceptions;

namespace MoviePicker.Api.Application.UseCases.SavedLists;

public sealed class SaveListHandler : ISaveListHandler
{
    private readonly ISavedListRepository _saved;
    private readonly ListSourceReader _sources;
    private readonly WatchedHistoryReader _history;
    private readonly IUserRepository _users;
    private readonly TimeProvider _clock;

    public SaveListHandler(
        ISavedListRepository saved,
        ListSourceReader sources,
        WatchedHistoryReader history,
        IUserRepository users,
        TimeProvider clock)
    {
        _saved = saved;
        _sources = sources;
        _history = history;
        _users = users;
        _clock = clock;
    }

    public async Task<SavedListSaving> HandleAsync(string userId, SaveListRequest request, CancellationToken ct = default)
    {
        var source = ListSourceReader.Parse(request.SourceType, request.SourceId);
        var memberList = source.Type == ListSourceType.MemberList
            ? await _sources.RequireSavableMemberListAsync(userId, source, ct)
            : null;
        if (await _saved.FindBySourceAsync(userId, source, ct) is { } existing)
            return new SavedListSaving(await _sources.ReadSummaryAsync(_history, existing, memberList, ct), Created: false);

        if (await _saved.CountByOwnerAsync(userId, ct) >= SavedList.MaxPerOwner)
            throw Errors.SavedListLimitReached(SavedList.MaxPerOwner);

        var fallbackName = memberList?.Name ?? await _sources.RequireFallbackNameAsync(source, ct);
        await _users.RequireAccountAsync(userId, ct);
        var stored = await _saved.AddIfAbsentAsync(
            new SavedList
            {
                OwnerId = userId,
                SourceType = source.Type,
                SourceId = source.Id,
                SourceOwnerId = memberList?.Creator?.Id,
                Name = fallbackName,
                CreatedAt = _clock.StorageNow()
            },
            ct);
        return new SavedListSaving(await _sources.ReadSummaryAsync(_history, stored, memberList, ct), Created: true);
    }
}
