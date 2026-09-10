import { realpathSync, readFileSync } from 'node:fs';
import { resolve, dirname, relative, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
const [projectArg, entryArg, output] = process.argv.slice(2);
const project = realpathSync(projectArg);
const sdk = realpathSync(resolve(dirname(fileURLToPath(import.meta.url)), '..'));
const inputs = new Map();
const inside = (root, path) => { const rel = relative(root, path); return rel !== '..' && !rel.startsWith('../') && !isAbsolute(rel); };
const modules = { 'tap-pack-sdk/context': 'src/context.js', 'tap-pack-sdk/copy': 'src/copy.js', 'tap-pack-sdk/dom': 'src/dom.js', 'tap-pack-sdk/ui': 'src/ui.js' };
const built = await Bun.build({
  entrypoints: [resolve(project, entryArg)], target: 'browser', format: 'iife',
  minify: true, sourcemap: 'none',
  plugins: [{ name: 'local-pack-inputs', setup(build) {
    build.onResolve({ filter: /.*/ }, args => {
      let path;
      if (modules[args.path]) path = resolve(sdk, modules[args.path]);
      else if (args.path.startsWith('.') || isAbsolute(args.path)) path = resolve(args.resolveDir || project, args.path);
      else throw new Error(`Unsupported import ${args.path}; vendor reviewed browser source locally, no implicit downloads`);
      path = realpathSync(path);
      if (!inside(project, path) && !inside(resolve(sdk, 'src'), path)) throw new Error(`Import escapes pack: ${args.path}`);
      if (!/\.(m?js|ts)$/.test(path)) throw new Error('Only JS/TS module inputs are supported');
      const name = inside(project, path) ? 'pack/' + relative(project, path) : 'sdk/' + relative(sdk, path);
      inputs.set(name, createHash('sha256').update(readFileSync(path)).digest('hex'));
      return { path };
    });
  } }]
});
if (!built.success) { console.error(built.logs); process.exit(1); }
if (built.outputs.length !== 1) throw new Error('Expected one self-contained classic script');
await Bun.write(output, built.outputs[0]);
console.log(JSON.stringify({ bun: Bun.version, inputs: Object.fromEntries([...inputs].sort()) }));
