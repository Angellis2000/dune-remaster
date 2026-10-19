"""Video-only portrait matting with RVM recurrent ONNX states, then lossless RGBA frames.

Model: https://github.com/PeterL1n/RobustVideoMatting (official v1.0.0 MobileNetV3 FP32).
The model is an offline build dependency; it is never shipped in the game.
"""
import argparse
import hashlib
import json
from pathlib import Path
from urllib.request import urlretrieve

import cv2
import numpy as np
import onnxruntime as ort

root = Path(__file__).resolve().parent.parent
parser = argparse.ArgumentParser()
parser.add_argument("--input", type=Path, default=Path("C:/Users/Admin/Downloads/gemini_generated_video_29a1a161.mp4"))
parser.add_argument("--limit", type=int, default=0)
args = parser.parse_args()
model = root / "scratch/models/rvm_mobilenetv3_fp32.onnx"
expected = "88d4531297118f595bf2fd60f6f566aec2e559393802d1f436c380f0cbbd2828"
if not model.exists():
    model.parent.mkdir(parents=True, exist_ok=True)
    temporary = model.with_suffix(".download")
    urlretrieve("https://github.com/PeterL1n/RobustVideoMatting/releases/download/v1.0.0/rvm_mobilenetv3_fp32.onnx", temporary)
    if hashlib.sha256(temporary.read_bytes()).hexdigest() != expected:
        raise RuntimeError("Downloaded RVM model checksum mismatch")
    temporary.replace(model)
if hashlib.sha256(model.read_bytes()).hexdigest() != expected:
    raise RuntimeError("Unexpected RVM model checksum")
options = ort.SessionOptions()
options.intra_op_num_threads = 4
options.inter_op_num_threads = 1
session = ort.InferenceSession(str(model), sess_options=options, providers=["CPUExecutionProvider"])
states = [np.zeros((1, 1, 1, 1), dtype=np.float32) for _ in range(4)]
ratio = np.array([1.0], dtype=np.float32)
out = root / "scratch/mentat-ordos-video/frames"
out.mkdir(parents=True, exist_ok=True)
reader = cv2.VideoCapture(str(args.input))
count = 0
face_min = 255
while True:
    ok, frame = reader.read()
    if not ok or (args.limit and count >= args.limit):
        break
    rgb = cv2.cvtColor(cv2.resize(frame[:, 160:1120], (512, 384), interpolation=cv2.INTER_AREA), cv2.COLOR_BGR2RGB)
    src = np.ascontiguousarray(rgb.transpose(2, 0, 1)[None], dtype=np.float32) / 255.0
    # Settle the recurrent mask on the first pose before producing visible frames.
    for _ in range(8 if count == 0 else 1):
        fgr, pha, *states = session.run(None, dict(src=src, r1i=states[0], r2i=states[1], r3i=states[2], r4i=states[3], downsample_ratio=ratio))
    alpha = np.clip((pha[0, 0] - 0.02) / 0.96, 0, 1)
    corrected = np.clip(fgr[0].transpose(1, 2, 0) * 255, 0, 255)
    # Keep original skin, cloth and jewellery; foreground correction is for the edge only.
    foreground = np.where((alpha >= 0.95)[..., None], rgb, corrected).astype(np.uint8)
    rgba = np.dstack((foreground, np.rint(alpha * 255).astype(np.uint8)))
    if not cv2.imwrite(str(out / f"cutout-{count:04d}.png"), cv2.cvtColor(rgba, cv2.COLOR_RGBA2BGRA)):
        raise RuntimeError("Could not save RGBA frame")
    face_min = min(face_min, int(rgba[110:180, 240:280, 3].min()))
    count += 1
    if count % 48 == 0:
        print(f"Matted {count} frames", flush=True)
reader.release()
(out.parent / "matte-info.json").write_text(json.dumps(dict(frames=count, face_min_alpha=face_min, model_sha256=expected), indent=2), encoding="utf8")
print(f"Saved {count} RGBA video frames; face alpha minimum {face_min}", flush=True)
