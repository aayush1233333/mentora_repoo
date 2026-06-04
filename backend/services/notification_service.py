"""
Mentora – FCM Notification Service
Sends push notifications via Firebase Cloud Messaging when fatigue thresholds are crossed.
"""

import os
import logging
from typing import Optional

logger = logging.getLogger(__name__)

THRESHOLDS = {
    "stressed": 35,
    "fatigued": 65,
}


class NotificationService:
    """Wraps Firebase Admin SDK's messaging module."""

    def __init__(self):
        self._available = False
        try:
            from firebase_admin import messaging as _m
            self._messaging = _m
            self._available = True
        except ImportError:
            logger.warning("firebase_admin not installed – FCM disabled.")

    def send_fatigue_alert(self, fcm_token: str, fatigue_score: float, state: str) -> bool:
        """
        Sends a push notification if state warrants it.
        Returns True if sent successfully.
        """
        if not self._available or not fcm_token:
            return False

        if state == "Fatigued" and fatigue_score >= THRESHOLDS["fatigued"]:
            title = "⚠️  High Fatigue Detected"
            body  = f"Your fatigue score is {fatigue_score:.0f}/100. Time for a proper break!"
            color = "#ef4444"
        elif state == "Stressed" and fatigue_score >= THRESHOLDS["stressed"]:
            title = "😤  Stress Building Up"
            body  = f"Stress level at {fatigue_score:.0f}/100. Try a 4-7-8 breathing exercise."
            color = "#f59e0b"
        else:
            return False

        message = self._messaging.Message(
            notification=self._messaging.Notification(title=title, body=body),
            data={
                "fatigue_score": str(fatigue_score),
                "state":         state,
                "click_action":  "FLUTTER_NOTIFICATION_CLICK",
            },
            android=self._messaging.AndroidConfig(
                notification=self._messaging.AndroidNotification(color=color),
            ),
            apns=self._messaging.APNSConfig(
                payload=self._messaging.APNSPayload(
                    aps=self._messaging.Aps(badge=1, sound="default")
                )
            ),
            token=fcm_token,
        )

        try:
            response = self._messaging.send(message)
            logger.info(f"FCM sent: {response}")
            return True
        except Exception as e:
            logger.error(f"FCM send failed: {e}")
            return False

    def send_break_reminder(self, fcm_token: str, session_minutes: float) -> bool:
        """Periodic break reminder (every 45–50 min)."""
        if not self._available or not fcm_token:
            return False

        message = self._messaging.Message(
            notification=self._messaging.Notification(
                title="🕐  Break Time",
                body=f"You've been focused for {session_minutes:.0f} minutes. A 5-min break helps retention!",
            ),
            token=fcm_token,
        )
        try:
            self._messaging.send(message)
            return True
        except Exception as e:
            logger.error(f"FCM break reminder failed: {e}")
            return False
