namespace MoviePicker.Api.Infrastructure.Web;

public static class ConditionalGet
{
    public const string RevalidateEveryTime = "private, no-cache";
    public const string ImmutableForADay = "public,max-age=86400,immutable";

    public static bool IsNotModified(HttpRequest request, string? entityTag) =>
        entityTag is not null && request.Headers.IfNoneMatch.Contains(entityTag);

    public static void Stamp(HttpResponse response, string? entityTag)
    {
        if (entityTag is null)
            return;
        response.Headers.ETag = entityTag;
        response.Headers.CacheControl = RevalidateEveryTime;
    }

    public static void StampImmutable(HttpResponse response, string entityTag)
    {
        response.Headers.ETag = entityTag;
        response.Headers.CacheControl = ImmutableForADay;
    }

    public static void Unstamp(HttpResponse response)
    {
        response.Headers.CacheControl = "no-store";
        response.Headers.Remove("ETag");
    }
}
