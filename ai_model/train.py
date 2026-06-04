"""
Mentora – Model Training Script
Generates synthetic training data and trains the CNN-LSTM model.

Usage:
  python train.py --epochs 30 --samples 5000

For real training, replace synthetic data with recordings from
the data_collector.py script below.
"""

import argparse
import os
import sys
import numpy as np
import logging

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)

# Feature indices
# [ear, mar, blink_rate_norm, yawn_rate_norm, head_pitch_norm, head_yaw_norm]
FEATURE_DIM = 6
SEQ_LEN     = 30
NUM_CLASSES = 3   # 0=Normal, 1=Stressed, 2=Fatigued
LABELS      = ["Normal", "Stressed", "Fatigued"]


def generate_synthetic_data(n_samples: int = 5000, noise: float = 0.03):
    """
    Generates labelled synthetic sequences based on physiological heuristics.
    Replace or augment with real recorded data for production accuracy.
    """
    X, y = [], []

    for _ in range(n_samples):
        label = np.random.randint(0, NUM_CLASSES)

        if label == 0:  # Normal
            ear  = np.random.normal(0.29, 0.02, SEQ_LEN).clip(0.24, 0.38)
            mar  = np.random.normal(0.40, 0.05, SEQ_LEN).clip(0.20, 0.55)
            br   = np.random.normal(0.45, 0.05, SEQ_LEN).clip(0.20, 0.70)  # ~17 blinks/min
            yr   = np.random.normal(0.10, 0.05, SEQ_LEN).clip(0.0,  0.30)
            pit  = np.random.normal(0.50, 0.05, SEQ_LEN).clip(0.35, 0.65)
            yaw  = np.random.normal(0.50, 0.05, SEQ_LEN).clip(0.35, 0.65)

        elif label == 1:  # Stressed
            ear  = np.random.normal(0.24, 0.02, SEQ_LEN).clip(0.18, 0.30)
            mar  = np.random.normal(0.52, 0.06, SEQ_LEN).clip(0.35, 0.70)
            br   = np.random.normal(0.65, 0.08, SEQ_LEN).clip(0.45, 0.85)  # elevated blink
            yr   = np.random.normal(0.20, 0.07, SEQ_LEN).clip(0.05, 0.40)
            pit  = np.random.normal(0.42, 0.08, SEQ_LEN).clip(0.25, 0.60)
            yaw  = np.random.normal(0.55, 0.08, SEQ_LEN).clip(0.35, 0.75)

        else:  # Fatigued
            ear  = np.random.normal(0.19, 0.02, SEQ_LEN).clip(0.13, 0.24)
            mar  = np.random.normal(0.65, 0.08, SEQ_LEN).clip(0.45, 0.90)
            br   = np.random.normal(0.30, 0.08, SEQ_LEN).clip(0.10, 0.50)  # slow blink
            yr   = np.random.normal(0.55, 0.10, SEQ_LEN).clip(0.30, 0.80)  # frequent yawns
            pit  = np.random.normal(0.35, 0.10, SEQ_LEN).clip(0.15, 0.55)  # head drooping
            yaw  = np.random.normal(0.50, 0.12, SEQ_LEN).clip(0.25, 0.75)

        seq = np.stack([ear, mar, br, yr, pit, yaw], axis=1)
        seq += np.random.normal(0, noise, seq.shape)   # add jitter
        seq = np.clip(seq, 0.0, 1.0)

        X.append(seq)
        y.append(label)

    return np.array(X, dtype=np.float32), np.array(y, dtype=np.int32)


def split_data(X, y, val_ratio=0.15, test_ratio=0.10):
    n     = len(X)
    idx   = np.random.permutation(n)
    n_val = int(n * val_ratio)
    n_tst = int(n * test_ratio)

    tst_idx = idx[:n_tst]
    val_idx = idx[n_tst:n_tst + n_val]
    trn_idx = idx[n_tst + n_val:]

    return (X[trn_idx], y[trn_idx],
            X[val_idx], y[val_idx],
            X[tst_idx], y[tst_idx])


def train(epochs: int = 30, samples: int = 5000, batch_size: int = 64):
    try:
        import tensorflow as tf
        from tensorflow.keras import layers, Model, callbacks
    except ImportError:
        logger.error("TensorFlow not installed. Run: pip install tensorflow")
        sys.exit(1)

    logger.info(f"Generating {samples} synthetic sequences …")
    X, y = generate_synthetic_data(samples)
    X_tr, y_tr, X_val, y_val, X_te, y_te = split_data(X, y)
    logger.info(f"Train: {len(X_tr)}  Val: {len(X_val)}  Test: {len(X_te)}")

    # ── Build model ───────────────────────────────────────────────────────────
    inp = tf.keras.Input(shape=(SEQ_LEN, FEATURE_DIM))

    x = layers.Conv1D(64, 3, activation="relu", padding="same")(inp)
    x = layers.BatchNormalization()(x)
    x = layers.Conv1D(128, 3, activation="relu", padding="same")(x)
    x = layers.BatchNormalization()(x)
    x = layers.MaxPooling1D(2)(x)
    x = layers.Dropout(0.3)(x)

    x = layers.LSTM(128, return_sequences=True)(x)
    x = layers.LSTM(64)(x)
    x = layers.Dropout(0.3)(x)

    x = layers.Dense(64, activation="relu")(x)
    x = layers.BatchNormalization()(x)
    out = layers.Dense(NUM_CLASSES, activation="softmax")(x)

    model = Model(inp, out, name="mentora_cnn_lstm")
    model.compile(
        optimizer=tf.keras.optimizers.Adam(1e-3),
        loss="sparse_categorical_crossentropy",
        metrics=["accuracy"],
    )
    model.summary()

    # ── Callbacks ─────────────────────────────────────────────────────────────
    os.makedirs("weights", exist_ok=True)
    cbs = [
        callbacks.EarlyStopping(patience=5, restore_best_weights=True, verbose=1),
        callbacks.ReduceLROnPlateau(factor=0.5, patience=3, verbose=1),
        callbacks.ModelCheckpoint("weights/cnn_lstm_v1.h5", save_best_only=True, verbose=1),
    ]

    # ── Train ─────────────────────────────────────────────────────────────────
    history = model.fit(
        X_tr, y_tr,
        validation_data=(X_val, y_val),
        epochs=epochs,
        batch_size=batch_size,
        callbacks=cbs,
        verbose=1,
    )

    # ── Evaluate ──────────────────────────────────────────────────────────────
    loss, acc = model.evaluate(X_te, y_te, verbose=0)
    logger.info(f"\n{'='*50}")
    logger.info(f"Test accuracy : {acc:.4f}")
    logger.info(f"Test loss     : {loss:.4f}")

    # Per-class metrics
    from sklearn.metrics import classification_report
    y_pred = np.argmax(model.predict(X_te), axis=1)
    print(classification_report(y_te, y_pred, target_names=LABELS))

    logger.info("Model saved to weights/cnn_lstm_v1.h5")
    return model, history


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Train Mentora CNN-LSTM")
    parser.add_argument("--epochs",  type=int, default=30)
    parser.add_argument("--samples", type=int, default=5000)
    parser.add_argument("--batch",   type=int, default=64)
    args = parser.parse_args()

    train(epochs=args.epochs, samples=args.samples, batch_size=args.batch)
