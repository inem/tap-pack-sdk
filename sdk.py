#!/usr/bin/env python3
"""Authoring tools; builds the existing TAP pack API, never a second host/store."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile

SDK = Path(__file__).resolve().parent
BUN_VERSION = '1.3.11'


def write_json(path, value):
    path.write_text(json.dumps(value, indent=2, ensure_ascii=False, sort_keys=True) + '\n')


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def local_file(root, name):
    from tap_core.packs import pack_file
    # Use Core's canonical path and confinement checks for author inputs too.
    return pack_file(root, name)


def build(project, output, bun):
    from tap_core.packs import load_manifest, fields, no_duplicate_keys
    from tap_core.pack_store import build_artifact
    project = Path(project).resolve()
    output = Path(output).resolve()
    if output.exists():
        raise ValueError('Output exists; choose a new build directory: ' + str(output))
    spec = json.loads((project / 'tap-pack.json').read_text(), object_pairs_hook=no_duplicate_keys)
    fields(spec, ('id', 'version', 'intent', 'license', 'access'),
           ('page', 'files', 'entrypoints', 'config', 'requires'), 'author definition')
    if not isinstance(spec['intent'], str) or not spec['intent'].strip():
        raise ValueError('intent must describe the user result')
    if not isinstance(spec['license'], str) or not spec['license'].strip():
        raise ValueError('license must name the pack license')
    if 'LICENSE' not in spec.get('files', []):
        raise ValueError('Include the pack LICENSE in files')
    reserved = {'pack.json', 'page.js', 'README.md', 'BUILD.json', 'SDK-LICENSE'}
    if reserved.intersection(spec.get('files', [])):
        raise ValueError('files collide with generated output names')
    output.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix='.tap-sdk-', dir=output.parent) as tmp:
        stage = Path(tmp)
        package = stage / 'pack'
        package.mkdir()
        manifest = {
            'manifest_version': 1, 'id': spec['id'], 'version': spec['version'],
            'requires': spec.get('requires', {'pack_api': 1, 'dependencies': []}),
            'files': list(spec.get('files', [])),
            'entrypoints': dict(spec.get('entrypoints', {})),
            'config': spec.get('config', {}), 'access': spec['access']
        }
        for name in manifest['files']:
            source = local_file(project, name)
            target = package / name
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(source, target)
        provenance = {'sdk_version': '0.1.0', 'definition_sha256': digest(project / 'tap-pack.json'),
                      'tools': {name: digest(SDK / name) for name in ('sdk.py', 'tools/bundle.mjs')},
                      'copied_inputs': {name: digest(package / name) for name in manifest['files']}}
        if spec.get('page'):
            if 'page' in manifest['entrypoints']:
                raise ValueError('Use page source or an existing page entrypoint, not both')
            local_file(project, spec['page'])
            version = subprocess.check_output([bun, '--version'], text=True).strip()
            if version != BUN_VERSION:
                raise ValueError('Page build requires Bun ' + BUN_VERSION + '; found ' + version)
            bundle = subprocess.run([bun, str(SDK / 'tools/bundle.mjs'), str(project),
                                     spec['page'], str(package / 'page.js')],
                                    capture_output=True, text=True)
            if bundle.returncode:
                raise ValueError(bundle.stderr or bundle.stdout)
            provenance['browser'] = json.loads(bundle.stdout)
            sha = digest(package / 'page.js')
            resource_id = spec['id'] + '.page'
            manifest['resources'] = [{'contract': 'tap.page-resource/v1', 'id': resource_id,
                'version': spec['version'], 'kind': 'browser-classic-script', 'file': 'page.js',
                'sha256': sha, 'license': spec['license'], 'source_revision': 'sha256:' + sha}]
            manifest['entrypoints']['page'] = {'interface': 'browser-scripts-v1',
                'uses': [{'id': resource_id, 'version': spec['version']}]}
            manifest['files'].append('page.js')
            shutil.copyfile(SDK / 'LICENSE', package / 'SDK-LICENSE')
            manifest['files'].append('SDK-LICENSE')
        write_json(package / 'BUILD.json', provenance)
        manifest['files'] += ['README.md', 'BUILD.json']
        (package / 'README.md').write_text(
            '# ' + spec['id'] + ' ' + spec['version'] + '\n\n' + spec['intent'] + '\n\n'
            + 'Requested origins: ' + ', '.join(spec['access']['origins']) + '\n\n'
            + 'Requested access: ' + ', '.join(spec['access']['capabilities']) + '\n\n'
            + 'Install the accompanying .tap-pack using the installed TAP pack commands. '
              'Adding a pack does not itself configure proxy routing or certificate trust.\n\n'
            + 'This file and pack.json are generated from tap-pack.json. '
              'BUILD.json records build inputs; successful packaging is not live site evidence.\n')
        write_json(package / 'pack.json', manifest)
        # Canonical validation happens before constructing an output pathname from pack IDs.
        load_manifest(package)
        artifact = stage / (spec['id'] + '-' + spec['version'] + '.tap-pack')
        result = build_artifact(package, artifact)
        (stage / 'SHA256SUMS').write_text(result['sha256'] + '  ' + artifact.name + '\n')
        report = {'artifact': artifact.name, 'sha256': result['sha256'],
                  'pack_id': spec['id'], 'version': spec['version'],
                  'core_validation': 'passed', 'live_site': 'not_tested',
                  'core_validator_sha256': digest(Path(sys.modules['tap_core.packs'].__file__)),
                  'core_store_sha256': digest(Path(sys.modules['tap_core.pack_store'].__file__))}
        write_json(stage / 'report.json', report)
        # Stage must survive TemporaryDirectory cleanup after moving it.
        stage.rename(output)
    return report


def check(artifact):
    """Real immutable store, synthetic empty profile; no services or network changes."""
    from tap_core.pack_store import PackStore
    with tempfile.TemporaryDirectory(prefix='tap-sdk-check-') as tmp:
        profile = Path(tmp) / 'profile'
        profile.mkdir()
        write_json(profile / 'profile.json', {
            'bridge': {'version': 1, 'enabled': True, 'hub_port': 19002,
                       'allow_origins': [], 'exclude_origins': [], 'page_scripts': []},
            'components': {'version': 1, 'python': sys.executable,
                           'bun': shutil.which('bun') or str(Path.home() / '.bun/bin/bun'),
                           'readers': {}, 'handlers': {}}})
        store = PackStore(profile)
        installed = store.install(artifact)
        registry = store.load()
        pack_id = next(iter(registry['packs']))
        record = registry['packs'][pack_id]
        version = next(iter(record['versions']))
        root, manifest = store.verify(registry, pack_id, version)
        try:
            store.enable(pack_id, version, origins=(), capabilities=())
        except ValueError:
            pass
        else:
            raise ValueError('Empty grants unexpectedly admitted')
        store.enable(pack_id, version, origins=manifest['access']['origins'],
                     capabilities=manifest['access']['capabilities'])
        store.disable(pack_id)
        store.uninstall(pack_id)
        return {'pack_id': pack_id, 'version': version, 'install_enable_disable_uninstall': 'passed',
                'missing_grants': 'rejected', 'scope': 'isolated PackStore; code not executed; no live delivery'}


def initialize(directory, pack_id, origin):
    from tap_core.packs import ID, exact_origin
    if not ID.fullmatch(pack_id):
        raise ValueError('Invalid pack id')
    exact_origin(origin)
    root = Path(directory)
    root.mkdir(parents=True, exist_ok=False)
    write_json(root / 'tap-pack.json', {
        'id': pack_id, 'version': '0.1.0', 'intent': 'Copy a selected link in one click.',
        'license': 'MIT', 'page': 'page.js', 'files': ['LICENSE'],
        'access': {'origins': [origin], 'capabilities': ['page.inject']}})
    shutil.copyfile(SDK / 'LICENSE', root / 'LICENSE')
    (root / 'page.js').write_text('''import { copy_link } from 'tap-pack-sdk/copy';
import { browser_clipboard, select_link, on_click } from 'tap-pack-sdk/dom';
const key = %s;
if (!window[key]) {
  const clipboard = browser_clipboard(navigator, document);
  const link = select_link('a[data-copy-source]', document);
  window[key] = on_click(document, '[data-copy-link]', () => copy_link(link, clipboard), result => {
    result.target.textContent = result.status === 'completed' ? 'Copied' : 'Copy failed';
  });
}
''' % json.dumps('__tap_' + pack_id))
    return {'project': str(root.resolve()), 'next': 'Adapt the selectors and representation in page.js, then build.'}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--core', default=os.environ.get('TAP_CORE_SOURCE'),
                        help='Core source or installed checkout containing tap_core; author tooling only')
    sub = parser.add_subparsers(dest='command', required=True)
    init = sub.add_parser('init')
    init.add_argument('directory')
    init.add_argument('--id', required=True)
    init.add_argument('--origin', required=True)
    compile_ = sub.add_parser('build')
    compile_.add_argument('project')
    compile_.add_argument('--out', required=True)
    compile_.add_argument('--bun', default=shutil.which('bun') or 'bun')
    verify = sub.add_parser('check')
    verify.add_argument('artifact')
    args = parser.parse_args()
    if not args.core or not (Path(args.core) / 'tap_core/packs.py').is_file():
        parser.error('Provide --core PATH or TAP_CORE_SOURCE (Core validator is reused, not copied)')
    sys.path.insert(0, str(Path(args.core).resolve()))
    try:
        if args.command == 'init':
            result = initialize(args.directory, args.id, args.origin)
        elif args.command == 'build':
            result = build(args.project, args.out, args.bun)
        else:
            result = check(args.artifact)
        print(json.dumps(result, indent=2))
    except (ValueError, OSError, subprocess.SubprocessError) as error:
        print('tap-pack-sdk: ' + str(error), file=sys.stderr)
        return 1
    return 0


if __name__ == '__main__':
    sys.exit(main())
