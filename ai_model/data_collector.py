"""
Mentora – Data Collector
Records labelled sessions to build a real training dataset.

Usage:
    python data_collector.py --label normal  --duration 120
    python data_collector.py --label stressed --duration 120
    python data_collector.py --label fatigued --duration 120

Controls during recording:
    Q  – quit early
    P  – pause / resume
"""

import cv2
import time
import argparse
import numpy as np
import os
import json

from fatigue_detector import FatigueDetector

LABEL_MAP = {"normal": 0, "stressed": 1, "fatigued": 2}
DATA_DIR  = os.path.join(os.path.dirname(__file__), "data")


def collect(label: str, duration: int = 120, fps: int = 10):
    if label not in LABEL_MAP:
        raise ValueError(f"label must be one of {list(LABEL_MAP)}")

    os.makedirs(DATA_DIR, exist_ok=True)
    detector = FatigueDetector()
    cap      = cv2.VideoCapture(0)

    if not cap.isOpened():
        raise RuntimeError("Cannot open webcam")

    sequences, labels = [], []
    current_seq  = []
    seq_len      = 30
    paused       = False
    start_time   = time.time()

    print(f"\n Recording label='{label}' for {duration}s. Press Q to quit, P to pause.\n")

    while True:
        ret, frame = cap.read()
        if not ret:
            break

        elapsed = time.time() - start_time
        if elapsed >= duration:
            break

        key = cv2.waitKey(1) & 0xFF
        if key == ord('q'):
            break
        if key == ord('p'):
            paused = not paused
            print("PAUSED" if paused else "RESUMED")

        if paused:
            continue

        result = detector.process_frame(frame)
        if not result["landmarks_detected"]:
            continue

        # Build feature vector
        elapsed_min  = max(elapsed / 60, 0.01)
        blink_norm   = min(result["blink_count"] / elapsed_min / 30, 1.0)
        yawn_norm    = min(result["yawn_count"]  / elapsed_min / 5,  1.0)
        fv = [
            result["ear"],
            result["mar"],
            blink_norm,
            yawn_norm,
            0.5,   # placeholder for head_pitch
            0.5,   # placeholder for head_yaw
        ]
        current_seq.append(fv)

        if len(current_seq) == seq_len:
            sequences.append(current_seq.copy())
            labels.append(LABEL_MAP[label])
            current_seq.pop(0)   # sliding window

        # Overlay on frame
        cv2.putText(frame, f"Label: {label.upper()}  |  Score: {result['fatigue_score']:.1f}  |  {elapsed:.0f}/{duration}s",
                    (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 120), 2)
        cv2.putText(frame, f"Sequences collected: {len(sequences)}",
                    (10, 60), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (200, 200, 200), 1)
        cv2.imshow("Mentora Data Collector", frame)

    cap.release()
    cv2.destroyAllWindows()

    if not sequences:
        print("No sequences collected.")
        return

    X = np.array(sequences, dtype=np.float32)
    y = np.array(labels,    dtype=np.int32)

    timestamp = time.strftime("%Y%m%d_%H%M%S")
    fname     = os.path.join(DATA_DIR, f"{label}_{timestamp}.npz")
    np.savez(fname, X=X, y=y)
    print(f"\nSaved {len(sequences)} sequences → {fname}")

    # Update manifest
    manifest_path = os.path.join(DATA_DIR, "manifest.json")
    manifest = json.load(open(manifest_path)) if os.path.exists(manifest_path) else {"files": []}
    manifest["files"].append({"path": fname, "label": label, "count": len(sequences)})
    json.dump(manifest, open(manifest_path, "w"), indent=2)


def merge_dataset():
    """Merge all .npz files in data/ into a single X.npy / y.npy for training."""
    manifest_path = os.path.join(DATA_DIR, "manifest.json")
    if not os.path.exists(manifest_path):
        print("No manifest found. Collect data first.")
        return

    manifest = json.load(open(manifest_path))
    all_X, all_y = [], []
    for entry in manifest["files"]:
        data = np.load(entry["path"])
        all_X.append(data["X"])
        all_y.append(data["y"])
        print(f"  Loaded {entry['count']} sequences ({entry['label']}) from {entry['path']}")

    X = np.concatenate(all_X, axis=0)
    y = np.concatenate(all_y, axis=0)

    # Shuffle
    idx = np.random.permutation(len(X))
    X, y = X[idx], y[idx]

    np.save(os.path.join(DATA_DIR, "X.npy"), X)
    np.save(os.path.join(DATA_DIR, "y.npy"), y)
    print(f"\nMerged dataset: {X.shape}  →  data/X.npy, data/y.npy")
    print(f"Class distribution: {dict(zip(*np.unique(y, return_counts=True)))}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--label",    choices=["normal","stressed","fatigued"], default="normal")
    parser.add_argument("--duration", type=int, default=120, help="Recording duration in seconds")
    parser.add_argument("--merge",    action="store_true", help="Merge collected files into dataset")
    args = parser.parse_args()

    if args.merge:
        merge_dataset()
    else:
        collect(args.label, args.duration)
