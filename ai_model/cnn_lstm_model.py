"""
Mentora – CNN-LSTM Fatigue Model
Architecture: Temporal CNN → LSTM → Dense classification head
"""

import numpy as np
import os
import logging
from typing import Optional, Tuple

logger = logging.getLogger(__name__)

# ── Feature vector layout ─────────────────────────────────────────────────────
# [ear, mar, blink_rate_norm, yawn_rate_norm, head_pitch, head_yaw]
FEATURE_DIM  = 6
SEQ_LEN      = 30   # 30 frames (≈1 s at 30 fps)
NUM_CLASSES  = 3    # Normal, Stressed, Fatigued

# ── TensorFlow model (lazy import to keep startup fast) ───────────────────────

def build_cnn_lstm(seq_len: int = SEQ_LEN, feature_dim: int = FEATURE_DIM,
                   num_classes: int = NUM_CLASSES):
    """Returns a compiled Keras CNN-LSTM model."""
    try:
        import tensorflow as tf
        from tensorflow.keras import layers, Model

        inp = tf.keras.Input(shape=(seq_len, feature_dim), name="sequence_input")

        # Temporal CNN block
        x = layers.Conv1D(64, 3, activation="relu", padding="same")(inp)
        x = layers.BatchNormalization()(x)
        x = layers.Conv1D(128, 3, activation="relu", padding="same")(x)
        x = layers.BatchNormalization()(x)
        x = layers.MaxPooling1D(2)(x)
        x = layers.Dropout(0.3)(x)

        # LSTM block
        x = layers.LSTM(128, return_sequences=True)(x)
        x = layers.LSTM(64)(x)
        x = layers.Dropout(0.3)(x)

        # Dense head
        x = layers.Dense(64, activation="relu")(x)
        x = layers.BatchNormalization()(x)
        out = layers.Dense(num_classes, activation="softmax", name="state_output")(x)

        model = Model(inp, out, name="mentora_cnn_lstm")
        model.compile(
            optimizer=tf.keras.optimizers.Adam(1e-3),
            loss="sparse_categorical_crossentropy",
            metrics=["accuracy"],
        )
        return model
    except ImportError:
        logger.warning("TensorFlow not installed – using rule-based fallback.")
        return None


class FatigueModel:
    """
    Wraps the CNN-LSTM.  Falls back gracefully to rule-based scoring when
    TensorFlow / a saved checkpoint are unavailable.
    """

    LABELS = ["Normal", "Stressed", "Fatigued"]
    WEIGHTS_PATH = os.path.join(os.path.dirname(__file__), "weights", "cnn_lstm_v1.h5")

    def __init__(self):
        self.model  = None
        self.seq_buf: list = []
        self._try_load()

    def _try_load(self):
        if not os.path.exists(self.WEIGHTS_PATH):
            logger.info("No saved weights found – rule-based mode active.")
            return
        m = build_cnn_lstm()
        if m is None:
            return
        try:
            m.load_weights(self.WEIGHTS_PATH)
            self.model = m
            logger.info("CNN-LSTM weights loaded ✓")
        except Exception as e:
            logger.warning(f"Could not load weights: {e}")

    def predict(self, feature_vec: np.ndarray) -> Tuple[str, float]:
        """
        Args:
            feature_vec: shape (FEATURE_DIM,) – latest feature snapshot

        Returns:
            (state_label, confidence)
        """
        self.seq_buf.append(feature_vec.tolist())
        if len(self.seq_buf) > SEQ_LEN:
            self.seq_buf.pop(0)

        if self.model is not None and len(self.seq_buf) == SEQ_LEN:
            seq = np.expand_dims(np.array(self.seq_buf, dtype=np.float32), 0)
            probs = self.model.predict(seq, verbose=0)[0]
            idx   = int(np.argmax(probs))
            return self.LABELS[idx], float(probs[idx])

        # ── Rule-based fallback ───────────────────────────────────────────────
        return self._rule_based(feature_vec)

    @staticmethod
    def _rule_based(fv: np.ndarray) -> Tuple[str, float]:
        ear, mar = fv[0], fv[1]
        if ear < 0.20:
            return "Fatigued", 0.85
        if mar > 0.65:
            return "Stressed", 0.75
        if ear < 0.24:
            return "Stressed", 0.60
        return "Normal", 0.90

    def train(self, X: np.ndarray, y: np.ndarray, epochs: int = 20, batch_size: int = 32):
        """Fine-tune or train from scratch on labelled sequences."""
        m = build_cnn_lstm()
        if m is None:
            logger.error("TensorFlow unavailable – cannot train.")
            return
        os.makedirs(os.path.dirname(self.WEIGHTS_PATH), exist_ok=True)
        m.fit(X, y, epochs=epochs, batch_size=batch_size,
              validation_split=0.15, verbose=1)
        m.save_weights(self.WEIGHTS_PATH)
        self.model = m
        logger.info(f"Model trained and saved to {self.WEIGHTS_PATH}")

    def reset_sequence(self):
        self.seq_buf.clear()
