using System.Reflection;
using MoviePicker.Api.Application;
using MoviePicker.Api.Application.UseCases.IdeaSuggestions;
using Xunit;

namespace MoviePicker.Api.Tests.UseCases.IdeaSuggestions;

public sealed class PublishablePageTests
{
    private const string Identifier = "Zx81Qp";

    public static TheoryData<string, string> EveryFrontRoute()
    {
        var routes = new TheoryData<string, string>();
        foreach (var field in typeof(FrontRoutes).GetFields(BindingFlags.Public | BindingFlags.Static))
        {
            if (field is { IsLiteral: true } && field.GetRawConstantValue() is string route && route.StartsWith('/'))
                routes.Add(field.Name, route);
        }

        return routes;
    }

    private static string Visited(string route) =>
        "/" + string.Join('/', route
            .Split('/', StringSplitOptions.RemoveEmptyEntries)
            .Select((segment, index) => segment.StartsWith(':') ? $"{Identifier}{index}" : segment));

    [Fact]
    public void EveryFrontRoute_IsReadFromFrontRoutes()
    {
        Assert.Contains(EveryFrontRoute(), row => (string)row[1] == FrontRoutes.EventDetailPattern);
        Assert.Contains(EveryFrontRoute(), row => (string)row[1] == FrontRoutes.Home);
    }

    [Theory]
    [MemberData(nameof(EveryFrontRoute))]
    public void TemplateOf_AVisitedFrontRoute_GivesBackItsPattern_WithoutTheIdentifiers(string name, string route)
    {
        var template = PublishablePage.TemplateOf(Visited(route));

        Assert.True(route == template, $"{name}: {route} became {template}");
        Assert.DoesNotContain(Identifier, template, StringComparison.OrdinalIgnoreCase);
    }

    [Theory]
    [InlineData("/u/alice/unknown", "/u/:handle/:param")]
    [InlineData("/e/Ab3dE_9xYz/extra", "/e/:slug/:param")]
    [InlineData("/listes/films-vus", "/listes/films-vus")]
    [InlineData("/listes/Ab3dE_9xYz", "/listes/:listId")]
    [InlineData("/u", "/u")]
    [InlineData("/watchlist/Ab3dE_9xYz", "/watchlist/:param")]
    public void TemplateOf_KeepsWhatFrontRoutesKnows_AndHidesTheRest(string pagePath, string published)
    {
        Assert.Equal(published, PublishablePage.TemplateOf(pagePath));
    }

    [Theory]
    [InlineData(null)]
    [InlineData("   ")]
    [InlineData("films/tendances")]
    public void TemplateOf_SomethingThatIsNotAPath_IsLeftOut(string? pagePath)
    {
        Assert.Null(PublishablePage.TemplateOf(pagePath));
    }
}
