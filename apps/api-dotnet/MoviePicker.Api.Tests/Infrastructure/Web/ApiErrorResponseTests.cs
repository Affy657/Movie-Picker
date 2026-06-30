using Microsoft.AspNetCore.Http;
using MoviePicker.Api.Infrastructure.Web;
using Xunit;

namespace MoviePicker.Api.Tests.Infrastructure.Web;

public sealed class ApiErrorResponseTests
{
    [Fact]
    public void FromHttpContext_IncludesCorrelationId_WhenPresent()
    {
        var http = new DefaultHttpContext();
        http.Items[CorrelationIdConstants.ItemKey] = "rid-1";

        var response = ApiErrorResponse.FromHttpContext(http, 404, "Introuvable");

        Assert.Equal("Introuvable", response.Error);
        Assert.Equal(404, response.Code);
        Assert.Equal("rid-1", response.RequestId);
    }

    [Fact]
    public void FromHttpContext_NullRequestId_WhenNoCorrelationId()
    {
        var response = ApiErrorResponse.FromHttpContext(new DefaultHttpContext(), 500, "Boom");

        Assert.Null(response.RequestId);
    }

    [Fact]
    public void Serialize_ProducesExpectedJsonKeys()
    {
        var http = new DefaultHttpContext();
        http.Items[CorrelationIdConstants.ItemKey] = "rid-2";

        var json = ApiErrorJson.Serialize(http, 400, "Bad request");

        Assert.Contains("\"error\":\"Bad request\"", json);
        Assert.Contains("\"code\":400", json);
        Assert.Contains("\"requestId\":\"rid-2\"", json);
    }

    [Fact]
    public void Serialize_OmitsRequestId_WhenNull()
    {
        var json = ApiErrorJson.Serialize(new DefaultHttpContext(), 400, "x");

        Assert.DoesNotContain("requestId", json);
    }
}
