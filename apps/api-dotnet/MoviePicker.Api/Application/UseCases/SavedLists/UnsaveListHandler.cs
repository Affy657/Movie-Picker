using MoviePicker.Api.Application.Ports;

namespace MoviePicker.Api.Application.UseCases.SavedLists;

public sealed class UnsaveListHandler : IUnsaveListHandler
{
    private readonly ISavedListRepository _saved;

    public UnsaveListHandler(ISavedListRepository saved)
    {
        _saved = saved;
    }

    public Task HandleAsync(string userId, string savedListId, CancellationToken ct = default) =>
        _saved.DeleteAsync(userId, savedListId, ct);
}
