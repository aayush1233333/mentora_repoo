"""
Mentora – Detector Pool
Manages one FatigueDetector instance per active session.
"""

import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "ai_model"))

from fatigue_detector import FatigueDetector


class DetectorPool:
    """Thread-safe pool of per-session FatigueDetector objects."""

    def __init__(self):
        self._pool: dict[str, FatigueDetector] = {}

    def get(self, session_id: str) -> FatigueDetector:
        if session_id not in self._pool:
            self._pool[session_id] = FatigueDetector()
        return self._pool[session_id]

    def remove(self, session_id: str):
        self._pool.pop(session_id, None)

    def summary(self, session_id: str) -> dict:
        d = self._pool.get(session_id)
        return d.get_session_summary() if d else {}
