import fs from 'fs';
const rom = fs.readFileSync('rom/dune_usa.gen');

const pos = 0x087fdc;
console.log('Table 0x087fdc entries (8 bytes each):');
for (let i = 0; i < 35; i++) {
  const p = pos + i * 8;
  const strPtr = rom.readUInt32BE(p);
  const word4 = rom.readUInt16BE(p + 4);
  const word6 = rom.readUInt16BE(p + 6);
  if (strPtr > 0 && strPtr < rom.length) {
    let end = strPtr;
    while (rom[end] !== 0) end++;
    const name = rom.slice(strPtr, end).toString('latin1');
    console.log(`Entry ${i.toString().padStart(2, ' ')}: "${name.padEnd(16, ' ')}" word4=0x${word4.toString(16).padStart(4, '0')} (${word4.toString().padStart(3, ' ')}) word6=0x${word6.toString(16).padStart(4, '0')} (${word6.toString().padStart(3, ' ')})`);
  }
}
