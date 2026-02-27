import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IVoteDoc extends Document {
  eventId: mongoose.Types.ObjectId;
  movieId: mongoose.Types.ObjectId;
  participantId: mongoose.Types.ObjectId;
  value: 1 | -1; // upvote = 1, downvote = -1
  createdAt: Date;
  updatedAt: Date;
}

const VoteSchema = new Schema<IVoteDoc>(
  {
    eventId: { type: Schema.Types.ObjectId, ref: 'Event', required: true },
    movieId: { type: Schema.Types.ObjectId, ref: 'Movie', required: true },
    participantId: { type: Schema.Types.ObjectId, ref: 'Participant', required: true },
    value: { type: Number, required: true, enum: [1, -1] },
  },
  { timestamps: true }
);

VoteSchema.index({ movieId: 1, participantId: 1 }, { unique: true });

export const Vote: Model<IVoteDoc> = mongoose.model<IVoteDoc>('Vote', VoteSchema);
