"""Create a forward-playing planet loop with an optical-flow seam.

python tools/prepare-planet-loop.py SOURCE.mp4 OUTPUT.mp4
Requires ffmpeg, OpenCV and NumPy. Source stays untouched; output is silent H.264.
"""
import argparse
import json
from pathlib import Path
import subprocess

import cv2
import numpy as np


def prepare(source: Path, destination: Path, overlap_seconds: float = 4.0) -> None:
    cap = cv2.VideoCapture(str(source))
    if not cap.isOpened():
        raise ValueError(f"Cannot open {source}")
    fps = cap.get(cv2.CAP_PROP_FPS)
    count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    width, height = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH)), int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    overlap = round(fps * overlap_seconds)
    if count < overlap * 3:
        raise ValueError("Clip must be longer than three overlaps")
    destination.parent.mkdir(parents=True, exist_ok=True)
    # Inspect every decoded frame, rather than trusting frame-count metadata.
    samples = []
    while True:
        ok, frame = cap.read()
        if not ok:
            break
        samples.append(cv2.resize(frame, (160, 90), interpolation=cv2.INTER_AREA))
    if len(samples) != count:
        raise ValueError(f"Decoded {len(samples)} frames, metadata says {count}")
    small = np.asarray(samples, dtype=np.float32)
    adjacent = np.mean(np.abs(small[1:] - small[:-1]), axis=(1, 2, 3))
    flow_width, flow_height = width // 2, height // 2
    yy, xx = np.mgrid[:height, :width].astype(np.float32)
    # Mask only the planet's surface. The starfield blends without rubber-like warping.
    radius = width * .167
    mask = np.clip((radius + 8 - np.hypot(xx-width*.625, yy-height*.49)) / 16, 0, 1)
    log_path = destination.with_suffix('.encode.log')
    with log_path.open('w', encoding='utf-8') as log:
        encoder = subprocess.Popen([
            'ffmpeg', '-hide_banner', '-loglevel', 'error', '-y',
            '-f', 'rawvideo', '-pix_fmt', 'bgr24', '-s', f'{width}x{height}', '-r', str(fps), '-i', 'pipe:0',
            '-an', '-c:v', 'libx264', '-preset', 'medium', '-crf', '20', '-pix_fmt', 'yuv420p',
            '-movflags', '+faststart', str(destination),
        ], stdin=subprocess.PIPE, stderr=log)
        try:
            cap.set(cv2.CAP_PROP_POS_FRAMES, overlap)
            for _ in range(overlap, count-overlap):
                ok, frame = cap.read()
                if not ok:
                    raise ValueError('Body decode failed')
                encoder.stdin.write(frame.tobytes())
            head = cv2.VideoCapture(str(source))
            for i in range(overlap):
                ok_a, tail_frame = cap.read()
                ok_b, head_frame = head.read()
                if not ok_a or not ok_b:
                    raise ValueError('Seam decode failed')
                a = cv2.cvtColor(cv2.resize(tail_frame, (flow_width, flow_height)), cv2.COLOR_BGR2GRAY)
                b = cv2.cvtColor(cv2.resize(head_frame, (flow_width, flow_height)), cv2.COLOR_BGR2GRAY)
                forward = cv2.calcOpticalFlowFarneback(a, b, None, .5, 5, 25, 6, 7, 1.5, 0)
                backward = cv2.calcOpticalFlowFarneback(b, a, None, .5, 5, 25, 6, 7, 1.5, 0)
                f = cv2.resize(cv2.GaussianBlur(forward, (7, 7), 0), (width, height)) * 2 * mask[..., None]
                r = cv2.resize(cv2.GaussianBlur(backward, (7, 7), 0), (width, height)) * 2 * mask[..., None]
                t = i / (overlap-1)
                weight = t*t*(3-2*t)
                warped_a = cv2.remap(tail_frame, xx-weight*f[..., 0], yy-weight*f[..., 1], cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT)
                warped_b = cv2.remap(head_frame, xx-(1-weight)*r[..., 0], yy-(1-weight)*r[..., 1], cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT)
                blended = cv2.addWeighted(warped_a, 1-weight, warped_b, weight, 0)
                encoder.stdin.write(blended.tobytes())
            head.release()
        finally:
            cap.release()
            encoder.stdin.close()
        if encoder.wait() != 0:
            raise RuntimeError(f"Encoding failed; see {log_path}")
    report = {
        'sourceFrames': count, 'fps': fps, 'outputFrames': count-overlap,
        'outputSeconds': (count-overlap)/fps, 'overlapFrames': overlap,
        'sourceAdjacentMedian': float(np.median(adjacent)),
        'sourceDirectSeam': float(np.mean(np.abs(small[-1]-small[0]))),
        'method': 'forward playback, smoothstep bidirectional optical-flow overlap; no ping-pong',
    }
    destination.with_suffix('.analysis.json').write_text(json.dumps(report, indent=2), encoding='utf-8')
    print(json.dumps(report))


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('source', type=Path)
    parser.add_argument('destination', type=Path)
    args = parser.parse_args()
    prepare(args.source, args.destination)
