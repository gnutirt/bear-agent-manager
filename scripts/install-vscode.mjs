// Builds a .vsix from ./vscode (no vsce / npm needed) and installs it into VS Code and Antigravity (--build-only: just build it).
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'vscode', 'package.json'), 'utf8'));
const stage = fs.mkdtempSync(path.join(os.tmpdir(), 'ar-vsix-'));
fs.cpSync(path.join(ROOT, 'vscode'), path.join(stage, 'extension'), { recursive: true });

fs.writeFileSync(path.join(stage, '[Content_Types].xml'), `<?xml version="1.0" encoding="utf-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension=".json" ContentType="application/json"/>
  <Default Extension=".js" ContentType="application/javascript"/>
  <Default Extension=".svg" ContentType="image/svg+xml"/>
  <Default Extension=".vsixmanifest" ContentType="text/xml"/>
</Types>
`);
fs.writeFileSync(path.join(stage, 'extension.vsixmanifest'), `<?xml version="1.0" encoding="utf-8"?>
<PackageManifest Version="2.0.0" xmlns="http://schemas.microsoft.com/developer/vsx-schema/2011">
  <Metadata>
    <Identity Language="en-US" Id="${pkg.name}" Version="${pkg.version}" Publisher="${pkg.publisher}"/>
    <DisplayName>${pkg.displayName}</DisplayName>
    <Description xml:space="preserve">${pkg.description}</Description>
    <Properties>
      <Property Id="Microsoft.VisualStudio.Code.Engine" Value="${pkg.engines.vscode}"/>
    </Properties>
  </Metadata>
  <Installation><InstallationTarget Id="Microsoft.VisualStudio.Code"/></Installation>
  <Dependencies/>
  <Assets>
    <Asset Type="Microsoft.VisualStudio.Code.Manifest" Path="extension/package.json" Addressable="true"/>
  </Assets>
</PackageManifest>
`);

const vsix = path.join(ROOT, `${pkg.name}-${pkg.version}.vsix`);
fs.rmSync(vsix, { force: true });
execFileSync('powershell.exe', ['-NoProfile', '-Command',
  `Add-Type -AssemblyName System.IO.Compression.FileSystem; [IO.Compression.ZipFile]::CreateFromDirectory('${stage}', '${vsix}')`]);
fs.rmSync(stage, { recursive: true, force: true });
console.log(`built ${vsix}`);
if (process.argv.includes('--build-only')) process.exit(0);   // npm run vsix

const programs = path.join(process.env.LOCALAPPDATA ?? '', 'Programs');
const editors = [
  ['VS Code', path.join(programs, 'Microsoft VS Code', 'bin', 'code.cmd')],
  ['Antigravity', path.join(programs, 'Antigravity IDE', 'bin', 'antigravity-ide.cmd')],
];
for (const [name, cli] of editors) {
  if (!fs.existsSync(cli)) { console.log(`skip ${name}: ${cli} not found`); continue; }
  try {
    const out = execFileSync('cmd.exe', ['/c', cli, '--install-extension', vsix, '--force'], { encoding: 'utf8' });
    console.log(`${name}: ${out.trim().split('\n').pop()}`);
  } catch (e) {
    console.log(`${name}: install failed: ${e.message}`);
  }
}
console.log('Reload the editor window (Developer: Reload Window) to see the Bear Agent Manager icon.');
