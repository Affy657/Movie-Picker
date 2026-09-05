using System.Xml.Linq;
using Microsoft.AspNetCore.DataProtection.Repositories;
using MongoDB.Driver;

namespace MoviePicker.Api.Infrastructure.Persistence.Mongo;

public sealed class MongoXmlRepository : IXmlRepository
{
    private readonly TransactionalCollection<DataProtectionKeyDocument> _collection;

    public MongoXmlRepository(MongoCollectionFactory collections)
    {
        _collection = collections.GetCollection<DataProtectionKeyDocument>("data_protection_keys");
    }

    public IReadOnlyCollection<XElement> GetAllElements()
    {
        var docs = _collection.Find(FilterDefinition<DataProtectionKeyDocument>.Empty).ToList();
        var elements = new List<XElement>(docs.Count);
        foreach (var doc in docs)
        {
            if (!string.IsNullOrWhiteSpace(doc.Xml))
                elements.Add(XElement.Parse(doc.Xml));
        }
        return elements;
    }

    public void StoreElement(XElement element, string friendlyName)
    {
        var id = string.IsNullOrWhiteSpace(friendlyName)
            ? Guid.NewGuid().ToString("N")
            : friendlyName;
        var doc = new DataProtectionKeyDocument
        {
            Id = id,
            Xml = element.ToString(SaveOptions.DisableFormatting)
        };
        _collection.ReplaceOne(x => x.Id == id, doc, new ReplaceOptions { IsUpsert = true });
    }
}
