/** The dish turns about its own bowl centre, registered to the fixed pedestal bearing. */
export function drawRadarDish(ctx:CanvasRenderingContext2D,image:CanvasImageSource,w:number,h:number,tick=0):void{
  const px=w*398/1254,py=h*430/1254;
  ctx.save();ctx.imageSmoothingEnabled=true;ctx.translate(px,py);
  ctx.rotate(tick/60*Math.PI*2/18);
  // The generated layer has generous alpha padding. Register the extracted bowl to the
  // original composition, independently of that padding, rather than stretching the canvas.
  const width=w*350/1254,height=h*346/1254;
  // Bowl centre in the extracted source is (331,406). Align that point, rather than
  // the image canvas or asymmetric yellow bracket, with the bearing before rotation.
  ctx.drawImage(image,142,184,447,442,-(331-142)/447*width,-(406-184)/442*height,width,height);
  ctx.restore();
}
