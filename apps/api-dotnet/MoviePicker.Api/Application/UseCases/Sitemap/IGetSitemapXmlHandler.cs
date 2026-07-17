namespace MoviePicker.Api.Application.UseCases.Sitemap;

public interface IGetSitemapXmlHandler
{
    Task<string> BuildXmlAsync(CancellationToken ct = default);
}
