namespace MoviePicker.Api.Infrastructure.Persistence.Mongo;

/// <summary>Codes d'erreur serveur MongoDB utilisés dans la couche persistence.</summary>
internal static class MongoErrorCodes
{
    /// <summary>DropIndex sur un index qui n'existe pas.</summary>
    public const int IndexNotFound = 27;
}
