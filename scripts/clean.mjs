import fs from 'node:fs';
import path from 'node:path';

for (const name of ['dist', 'build']) {
  const target = path.resolve(name);
  fs.rmSync(target, { recursive: true, force: true });
}
console.log('Clean completed.');
