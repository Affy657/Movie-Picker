namespace MoviePicker.Api.Application.UseCases.Follow;

public interface IFollowUserHandler
{
    Task HandleAsync(string currentUserId, string targetHandle, CancellationToken ct = default);
}
