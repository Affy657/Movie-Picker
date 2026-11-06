using Microsoft.Extensions.DependencyInjection;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Infrastructure.Migrations;
using Xunit;

namespace MoviePicker.Api.Tests.Infrastructure.Migrations;

public sealed class DataMigrationRegistrationTests
{
    [Fact]
    public void EveryMigrationClass_IsRegistered_OtherwiseItWouldNeverRun()
    {
        var registered = new ServiceCollection()
            .AddDataMigrations()
            .Where(descriptor => descriptor.ServiceType == typeof(IDataMigration))
            .Select(descriptor => descriptor.ImplementationType?.FullName)
            .Order(StringComparer.Ordinal)
            .ToArray();
        var declared = typeof(DataMigrationRunner).Assembly.GetTypes()
            .Where(type => type is { IsClass: true, IsAbstract: false } && typeof(IDataMigration).IsAssignableFrom(type))
            .Select(type => type.FullName)
            .Order(StringComparer.Ordinal)
            .ToArray();

        Assert.NotEmpty(declared);
        Assert.Equal(declared, registered);
    }
}
