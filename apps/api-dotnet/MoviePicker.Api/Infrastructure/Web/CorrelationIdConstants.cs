namespace MoviePicker.Api.Infrastructure.Web;

public static class CorrelationIdConstants
{
    public const string ItemKey = "MoviePicker.CorrelationId";

    public const string LoggingScopeKey = "CorrelationId";

    public const string ResponseHeaderName = "X-Request-Id";

    public static readonly string[] IncomingHeaderNames = ["X-Request-Id", "X-Correlation-Id"];

    internal const int MaxIncomingLength = 128;
}
