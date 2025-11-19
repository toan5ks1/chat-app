import { Schema, model, Document, Model, Types } from 'mongoose';

type Attachment = {
  url: string;
  type: 'image' | 'file';
  name: string;
  size: number;
};

export interface IMessage extends Document {
  conversation: Types.ObjectId;
  sender: Types.ObjectId;
  content?: string;
  attachments: Attachment[];
  createdAt: Date;
  updatedAt: Date;
}

const attachmentSchema = new Schema<Attachment>(
  {
    url: { type: String, required: true },
    type: { type: String, enum: ['image', 'file'], required: true },
    name: { type: String, required: true },
    size: { type: Number, required: true }
  },
  { _id: false }
);

const messageSchema = new Schema<IMessage>(
  {
    conversation: { type: Schema.Types.ObjectId, ref: 'Conversation', required: true, index: true },
    sender: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    content: { type: String },
    attachments: { type: [attachmentSchema], default: [] }
  },
  { timestamps: true }
);

export const Message: Model<IMessage> = model<IMessage>('Message', messageSchema);
