using System.Text.Json;

namespace MoviePicker.Api.Infrastructure.Web;

/// <summary>Sérialisation JSON des erreurs hors pipeline MVC (rate limit, status code pages).</summary>
public static class ApiErrorJson
{
    private static readonly JsonSerializerOptions Options = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        DefaultIgnoreCondition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull
    };

    public static string Serialize(HttpContext httpContext, int statusCode, string message) =>
        JsonSerializer.Serialize(ApiErrorResponse.FromHttpContext(httpContext, statusCode, message), Options);
}
