using System.Text.Json;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Http;
using MoviePicker.Api.Domain.Exceptions;
using MoviePicker.Api.Infrastructure.Web;
using Xunit;

namespace MoviePicker.Api.Tests.Infrastructure.Web;

public sealed class ApiStatusCodePageTests
{
    private static async Task<(HttpResponse Response, string Body)> RenderAsync(int status, string? contentType = null)
    {
        var ctx = new DefaultHttpContext();
        ctx.Response.Body = new MemoryStream();
        ctx.Response.StatusCode = status;
        ctx.Response.ContentType = contentType;
        await ApiStatusCodePage.WriteAsync(new StatusCodeContext(ctx, new StatusCodePagesOptions(), _ => Task.CompletedTask));
        ctx.Response.Body.Position = 0;
        return (ctx.Response, await new StreamReader(ctx.Response.Body).ReadToEndAsync());
    }

    [Theory]
    [InlineData(400, ErrorCodes.ValidationFailed)]
    [InlineData(404, ErrorCodes.NotFound)]
    [InlineData(401, ErrorCodes.Unauthorized)]
    public async Task WriteAsync_EmptyError_AnswersTheApiErrorEnvelope(int status, string reason)
    {
        var (response, body) = await RenderAsync(status);

        Assert.Equal("application/json", response.ContentType);
        var json = JsonElement.Parse(body);
        Assert.Equal(status, json.GetProperty("code").GetInt32());
        Assert.Equal(reason, json.GetProperty("reason").GetString());
    }

    [Fact]
    public async Task WriteAsync_MethodNotAllowed_StillAnswersJson()
    {
        var (response, body) = await RenderAsync(405);

        Assert.Equal("application/json", response.ContentType);
        Assert.Equal(405, JsonElement.Parse(body).GetProperty("code").GetInt32());
    }

    [Fact]
    public async Task WriteAsync_ResponseThatAlreadyChoseItsType_IsLeftAlone()
    {
        var (response, body) = await RenderAsync(404, "text/html; charset=utf-8");

        Assert.Equal("text/html; charset=utf-8", response.ContentType);
        Assert.Equal(string.Empty, body);
    }

    [Fact]
    public async Task WriteAsync_SuccessWithoutBody_IsLeftAlone()
    {
        var (_, body) = await RenderAsync(204);

        Assert.Equal(string.Empty, body);
    }
}
