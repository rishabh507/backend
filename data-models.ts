// src/models/user-preference.model.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class UserPreference extends Document {
  @Prop({ required: true, unique: true })
  userId: string;

  @Prop({ required: true })
  email: string;

  @Prop({
    type: {
      marketing: Boolean,
      newsletter: Boolean,
      updates: Boolean,
      frequency: {
        type: String,
        enum: ['daily', 'weekly', 'monthly', 'never'],
      },
      channels: {
        email: Boolean,
        sms: Boolean,
        push: Boolean,
      },
    },
    required: true,
  })
  preferences: {
    marketing: boolean;
    newsletter: boolean;
    updates: boolean;
    frequency: 'daily' | 'weekly' | 'monthly' | 'never';
    channels: {
      email: boolean;
      sms: boolean;
      push: boolean;
    };
  };

  @Prop({ required: true })
  timezone: string;

  @Prop()
  lastUpdated: Date;

  @Prop()
  createdAt: Date;
}

export const UserPreferenceSchema = SchemaFactory.createForClass(UserPreference);

// src/models/notification-log.model.ts
@Schema({ timestamps: true })
export class NotificationLog extends Document {
  @Prop({ required: true })
  userId: string;

  @Prop({ required: true, enum: ['marketing', 'newsletter', 'updates'] })
  type: 'marketing' | 'newsletter' | 'updates';

  @Prop({ required: true, enum: ['email', 'sms', 'push'] })
  channel: 'email' | 'sms' | 'push';

  @Prop({ required: true, enum: ['pending', 'sent', 'failed'] })
  status: 'pending' | 'sent' | 'failed';

  @Prop()
  sentAt?: Date;

  @Prop()
  failureReason?: string;

  @Prop({ type: Object })
  metadata: Record<string, any>;
}

export const NotificationLogSchema = SchemaFactory.createForClass(NotificationLog);

// src/dto/create-preference.dto.ts
import { IsEmail, IsNotEmpty, IsString, ValidateNested, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';

export class ChannelsDto {
  @IsNotEmpty()
  email: boolean;

  @IsNotEmpty()
  sms: boolean;

  @IsNotEmpty()
  push: boolean;
}

export class PreferencesDto {
  @IsNotEmpty()
  marketing: boolean;

  @IsNotEmpty()
  newsletter: boolean;

  @IsNotEmpty()
  updates: boolean;

  @IsEnum(['daily', 'weekly', 'monthly', 'never'])
  frequency: 'daily' | 'weekly' | 'monthly' | 'never';

  @ValidateNested()
  @Type(() => ChannelsDto)
  channels: ChannelsDto;
}

export class CreatePreferenceDto {
  @IsString()
  @IsNotEmpty()
  userId: string;

  @IsEmail()
  email: string;

  @ValidateNested()
  @Type(() => PreferencesDto)
  preferences: PreferencesDto;

  @IsString()
  @IsNotEmpty()
  timezone: string;
}

// src/dto/send-notification.dto.ts
export class NotificationContentDto {
  @IsString()
  @IsNotEmpty()
  subject: string;

  @IsString()
  @IsNotEmpty()
  body: string;
}

export class SendNotificationDto {
  @IsString()
  @IsNotEmpty()
  userId: string;

  @IsEnum(['marketing', 'newsletter', 'updates'])
  type: 'marketing' | 'newsletter' | 'updates';

  @IsEnum(['email', 'sms', 'push'])
  channel: 'email' | 'sms' | 'push';

  @ValidateNested()
  @Type(() => NotificationContentDto)
  content: NotificationContentDto;
}
