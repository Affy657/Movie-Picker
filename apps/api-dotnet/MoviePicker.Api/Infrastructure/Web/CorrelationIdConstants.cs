namespace MoviePicker.Api.Infrastructure.Web;

/// <summary>En-têtes et clés HttpContext pour le correlation / request id (roadmap § 29).</summary>
public static class CorrelationIdConstants
{
    public const string ItemKey = "MoviePicker.CorrelationId";

    /// <summary>Clé utilisée dans les scopes de logging (JSON structuré Cloud Logging).</summary>
    public const string LoggingScopeKey = "CorrelationId";

    public const string ResponseHeaderName = "X-Request-Id";

    /// <summary>En-têtes entrants reconnus (ordre de priorité).</summary>
    public static readonly string[] IncomingHeaderNames = ["X-Request-Id", "X-Correlation-Id"];

    internal const int MaxIncomingLength = 128;
}
