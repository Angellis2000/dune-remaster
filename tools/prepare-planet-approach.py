"""Match the last second of a starfield approach to the rotating planet loop.

python tools/prepare-planet-approach.py APPROACH_SOURCE ORBIT_SOURCE OUTPUT
The loop made by prepare-planet-loop.py starts at orbit source frame 96.
"""
import argparse
import json
from pathlib import Path
import subprocess

import cv2
import numpy as np


def prepare(source: Path, orbit: Path, output: Path) -> None:
    cap=cv2.VideoCapture(str(source))
    fps=cap.get(cv2.CAP_PROP_FPS)
    count=int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    width,height=int(cap.get(cv2.CAP_PROP_FRAME_WIDTH)),int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    overlap=round(fps)
    rotation=cv2.VideoCapture(str(orbit))
    rotation.set(cv2.CAP_PROP_POS_FRAMES,96-overlap)
    yy,xx=np.mgrid[:height,:width].astype(np.float32)
    output.parent.mkdir(parents=True,exist_ok=True)
    seen=0
    with output.with_suffix('.encode.log').open('w',encoding='utf-8') as log:
        encoder=subprocess.Popen(['ffmpeg','-hide_banner','-loglevel','error','-y','-f','rawvideo','-pix_fmt','bgr24','-s',f'{width}x{height}','-r',str(fps),'-i','pipe:0','-an','-c:v','libx264','-preset','medium','-crf','20','-pix_fmt','yuv420p','-movflags','+faststart',str(output)],stdin=subprocess.PIPE,stderr=log)
        try:
            for frame in range(count):
                ok,image=cap.read()
                if not ok:raise ValueError(f'Missing approach frame {frame}')
                seen+=1
                if frame>=count-overlap:
                    ok,head=rotation.read()
                    if not ok:raise ValueError('Missing rotation match frame')
                    a=cv2.cvtColor(cv2.resize(image,(width//2,height//2)),cv2.COLOR_BGR2GRAY)
                    b=cv2.cvtColor(cv2.resize(head,(width//2,height//2)),cv2.COLOR_BGR2GRAY)
                    forward=cv2.calcOpticalFlowFarneback(a,b,None,.5,5,31,7,7,1.5,0)
                    reverse=cv2.calcOpticalFlowFarneback(b,a,None,.5,5,31,7,7,1.5,0)
                    forward=cv2.resize(cv2.GaussianBlur(forward,(7,7),0),(width,height))*2
                    reverse=cv2.resize(cv2.GaussianBlur(reverse,(7,7),0),(width,height))*2
                    t=(frame-(count-overlap))/(overlap-1);weight=t*t*(3-2*t)
                    first=cv2.remap(image,xx-weight*forward[...,0],yy-weight*forward[...,1],cv2.INTER_LINEAR,borderMode=cv2.BORDER_REFLECT)
                    second=cv2.remap(head,xx-(1-weight)*reverse[...,0],yy-(1-weight)*reverse[...,1],cv2.INTER_LINEAR,borderMode=cv2.BORDER_REFLECT)
                    image=cv2.addWeighted(first,1-weight,second,weight,0)
                encoder.stdin.write(image.tobytes())
        finally:
            encoder.stdin.close();cap.release();rotation.release()
        if encoder.wait():raise RuntimeError('Approach encoding failed')
    report={'inspectedFrames':seen,'fps':fps,'duration':count/fps,'matchedOrbitPrefix':[96-overlap,95],'nextOrbitFrame':96,'audio':False}
    output.with_suffix('.analysis.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
    print(json.dumps(report))


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('source',type=Path);parser.add_argument('orbit',type=Path);parser.add_argument('output',type=Path)
    args=parser.parse_args();prepare(args.source,args.orbit,args.output)
