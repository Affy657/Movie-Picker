namespace MoviePicker.Api.Application.UseCases.ListMyEvents;

public static class MyEventListScope
{
    public const string Active = "active";
    public const string Finished = "finished";

    public static string Normalize(string? scope) =>
        string.Equals(scope, Finished, StringComparison.OrdinalIgnoreCase) ? Finished : Active;
}
