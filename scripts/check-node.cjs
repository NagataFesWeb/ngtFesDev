// Keep the 22.x release line and reject versions predating the October 2026 security fix.
const [major, minor, patch] = process.versions.node.split('.').map(Number);
if (major !== 22 || minor < 23 || (minor === 23 && patch < 4)) {
  console.error(`Unsupported Node.js ${process.version}. Install Node.js 22.23.4 or a newer 22.x release (.nvmrc).`);
  process.exit(1);
}
console.log(`Node.js security baseline verified: ${process.version}`);
