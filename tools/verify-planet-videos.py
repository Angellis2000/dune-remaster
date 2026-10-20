"""Verify every decoded frame, the circular seam, the approach join and forward rotation."""
import json
from pathlib import Path
import subprocess

import cv2
import numpy as np

ROOT=Path(__file__).resolve().parents[1]
ASSETS=ROOT/'web/src/gfx/assets/frontend'


def decode(name:str,expected:int)->np.ndarray:
    path=ASSETS/name
    probe=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_streams','-of','json',str(path)],text=True))
    streams=probe['streams']
    assert len(streams)==1 and streams[0]['codec_type']=='video',f'{name}: audio must not overlap the intro music'
    assert (streams[0]['width'],streams[0]['height'])==(1280,720)
    assert streams[0]['r_frame_rate']=='24/1'
    cap=cv2.VideoCapture(str(path));frames=[]
    while True:
        ok,frame=cap.read()
        if not ok:break
        frames.append(cv2.resize(frame,(160,90),interpolation=cv2.INTER_AREA))
    cap.release();assert len(frames)==expected,(name,len(frames),expected)
    return np.asarray(frames)


orbit=decode('arrakis-orbit-loop-v1.mp4',624)
approach=decode('arrakis-approach-v1.mp4',240)
pixels=orbit.astype(np.float32)
delta=np.mean(np.abs(pixels[1:]-pixels[:-1]),axis=(1,2,3))
seam=float(np.mean(np.abs(pixels[-1]-pixels[0])))
join=float(np.mean(np.abs(approach[-1].astype(np.float32)-pixels[0])))
limit=max(1.,float(delta.max())*1.1)
assert seam<=limit,f'Circular seam too large: {seam} > {limit}'
assert join<=limit,f'Approach join too large: {join} > {limit}'
y,x=np.mgrid[:90,:160]
mask=((x-100)**2+(y-44)**2<20**2)&(x<108)
flow=[]
for start in range(0,len(orbit),24):
    end=(start+24)%len(orbit)
    a=cv2.cvtColor(orbit[start],cv2.COLOR_BGR2GRAY);b=cv2.cvtColor(orbit[end],cv2.COLOR_BGR2GRAY)
    movement=cv2.calcOpticalFlowFarneback(a,b,None,.5,5,25,6,7,1.5,0)
    flow.append(float(np.median(movement[:,:,0][mask])))
assert min(flow)>0,f'Rotation reversed or stopped: {min(flow)}'
report={'orbitFrames':len(orbit),'approachFrames':len(approach),'loopSeam':seam,'approachJoin':join,'largestNormalChange':float(delta.max()),'forwardFlowMin':min(flow),'forwardFlowMax':max(flow),'audioStreams':0}
out=ROOT/'out/planet-loop';out.mkdir(parents=True,exist_ok=True)
(out/'verified-assets.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
print('PASS planet videos: '+json.dumps(report))
