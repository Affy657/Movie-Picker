using System.Linq.Expressions;
using MongoDB.Driver;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Domain.Exceptions;

namespace MoviePicker.Api.Infrastructure.Persistence.Mongo;

internal static class OptimisticConcurrency
{
    public static FilterDefinition<TDocument> ExpectedVersion<TDocument>(
        Expression<Func<TDocument, long>> field,
        long expected)
    {
        var builder = Builders<TDocument>.Filter;
        return expected == 0
            ? builder.Or(builder.Eq(field, 0), builder.Exists(new ExpressionFieldDefinition<TDocument, long>(field), false))
            : builder.Eq(field, expected);
    }

    public static async Task ThrowForUnmatchedReplaceAsync<TDocument>(
        TransactionalCollection<TDocument> collection,
        Expression<Func<TDocument, bool>> byId,
        string entityLabel,
        CancellationToken ct)
    {
        var exists = await collection.CountDocumentsAsync(byId, cancellationToken: ct) > 0;
        if (!exists)
            throw new NotFoundException($"{entityLabel} introuvable");

        throw new ConflictException(
            $"{entityLabel} modifié entre-temps. Rechargez la page et réessayez.",
            ConcurrencyConflict.Reason);
    }
}
