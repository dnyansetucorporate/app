import fs from 'fs';
import path from 'path';

const SRC_MODULES_DIR = path.resolve(__dirname, '..', 'src', 'modules');
const OUT_DIR = path.resolve(__dirname, '..', 'src', 'types');
const OUT_FILE = path.join(OUT_DIR, 'generated-schema-types.ts');

function walk(dir: string): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  let files: string[] = [];
  for (const entry of entries) {
    const res = path.resolve(dir, entry.name);
    if (entry.isDirectory()) files = files.concat(walk(res));
    else if (entry.isFile() && res.endsWith('.schema.ts')) files.push(res);
  }
  return files;
}

function collectTypesFromFile(filePath: string): string[] {
  const content = fs.readFileSync(filePath, 'utf8');
  const re = /export\s+type\s+([A-Za-z0-9_]+)\s*=/g;
  const matches: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(content)) !== null) {
    matches.push(m[1]);
  }
  return matches;
}

function relativeImport(from: string, to: string) {
  let rel = path.relative(path.dirname(from), to).replace(/\\/g, '/');
  if (!rel.startsWith('.')) rel = './' + rel;
  // drop .ts extension
  rel = rel.replace(/\.ts$/, '');
  return rel;
}

function main() {
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });
  const files = walk(SRC_MODULES_DIR);
  const exportsByFile: { file: string; types: string[] }[] = [];
  for (const f of files) {
    const types = collectTypesFromFile(f);
    if (types.length > 0) exportsByFile.push({ file: f, types });
  }

  const lines: string[] = [];
  lines.push('// AUTO-GENERATED - exports of schema-inferred types');
  lines.push('// Run `npm run gen:types` in backend to regenerate.');
  lines.push('');

  for (const entry of exportsByFile) {
    const importPath = relativeImport(OUT_FILE, entry.file);
    // Use type-only re-export
    const typesList = entry.types.join(', ');
    lines.push(`export type { ${typesList} } from '${importPath}';`);
  }

  const out = lines.join('\n') + '\n';
  fs.writeFileSync(OUT_FILE, out, 'utf8');
  console.log('Wrote', OUT_FILE, 'with', exportsByFile.length, 'files.');
}

main();
