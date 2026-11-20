using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Domain.Exceptions;
using Xunit;

namespace MoviePicker.Api.IntegrationTests;

public sealed class HandleAvailabilityEndpointTests : IClassFixture<MoviePickerApplicationFactory>
{
    private const string Route = "/api/v1/users/me/handle-availability";

    private static readonly JsonSerializerOptions Json = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        PropertyNameCaseInsensitive = true,
        Converters = { new JsonStringEnumConverter(JsonNamingPolicy.CamelCase) }
    };

    private readonly MoviePickerApplicationFactory _factory;

    public HandleAvailabilityEndpointTests(MoviePickerApplicationFactory factory) => _factory = factory;

    [Fact]
    public async Task Anonymous_IsUnauthorized()
    {
        var response = await _factory.CreateClient().GetAsync($"{Route}?handle=libre");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task RefusesAHandleTheRulesForbidWithTheirReason()
    {
        var client = await IntegrationTestAuth.NewRegisteredClientAsync(_factory, "Pseudo Court");

        var response = await client.GetAsync($"{Route}?handle=ab");

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Contains($"\"{ErrorCodes.HandleTooShort}\"", await response.Content.ReadAsStringAsync());
    }

    [Fact]
    public async Task TellsWhetherAHandleIsFreeOrTaken()
    {
        var taker = await IntegrationTestAuth.NewRegisteredClientAsync(_factory, "Pseudo Pris");
        var takenHandle = (await taker.GetFromJsonAsync<UserProfileResponse>("/api/v1/auth/me", Json))!.Handle;
        var client = await IntegrationTestAuth.NewRegisteredClientAsync(_factory, "Pseudo Cherche");
        var freeHandle = "libre" + Guid.NewGuid().ToString("N")[..8];

        var free = await client.GetFromJsonAsync<HandleAvailabilityResponse>($"{Route}?handle={freeHandle.ToUpperInvariant()}", Json);
        var taken = await client.GetFromJsonAsync<HandleAvailabilityResponse>($"{Route}?handle={takenHandle}", Json);

        Assert.True(free!.Available);
        Assert.Equal(freeHandle, free.Handle);
        Assert.False(taken!.Available);
        Assert.Equal(ErrorCodes.HandleTaken, taken.Reason);
    }
}
