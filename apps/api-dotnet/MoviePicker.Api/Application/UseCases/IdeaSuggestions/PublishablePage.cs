using System.Reflection;

namespace MoviePicker.Api.Application.UseCases.IdeaSuggestions;

public static class PublishablePage
{
    private const char ParameterMark = ':';
    private const string AnyIdentifier = ":param";

    private static readonly IReadOnlyList<string[]> RoutePatterns = typeof(FrontRoutes)
        .GetFields(BindingFlags.Public | BindingFlags.Static)
        .Where(field => field.IsLiteral)
        .Select(field => field.GetRawConstantValue())
        .OfType<string>()
        .Where(route => route.StartsWith('/'))
        .Select(SegmentsOf)
        .ToList();

    private static readonly HashSet<string> FixedSegments = RoutePatterns
        .SelectMany(segments => segments)
        .Where(segment => !IsParameter(segment))
        .ToHashSet(StringComparer.Ordinal);

    public static string? TemplateOf(string? pagePath)
    {
        if (string.IsNullOrWhiteSpace(pagePath))
            return null;

        var path = pagePath.Trim();
        var queryOrFragment = path.IndexOfAny(['?', '#']);
        if (queryOrFragment >= 0)
            path = path[..queryOrFragment];
        if (!path.StartsWith('/'))
            return null;

        var visited = SegmentsOf(path.ToLowerInvariant());
        var route = RoutePatterns
            .Where(pattern => pattern.Length <= visited.Length && Covers(pattern, visited))
            .OrderByDescending(pattern => pattern.Length)
            .ThenByDescending(pattern => pattern.Count(segment => !IsParameter(segment)))
            .FirstOrDefault() ?? [];
        var rest = visited.Skip(route.Length).Select(segment => FixedSegments.Contains(segment) ? segment : AnyIdentifier);
        return "/" + string.Join('/', route.Concat(rest));
    }

    private static string[] SegmentsOf(string path) => path.Split('/', StringSplitOptions.RemoveEmptyEntries);

    private static bool IsParameter(string segment) => segment.StartsWith(ParameterMark);

    private static bool Covers(string[] pattern, string[] visited) =>
        pattern.Select((segment, index) => IsParameter(segment) || segment == visited[index]).All(matches => matches);
}
