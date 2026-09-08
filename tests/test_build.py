import importlib.util
import json
import os
from pathlib import Path
import shutil
import sys
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
CORE = Path(os.environ['TAP_CORE_SOURCE']).resolve()
sys.path.insert(0, str(CORE))
spec = importlib.util.spec_from_file_location('sdk', ROOT / 'sdk.py')
sdk = importlib.util.module_from_spec(spec)
spec.loader.exec_module(sdk)
BUN = os.environ.get('TAP_SDK_BUN', str(Path.home() / '.bun/bin/bun'))

class BuildTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.project = self.root / 'author'
        sdk.initialize(self.project, 'example.links', 'https://articles.example')

    def test_reproducible_artifact_and_real_store(self):
        a = sdk.build(self.project, self.root / 'a', BUN)
        # Different absolute source path must not change artifact bytes.
        shutil.copytree(self.project, self.root / 'second-source')
        b = sdk.build(self.root / 'second-source', self.root / 'b', BUN)
        self.assertEqual(a['sha256'], b['sha256'])
        checked = sdk.check(self.root / 'a' / a['artifact'])
        self.assertEqual(checked['install_enable_disable_uninstall'], 'passed')
        self.assertEqual(checked['missing_grants'], 'rejected')

    def test_failed_build_has_no_published_output(self):
        (self.project / 'page.js').write_text("import './missing.js';")
        with self.assertRaises(ValueError):
            sdk.build(self.project, self.root / 'out', BUN)
        self.assertFalse((self.root / 'out').exists())

    def test_import_cannot_escape_project(self):
        (self.root / 'private.js').write_text("window.shouldNotBeBundled = true;")
        (self.project / 'page.js').write_text("import '../private.js';")
        with self.assertRaisesRegex(ValueError, 'escapes pack'):
            sdk.build(self.project, self.root / 'out', BUN)

    def test_missing_permission_fails_core_validator(self):
        definition = json.loads((self.project / 'tap-pack.json').read_text())
        definition['access']['capabilities'] = []
        sdk.write_json(self.project / 'tap-pack.json', definition)
        with self.assertRaises(ValueError):
            sdk.build(self.project, self.root / 'out', BUN)
        self.assertFalse((self.root / 'out').exists())

    def test_reader_packages_without_bun(self):
        definition = json.loads((self.project / 'tap-pack.json').read_text())
        definition.pop('page')
        definition['files'].append('reader.py')
        definition['entrypoints'] = {'reader': {'file': 'reader.py', 'interface': 'python-jsonl-v1'}}
        definition['access']['capabilities'] = ['capture.read']
        (self.project / 'reader.py').write_text('# No code executed by packaging check\n')
        sdk.write_json(self.project / 'tap-pack.json', definition)
        result = sdk.build(self.project, self.root / 'reader', '/does-not-exist/bun')
        self.assertEqual(sdk.check(self.root / 'reader' / result['artifact'])['install_enable_disable_uninstall'], 'passed')

if __name__ == '__main__':
    unittest.main()
