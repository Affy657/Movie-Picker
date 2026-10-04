namespace MoviePicker.Api.Infrastructure.Web;

public static class SessionWindow
{
    public static readonly TimeSpan AbsoluteLifetime = TimeSpan.FromDays(365);

    public static DateTimeOffset IssuedAt(DateTimeOffset createdAt, DateTimeOffset expiresAt)
    {
        var slidingStart = expiresAt - AuthConstants.SessionLifetime;
        return slidingStart > createdAt ? slidingStart : createdAt;
    }

    public static bool IsExpired(DateTimeOffset createdAt, DateTimeOffset expiresAt, DateTimeOffset now) =>
        expiresAt <= now || createdAt + AbsoluteLifetime <= now;
}
