using MoviePicker.Api.Infrastructure.Web;
using Xunit;

namespace MoviePicker.Api.Tests.Infrastructure;

public sealed class CorsOriginRulesTests
{
    [Theory]
    [InlineData("http://localhost:5173")]
    [InlineData("https://localhost:4000")]
    [InlineData("http://127.0.0.1:8080")]
    [InlineData("https://127.0.0.1:3000")]
    public void IsLocalDevelopmentOrigin_accepts_local_hosts(string origin) =>
        Assert.True(CorsOriginRules.IsLocalDevelopmentOrigin(origin));

    [Theory]
    [InlineData("https://evil.example")]
    [InlineData("http://192.168.1.1:5173")]
    [InlineData("")]
    [InlineData("not-a-url")]
    public void IsLocalDevelopmentOrigin_rejects_non_local(string origin) =>
        Assert.False(CorsOriginRules.IsLocalDevelopmentOrigin(origin));
}
