import { readFileSync } from 'fs';
const rom = new Uint8Array(readFileSync('rom/dune_usa.gen'));

const sfxTable = 0x06a87e;
const voiceTable = 0x06a95c;

console.log('=== SFX Table (0x06a87e) ===');
for (let id = 0; id <= 0x40; id++) {
  const seq = (rom[sfxTable + id] << 24) >> 24;
  console.log('SFX 0x' + id.toString(16).padStart(2, '0') + ' (' + id + '): seq ' + seq);
}

console.log('\n=== Voice/Feedback Table (0x06a95c) ===');
for (let id = 0; id < 0x5e; id++) {
  const seq = (rom[voiceTable + id] << 24) >> 24;
  console.log('Feedback 0x' + id.toString(16).padStart(2, '0') + ' (' + id + '): seq ' + seq);
}
