using System.Globalization;
using System.Security.Claims;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.Extensions.DependencyInjection;
using MongoDB.Bson;
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

    [MongoFact]
    public async Task StoredSession_KeepsTheSignInTimeThroughRetrievalAndRenewal()
    {
        using var scope = _factory.Services.CreateScope();
        var store = new MongoAuthTicketStore(scope.ServiceProvider.GetRequiredService<MongoCollectionFactory>());
        var signedInAt = DateTimeOffset.UtcNow;
        var principal = new ClaimsPrincipal(new ClaimsIdentity(
            [
                new Claim(ClaimTypes.NameIdentifier, ObjectId.GenerateNewId().ToString()),
                RecentAuthentication.ClaimFor(signedInAt)
            ],
            CookieAuthenticationDefaults.AuthenticationScheme));
        var ticket = new AuthenticationTicket(
            principal,
            new AuthenticationProperties { ExpiresUtc = signedInAt.AddHours(1) },
            CookieAuthenticationDefaults.AuthenticationScheme);
        var expected = signedInAt.ToUnixTimeSeconds().ToString(CultureInfo.InvariantCulture);

        var key = await store.StoreAsync(ticket);
        var retrieved = await store.RetrieveAsync(key);
        Assert.NotNull(retrieved);
        Assert.Equal(expected, retrieved.Principal.FindFirst(RecentAuthentication.AuthenticatedAtClaimType)?.Value);
        Assert.True(RecentAuthentication.IsRecent(retrieved.Principal, signedInAt));

        retrieved.Properties.ExpiresUtc = signedInAt.AddHours(2);
        await store.RenewAsync(key, retrieved);
        var renewed = await store.RetrieveAsync(key);
        Assert.NotNull(renewed);
        Assert.Equal(expected, renewed.Principal.FindFirst(RecentAuthentication.AuthenticatedAtClaimType)?.Value);

        await store.RemoveAsync(key);
    }
}
