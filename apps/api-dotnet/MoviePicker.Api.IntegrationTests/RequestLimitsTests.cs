using Microsoft.AspNetCore.Server.Kestrel.Core;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using MoviePicker.Api.Infrastructure.Web;
using Xunit;

namespace MoviePicker.Api.IntegrationTests;

public sealed class RequestLimitsTests : IClassFixture<MoviePickerApplicationFactory>
{
    private readonly MoviePickerApplicationFactory _factory;

    public RequestLimitsTests(MoviePickerApplicationFactory factory)
    {
        _factory = factory;
        _ = _factory.CreateClient();
    }

    [Fact]
    public void Server_RefusesRequestBodiesAboveOneMegabyte()
    {
        var kestrel = _factory.Services.GetRequiredService<IOptions<KestrelServerOptions>>().Value;

        Assert.Equal(RequestBodyLimits.DefaultBytes, kestrel.Limits.MaxRequestBodySize);
    }
}
