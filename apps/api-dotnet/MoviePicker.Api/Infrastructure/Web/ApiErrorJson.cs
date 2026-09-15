using System.Text.Json;

namespace MoviePicker.Api.Infrastructure.Web;

public static class ApiErrorJson
{
    private static readonly JsonSerializerOptions Options = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        DefaultIgnoreCondition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull
    };

    public static string Serialize(HttpContext httpContext, int statusCode, string message, string? reason = null) =>
        JsonSerializer.Serialize(ApiErrorResponse.FromHttpContext(httpContext, statusCode, message, reason), Options);
}
