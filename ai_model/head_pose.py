"""
Mentora – Head Pose Estimator
Estimates pitch (nodding) and yaw (turning) from MediaPipe face landmarks.
Used as additional fatigue features — drooping head = fatigued.
"""

import numpy as np
import cv2
from typing import Tuple

# Reference 3D model points (canonical face model in mm)
MODEL_POINTS = np.array([
    (0.0,    0.0,    0.0),     # Nose tip              (index 1)
    (0.0,   -330.0, -65.0),    # Chin                  (index 152)
    (-225.0, 170.0, -135.0),   # Left eye outer corner (index 263)
    (225.0,  170.0, -135.0),   # Right eye outer corner(index 33)
    (-150.0,-150.0, -125.0),   # Left mouth corner     (index 287)
    (150.0, -150.0, -125.0),   # Right mouth corner    (index 57)
], dtype=np.float64)

# Corresponding MediaPipe landmark indices
LM_INDICES = [1, 152, 263, 33, 287, 57]


class HeadPoseEstimator:
    """
    Estimates Euler angles (pitch, yaw, roll) from a MediaPipe FaceLandmarks object.

    pitch > 0  → head tilted up
    pitch < 0  → head drooping down (fatigue signal)
    yaw   > 0  → head turned right
    yaw   < 0  → head turned left
    """

    def __init__(self, frame_w: int = 640, frame_h: int = 480):
        focal  = frame_w
        center = (frame_w / 2, frame_h / 2)
        self.cam_matrix = np.array([
            [focal,  0,      center[0]],
            [0,      focal,  center[1]],
            [0,      0,      1         ],
        ], dtype=np.float64)
        self.dist_coeffs = np.zeros((4, 1), dtype=np.float64)
        self.frame_w = frame_w
        self.frame_h = frame_h

    def estimate(self, landmarks) -> Tuple[float, float, float]:
        """
        Args:
            landmarks: list of MediaPipe NormalizedLandmark objects

        Returns:
            (pitch_deg, yaw_deg, roll_deg) in degrees
            Returns (0, 0, 0) if estimation fails
        """
        try:
            image_points = np.array([
                (landmarks[i].x * self.frame_w, landmarks[i].y * self.frame_h)
                for i in LM_INDICES
            ], dtype=np.float64)

            success, rvec, tvec = cv2.solvePnP(
                MODEL_POINTS,
                image_points,
                self.cam_matrix,
                self.dist_coeffs,
                flags=cv2.SOLVEPNP_ITERATIVE,
            )

            if not success:
                return (0.0, 0.0, 0.0)

            rmat, _ = cv2.Rodrigues(rvec)
            angles, _, _, _, _, _ = cv2.RQDecomp3x3(rmat)

            pitch = float(angles[0])  # nodding (negative = drooping)
            yaw   = float(angles[1])  # turning
            roll  = float(angles[2])  # tilting

            return (pitch, yaw, roll)

        except Exception:
            return (0.0, 0.0, 0.0)

    def normalise_for_model(self, pitch: float, yaw: float) -> Tuple[float, float]:
        """
        Normalises pitch and yaw to [0, 1] range for the CNN-LSTM feature vector.
        pitch_norm = 0 → head down (fatigued), 1 → head up (alert)
        yaw_norm   = 0 → hard left, 0.5 → centre, 1 → hard right
        """
        pitch_norm = np.clip((pitch + 30) / 60, 0.0, 1.0)
        yaw_norm   = np.clip((yaw   + 45) / 90, 0.0, 1.0)
        return float(pitch_norm), float(yaw_norm)
