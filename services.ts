// src/services/preferences.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { UserPreference } from '../models/user-preference.model';
import { CreatePreferenceDto } from '../dto/create-preference.dto';

@Injectable()
export class PreferencesService {
  constructor(
    @InjectModel(UserPreference.name)
    private userPreferenceModel: Model<UserPreference>,
  ) {}

  async create(createPreferenceDto: CreatePreferenceDto): Promise<UserPreference> {
    const createdPreference = new this.userPreferenceModel({
      ...createPreferenceDto,
      lastUpdated: new Date(),
    });
    return createdPreference.save();
  }

  async findOne(userId: string): Promise<UserPreference> {
    const preference = await this.userPreferenceModel.findOne({ userId }).exec();
    if (!preference) {
      throw new NotFoundException(`User preferences not found for userId ${userId}`);
    }
    return preference;
  }

  async update(userId: string, updateData: Partial<CreatePreferenceDto>): Promise<UserPreference> {
    const preference = await this.userPreferenceModel
      .findOneAndUpdate(
        { userId },
        { ...updateData, lastUpdated: new Date() },
        { new: true },
      )
      .exec();
    
    if (!preference) {
      throw new NotFoundException(`User preferences not found for userId ${userId}`);
    }
    return preference;
  }

  async remove(userId: string): Promise<void> {
    const result = await this.userPreferenceModel.deleteOne({ userId }).exec();
    if (result.deletedCount === 0) {
      throw new NotFoundException(`User preferences not found for userId ${userId}`);
    }
  }
}

// src/services/notifications.service.ts
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { NotificationLog } from '../models/notification-log.model';
import { SendNotificationDto } from '../dto/send-notification.dto';
import { PreferencesService } from './preferences.service';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectModel(NotificationLog.name)
    private notificationLogModel: Model<NotificationLog>,
    private preferencesService: PreferencesService,
  ) {}

  async send(sendNotificationDto: SendNotificationDto): Promise<NotificationLog> {
    // Check user preferences
    const preferences = await this.preferencesService.findOne(sendNotificationDto.userId);
    
    // Verify if user has enabled this type of notification
    if (!preferences.preferences[sendNotificationDto.type]) {
      throw new Error(`User has disabled ${sendNotificationDto.type} notifications`);
    }

    // Verify if user has enabled this channel
    if (!preferences.preferences.channels[sendNotificationDto.channel]) {
      throw new Error(`User has disabled ${sendNotificationDto.channel} notifications`);
    }

    // Simulate notification sending (would integrate with actual notification service)
    const success = Math.random() > 0.1; // 90% success rate simulation

    const log = new this.notificationLogModel({
      userId: sendNotificationDto.userId,
      type: sendNotificationDto.type,
      channel: sendNotificationDto.channel,
      status: success ? 'sent' : 'failed',
      sentAt: success ? new Date() : undefined,
      failureReason: success ? undefined : 'Simulated failure',
      metadata: {
        content: sendNotificationDto.content,
        attemptedAt: new Date(),
      },
    });

    return log.save();
  }

  async getLogs(userId: string): Promise<NotificationLog[]> {
    return this.notificationLogModel
      .find({ userId })
      .sort({ createdAt: -1 })
      .exec();
  }

  async getStats() {
    const [total, sent, failed] = await Promise.all([
      this.notificationLogModel.countDocuments(),
      this.notificationLogModel.countDocuments({ status: 'sent' }),
      this.notificationLogModel.countDocuments({ status: 'failed' }),
    ]);

    const channelStats = await this.notificationLogModel.aggregate([
      {
        $group: {
          _id: '$channel',
          count: { $sum: 1 },
          successCount: {
            $sum: { $cond: [{ $eq: ['$status', 'sent'] }, 1, 0] },
          },
        },
      },
    ]);

    return {
      total,
      sent,
      failed,
      successRate: (sent / total) * 100,
      channelStats: channelStats.reduce((acc, stat) => ({
        ...acc,
        [stat._id]: {
          total: stat.count,
          successful: stat.successCount,
          rate: (stat.successCount / stat.count) * 100,
        },
      }), {}),
    };
  }
}
