// Сборка бета-exe: веб-игра (vite build) → desktop/app → electron-builder (один переносной exe в desktop/release).
// Запуск: cd desktop && npm install && npm run build
//   обычная бета — без ROM (игрок кладёт свой ROM рядом с exe или выбирает файл): DuneRemaster-beta-<версия>.exe;
//   личная сборка владельца — с его ROM внутри (не раздавать!): DUNE_ROM=путь\к\rom.gen npm run build
//   → DuneRemaster-personal-<версия>.exe. ROM копируется только в desktop/app (в .gitignore), в git не попадает.
import { execFileSync, execSync } from "node:child_process";
import { createHash } from 'node:crypto';
import { copyFileSync, cpSync, existsSync, readFileSync, rmSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));
const web = path.join(here, "..", "web");
const run = (cmd, cwd) => execSync(cmd, { cwd, stdio: "inherit" });
const rom = process.env.DUNE_ROM;
if (rom) {
  const head = readFileSync(rom).subarray(0x100, 0x110).toString("latin1");
  if (!head.includes("SEGA")) throw new Error(`${rom}: это не ROM Mega Drive`);
}

run("npx tsc --noEmit", web);
run("npx vite build --emptyOutDir", web);
const app = path.join(here, "app");
if (existsSync(app)) rmSync(app, { recursive: true, force: true });
cpSync(path.join(web, "dist"), app, { recursive: true });
if (rom) copyFileSync(rom, path.join(app, "embedded-rom.gen"));
const naming = rom ? ' -c.portable.artifactName="DuneRemaster-personal-${version}.exe"' : "";
run(`npx electron-builder --win portable --x64${naming}`, here);
if(process.platform==='win32'){
  const unpacked=path.join(here,'release','win-unpacked');
  const icon=path.join(here,'assets','dune-icon.ico');
  // A content-addressed icon path avoids Explorer reusing the old cached icon
  // associated with the unchanged executable name.
  const iconName=`DuneRemaster-${createHash('sha256').update(readFileSync(icon)).digest('hex').slice(0,12)}.ico`;
  copyFileSync(icon,path.join(unpacked,iconName));
  execFileSync('powershell.exe',['-NoProfile','-NonInteractive','-Command',
    "$link=(New-Object -ComObject WScript.Shell).CreateShortcut([IO.Path]::Combine($env:DUNE_UNPACKED,'Dune Remaster.lnk')); $link.TargetPath=[IO.Path]::Combine($env:DUNE_UNPACKED,'Dune Remaster Beta.exe'); $link.WorkingDirectory=$env:DUNE_UNPACKED; $link.IconLocation=[IO.Path]::Combine($env:DUNE_UNPACKED,$env:DUNE_ICON_NAME)+',0'; $link.Description='Dune Remaster'; $link.Save()"
  ],{env:{...process.env,DUNE_UNPACKED:unpacked,DUNE_ICON_NAME:iconName},windowsHide:true});
}
console.log(`Готово: desktop/release/${rom ? " (личная сборка с ROM — не раздавать)" : ""}`);
