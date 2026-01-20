import * as Notifications from 'expo-notifications';
import { ScheduledEvent } from '@/types';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export const requestNotificationPermissions = async (): Promise<boolean> => {
  console.log('[Notifications] Requesting permissions...');
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    console.log('[Notifications] Existing status:', existingStatus);
    
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
      console.log('[Notifications] New status:', finalStatus);
    }
    
    if (finalStatus !== 'granted') {
      console.log('[Notifications] Permission denied');
      return false;
    }
    
    console.log('[Notifications] Permission granted');
    return true;
  } catch (error) {
    console.error('[Notifications] Error requesting permissions:', error);
    return false;
  }
};

export const scheduleEventNotifications = async (event: ScheduledEvent) => {
  console.log('[Notifications] Scheduling notifications for event:', event.id);
  try {
    const eventDate = new Date(event.scheduledDate + 'T09:00:00');
    const now = new Date();

    const dayBeforeDate = new Date(eventDate);
    dayBeforeDate.setDate(dayBeforeDate.getDate() - 1);
    dayBeforeDate.setHours(18, 0, 0, 0);

    const oneHourBeforeDate = new Date(eventDate);
    oneHourBeforeDate.setHours(eventDate.getHours() - 1);

    const notificationIds: string[] = [];

    if (dayBeforeDate > now) {
      console.log('[Notifications] Scheduling day-before notification for:', dayBeforeDate);
      const secondsUntil = Math.floor((dayBeforeDate.getTime() - now.getTime()) / 1000);
      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Rappel: Contrôle demain',
          body: event.title,
          data: { eventId: event.id, type: 'day_before' },
        },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: secondsUntil, repeats: false },
      });
      notificationIds.push(id);
    }

    if (oneHourBeforeDate > now) {
      console.log('[Notifications] Scheduling 1-hour-before notification for:', oneHourBeforeDate);
      const secondsUntil = Math.floor((oneHourBeforeDate.getTime() - now.getTime()) / 1000);
      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Contrôle dans 1 heure',
          body: event.title,
          data: { eventId: event.id, type: 'one_hour_before' },
        },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: secondsUntil, repeats: false },
      });
      notificationIds.push(id);
    }

    console.log('[Notifications] Scheduled notifications:', notificationIds);
    return notificationIds;
  } catch (error) {
    console.error('[Notifications] Error scheduling notifications:', error);
    return [];
  }
};

export const cancelEventNotifications = async (eventId: string) => {
  console.log('[Notifications] Cancelling notifications for event:', eventId);
  try {
    const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
    
    for (const notification of scheduledNotifications) {
      if (notification.content.data?.eventId === eventId) {
        await Notifications.cancelScheduledNotificationAsync(notification.identifier);
        console.log('[Notifications] Cancelled notification:', notification.identifier);
      }
    }
  } catch (error) {
    console.error('[Notifications] Error cancelling notifications:', error);
  }
};

export const getAllScheduledNotifications = async () => {
  try {
    return await Notifications.getAllScheduledNotificationsAsync();
  } catch (error) {
    console.error('[Notifications] Error getting scheduled notifications:', error);
    return [];
  }
};

export const cancelAllNotifications = async () => {
  console.log('[Notifications] Cancelling all notifications');
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    console.log('[Notifications] All notifications cancelled');
  } catch (error) {
    console.error('[Notifications] Error cancelling all notifications:', error);
  }
};
