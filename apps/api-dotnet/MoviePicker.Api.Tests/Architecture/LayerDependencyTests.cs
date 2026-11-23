using System.Reflection;
using NetArchTest.Rules;
using Xunit;

namespace MoviePicker.Api.Tests.Architecture;

public sealed class LayerDependencyTests
{
    private const string Domain = "MoviePicker.Api.Domain";
    private const string Application = "MoviePicker.Api.Application";
    private const string Controllers = "MoviePicker.Api.Controllers";
    private const string Infrastructure = "MoviePicker.Api.Infrastructure";
    private const string Persistence = "MoviePicker.Api.Infrastructure.Persistence";
    private const string BaseLibrary = "System";
    private const string MongoDriver = "MongoDB";
    private const string AspNetCore = "Microsoft.AspNetCore";
    private const string CompilerGeneratedHelpersNamespace = "";
    private const string CoverageInstrumentation = "Coverlet.Core.Instrumentation.Tracker";

    private static readonly Assembly Api = typeof(Program).Assembly;

    private static readonly string[] DomainAllowedDependencies = [BaseLibrary, Domain, CompilerGeneratedHelpersNamespace, CoverageInstrumentation];

    [Fact]
    public void Domain_DependsOnTheBaseLibraryAndItselfOnly()
    {
        var result = Types.InAssembly(Api)
            .That().ResideInNamespace(Domain)
            .Should().OnlyHaveDependenciesOn(DomainAllowedDependencies)
            .GetResult();

        AssertKept(result);
    }

    [Fact]
    public void Application_KnowsNeitherTheWebFrameworkNorTheDatabaseNorTheAdapters()
    {
        var result = Types.InAssembly(Api)
            .That().ResideInNamespace(Application)
            .ShouldNot().HaveDependencyOnAny(MongoDriver, AspNetCore, Infrastructure, Controllers)
            .GetResult();

        AssertKept(result);
    }

    [Fact]
    public void Controllers_GoThroughAUseCaseNeverThroughPersistence()
    {
        var result = Types.InAssembly(Api)
            .That().ResideInNamespace(Controllers)
            .ShouldNot().HaveDependencyOnAny(MongoDriver, Persistence)
            .GetResult();

        AssertKept(result);
    }

    [Fact]
    public void TheRulesSeeTheDependenciesTheyForbid()
    {
        var mongoAdapters = Types.InAssembly(Api)
            .That().ResideInNamespace(Persistence)
            .And().HaveDependencyOn(MongoDriver)
            .GetTypes();
        var webControllers = Types.InAssembly(Api)
            .That().ResideInNamespace(Controllers)
            .And().HaveDependencyOn(AspNetCore)
            .GetTypes();
        var adaptersHeldToTheDomainRule = Types.InAssembly(Api)
            .That().ResideInNamespace(Persistence)
            .Should().OnlyHaveDependenciesOn(DomainAllowedDependencies)
            .GetResult();

        Assert.NotEmpty(mongoAdapters);
        Assert.NotEmpty(webControllers);
        Assert.False(adaptersHeldToTheDomainRule.IsSuccessful);
    }

    private static void AssertKept(TestResult result)
    {
        var offenders = result.FailingTypeNames ?? [];
        Assert.True(result.IsSuccessful, $"Layer rule broken by: {string.Join(", ", offenders)}");
    }
}
