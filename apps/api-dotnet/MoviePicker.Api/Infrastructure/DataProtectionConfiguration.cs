using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.DataProtection.KeyManagement;
using Microsoft.Extensions.Options;
using MongoDB.Driver;
using MoviePicker.Api.Infrastructure.Persistence.Mongo;

namespace MoviePicker.Api.Infrastructure;

public static class DataProtectionConfiguration
{
    internal const string ApplicationName = "MoviePicker";

    public static void AddSharedDataProtection(this WebApplicationBuilder builder)
    {
        builder.Services
            .AddDataProtection()
            .SetApplicationName(ApplicationName);

        if (string.IsNullOrWhiteSpace(builder.Configuration["MONGODB_URI"]))
            return;

        builder.Services.AddSingleton<IConfigureOptions<KeyManagementOptions>>(sp =>
        {
            var collections = sp.GetService<MongoCollectionFactory>();
            return new ConfigureOptions<KeyManagementOptions>(options =>
            {
                if (collections is not null)
                    options.XmlRepository = new MongoXmlRepository(collections);
            });
        });
    }
}
