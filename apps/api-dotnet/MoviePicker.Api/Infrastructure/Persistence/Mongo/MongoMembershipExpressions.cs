using MongoDB.Bson;

namespace MoviePicker.Api.Infrastructure.Persistence.Mongo;

internal static class MongoMembershipExpressions
{
    private const string FilterOperator = "$filter";
    private const string InputField = "input";
    private const string IfNullOperator = "$ifNull";
    private const string InvitationsField = "$invitations";

    public static BsonDocument SeatsLeft(int maxSeats, BsonDateTime latestLapsedAt)
    {
        var pendingInvitations = new BsonDocument(FilterOperator, new BsonDocument
        {
            { InputField, new BsonDocument(IfNullOperator, new BsonArray { InvitationsField, new BsonArray() }) },
            { "as", "invitation" },
            { "cond", new BsonDocument("$gt", new BsonArray { "$$invitation.invitedAt", latestLapsedAt }) }
        });
        var seatsTaken = new BsonDocument("$add", new BsonArray
        {
            1,
            SizeOf("members"),
            new BsonDocument("$size", pendingInvitations)
        });
        return new BsonDocument("$expr", new BsonDocument("$lt", new BsonArray { seatsTaken, maxSeats }));
    }

    public static BsonDocument PendingInvitationMatch(ObjectId user, BsonDateTime latestLapsedAt) =>
        new("$elemMatch", new BsonDocument
        {
            { "userId", user },
            { "invitedAt", new BsonDocument("$gt", latestLapsedAt) }
        });

    public static BsonDocument[] ReplacingInvitationOf(ObjectId user, BsonDocument invitation)
    {
        var otherInvitations = new BsonDocument(FilterOperator, new BsonDocument
        {
            { InputField, new BsonDocument(IfNullOperator, new BsonArray { InvitationsField, new BsonArray() }) },
            { "as", "invitation" },
            { "cond", new BsonDocument("$ne", new BsonArray { "$$invitation.userId", user }) }
        });
        var invitations = new BsonDocument("$concatArrays", new BsonArray
        {
            otherInvitations,
            new BsonArray { invitation }
        });
        return [new("$set", new BsonDocument("invitations", invitations))];
    }

    public static BsonDocument[] WithoutMember(ObjectId user, bool disableInviteLink)
    {
        var otherMembers = new BsonDocument(FilterOperator, new BsonDocument
        {
            { InputField, "$members" },
            { "as", "member" },
            { "cond", new BsonDocument("$ne", new BsonArray { "$$member.userId", user }) }
        });
        var disabledLink = new BsonDocument("$cond", new BsonArray
        {
            new BsonDocument("$eq", new BsonArray { new BsonDocument("$type", "$inviteLink"), "object" }),
            new BsonDocument("$mergeObjects", new BsonArray { "$inviteLink", new BsonDocument("disabled", true) }),
            "$inviteLink"
        });
        var set = new BsonDocument("members", otherMembers);
        if (disableInviteLink)
            set.Add("inviteLink", disabledLink);
        return [new("$set", set)];
    }

    public static BsonDocument SizeOf(string field) =>
        new("$size", new BsonDocument(IfNullOperator, new BsonArray { "$" + field, new BsonArray() }));
}
