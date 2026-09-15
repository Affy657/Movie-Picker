namespace MoviePicker.Api.Infrastructure.Web;

public static class ConditionalGet
{
    public const string RevalidateEveryTime = "private, no-cache";

    public static bool IsNotModified(HttpRequest request, string? entityTag) =>
        entityTag is not null && request.Headers.IfNoneMatch.Contains(entityTag);

    public static void Stamp(HttpResponse response, string? entityTag)
    {
        if (entityTag is null)
            return;
        response.Headers.ETag = entityTag;
        response.Headers.CacheControl = RevalidateEveryTime;
    }
}
