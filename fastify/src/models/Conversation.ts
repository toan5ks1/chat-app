import { Schema, model, Document, Model, Types } from 'mongoose';

export interface IConversation extends Document {
  title?: string;
  isGroup: boolean;
  participants: Types.ObjectId[];
  lastMessageAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const conversationSchema = new Schema<IConversation>(
  {
    title: { type: String },
    isGroup: { type: Boolean, default: false },
    participants: [{ type: Schema.Types.ObjectId, ref: 'User', required: true }],
    lastMessageAt: { type: Date }
  },
  {
    timestamps: true
  }
);

conversationSchema.index({ participants: 1 });

export const Conversation: Model<IConversation> = model<IConversation>('Conversation', conversationSchema);
