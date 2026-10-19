/** Fixed-point helpers for extension units. No platform-dependent transcendental functions. */
export function integerSqrt(value:number):number {
  const n=Math.max(0,Math.floor(value));
  if(n<2)return n;
  let root=1;
  while(root*root<=n)root*=2;
  for(;;){const next=Math.floor((root+Math.floor(n/root))/2);if(next>=root)return root;root=next;}
}
export const fixed256=(value:number):number=>Math.round(value*256)/256;
export function fixedLength(x:number,y:number):number {
  const a=Math.round(x*256),b=Math.round(y*256);
  return integerSqrt(a*a+b*b)/256;
}
export const fixedSqrt=(value:number):number=>integerSqrt(Math.round(Math.max(0,value)*65536))/256;
export function integerPower(base:number,exponent:number):number {
  let result=1;
  for(let i=0;i<exponent;i++)result*=base;
  return result;
}
