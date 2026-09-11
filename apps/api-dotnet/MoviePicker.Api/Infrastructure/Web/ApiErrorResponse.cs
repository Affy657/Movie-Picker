using System.Text.Json.Serialization;

namespace MoviePicker.Api.Infrastructure.Web;

public sealed record ApiErrorResponse(
    [property: JsonPropertyName("error")] string Error,
    [property: JsonPropertyName("code")] int Code,
    [property: JsonPropertyName("requestId")]
    [property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    string? RequestId = null,
    [property: JsonPropertyName("reason")]
    [property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    string? Reason = null)
{
    public static ApiErrorResponse FromHttpContext(
        HttpContext httpContext,
        int statusCode,
        string message,
        string? reason = null)
    {
        var id = httpContext.Items[CorrelationIdConstants.ItemKey] as string;
        return new ApiErrorResponse(message, statusCode, id, reason);
    }
}
