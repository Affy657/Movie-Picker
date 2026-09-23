using System.Security.Claims;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.Extensions.DependencyInjection;
using MoviePicker.Api.Infrastructure.Persistence.Mongo;
using MoviePicker.Api.Infrastructure.Web;
using Xunit;

namespace MoviePicker.Api.IntegrationTests;

public sealed class MongoAuthTicketStoreTests : IClassFixture<MoviePickerApplicationFactory>
{
    private readonly MoviePickerApplicationFactory _factory;

    public MongoAuthTicketStoreTests(MoviePickerApplicationFactory factory)
    {
        _factory = factory;
        _ = _factory.CreateClient();
    }

    private MongoAuthTicketStore Store() =>
        new(_factory.Services.GetRequiredService<MongoCollectionFactory>());

    private static AuthenticationTicket Ticket(DateTimeOffset issued, DateTimeOffset expires) =>
        new(
            new ClaimsPrincipal(new ClaimsIdentity([new Claim(ClaimTypes.NameIdentifier, "user-1")], CookieAuthenticationDefaults.AuthenticationScheme)),
            new AuthenticationProperties { IsPersistent = true, IssuedUtc = issued, ExpiresUtc = expires },
            CookieAuthenticationDefaults.AuthenticationScheme);

    [MongoFact]
    public async Task RetrieveAfterARenewal_StartsTheSlidingWindowAtTheRenewal()
    {
        var store = Store();
        var now = DateTimeOffset.UtcNow;
        var key = await store.StoreAsync(Ticket(now, now + AuthConstants.SessionLifetime));
        var renewedAt = now.AddDays(16);

        await store.RenewAsync(key, Ticket(renewedAt, renewedAt + AuthConstants.SessionLifetime));
        var retrieved = await store.RetrieveAsync(key);

        Assert.NotNull(retrieved);
        var window = retrieved!.Properties.ExpiresUtc!.Value - retrieved.Properties.IssuedUtc!.Value;
        Assert.True(window <= AuthConstants.SessionLifetime + TimeSpan.FromSeconds(1), $"window {window}");
    }

    [MongoFact]
    public async Task RetrieveAnExpiredSession_ReturnsNothingAndForgetsIt()
    {
        var store = Store();
        var past = DateTimeOffset.UtcNow.AddDays(-40);
        var key = await store.StoreAsync(Ticket(past, past.AddDays(30)));

        Assert.Null(await store.RetrieveAsync(key));
        Assert.Null(await store.RetrieveAsync(key));
    }
}
