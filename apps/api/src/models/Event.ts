import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IEventConfig {
  theme?: string;
  endDate?: Date;
  maxProposalsPerParticipant?: number;
}

export interface IEventDoc extends Document {
  title: string;
  date: string;   // YYYY-MM-DD
  time: string;   // HH:mm
  hostToken: string;
  slug: string;
  config?: IEventConfig;
  closedAt?: Date;
  winnerMovieId?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const EventSchema = new Schema<IEventDoc>(
  {
    title: { type: String, required: true, trim: true },
    date: { type: String, required: true },
    time: { type: String, required: true },
    hostToken: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    config: { type: Schema.Types.Mixed },
    closedAt: { type: Date },
    winnerMovieId: { type: Schema.Types.ObjectId, ref: 'Movie' },
  },
  { timestamps: true }
);

EventSchema.index({ slug: 1 });

export const Event: Model<IEventDoc> = mongoose.model<IEventDoc>('Event', EventSchema);
