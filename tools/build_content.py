"""Copy the Chief Learning Officer's question banks into the app and rebuild the offline list.

    python tools/build_content.py              use C:\\Claude Code\\Chief Learning Officer\\Content
    python tools/build_content.py --samples    also include tools/sample-content (testing only)
    python tools/build_content.py --source D   take the banks from folder D instead

What it does:
1. Checks every topic file with the CLO's own validate.py (from the source folder). A file with
   errors is left out and reported, so a half-written bank never reaches the app.
2. Copies the good files to content/maths and content/science (the CLO folder stays the source;
   copies of banks that no longer exist there are removed from content/).
3. Writes content/manifest.json: the list of chapters the app shows, and a content version.
4. Rewrites sw.js from tools/sw.template.js with the list of every file to keep offline and a
   version stamp, so devices pick up new questions on their next visit.

Standard library only. Exit code 1 if nothing could be built.
"""
import datetime
import hashlib
import importlib.util
import json
import os
import shutil
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DEFAULT_SOURCE = r'C:\Claude Code\Chief Learning Officer\Content'
SAMPLES = os.path.join(ROOT, 'tools', 'sample-content')
OUT = os.path.join(ROOT, 'content')
SUBJECTS = ('maths', 'science')
SHELL_DIRS = ('css', 'js', 'icons')
SHELL_FILES = ('index.html', 'manifest.webmanifest', 'config.js')


def load_validator(source):
    path = os.path.join(source, 'validate.py')
    if not os.path.exists(path):
        print(f'warning: no validate.py in {source}; only basic checks will run')
        return None
    spec = importlib.util.spec_from_file_location('clo_validate', path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def basic_check(path):
    try:
        with open(path, encoding='utf-8') as f:
            d = json.load(f)
    except Exception as e:  # noqa: BLE001
        return [f'not valid JSON ({e})'], None
    need = ('subject', 'topicId', 'title', 'order', 'preamble', 'questions')
    missing = [k for k in need if k not in d]
    return ([f'missing {", ".join(missing)}'] if missing else []), d


def collect(source, validator, is_sample, seen_ids, seen_topics):
    from pathlib import Path
    good = []
    for subject in SUBJECTS:
        folder = os.path.join(source, subject)
        if not os.path.isdir(folder):
            continue
        for name in sorted(os.listdir(folder)):
            if not name.endswith('.json'):
                continue
            path = os.path.join(folder, name)
            errors, data = basic_check(path)
            if not errors and validator is not None:
                rep, _stats = validator.validate_file(Path(path), seen_ids, seen_topics)
                errors = rep.errors
                if is_sample:  # samples are deliberately small
                    errors = [e for e in errors if 'needs at least' not in e]
            if errors:
                print(f'  LEFT OUT {subject}/{name}: {len(errors)} error(s)')
                for e in errors[:5]:
                    print(f'      {e}')
                continue
            good.append((subject, name, path, data))
            print(f'  ok       {subject}/{name}: {len(data["questions"])} questions')
    return good


def sha(paths):
    h = hashlib.sha256()
    for p in sorted(paths):
        h.update(os.path.relpath(p, ROOT).replace('\\', '/').encode())
        with open(p, 'rb') as f:
            h.update(f.read())
    return h.hexdigest()


def main(argv):
    source = DEFAULT_SOURCE
    if '--source' in argv:
        source = argv[argv.index('--source') + 1]
    use_samples = '--samples' in argv
    print(f'Source: {source}')
    validator = load_validator(source) if os.path.isdir(source) else None
    seen_ids, seen_topics = {}, {}
    files = collect(source, validator, False, seen_ids, seen_topics) if os.path.isdir(source) else []
    if use_samples:
        print(f'Samples: {SAMPLES}')
        files += collect(SAMPLES, validator or load_validator(DEFAULT_SOURCE), True, seen_ids, seen_topics)
    if not files:
        print('No usable question banks found; nothing built.')
        return 1

    # copy into content/, removing copies that are no longer in the source
    wanted = set()
    for subject, name, path, _ in files:
        os.makedirs(os.path.join(OUT, subject), exist_ok=True)
        dest = os.path.join(OUT, subject, name)
        shutil.copyfile(path, dest)
        wanted.add(os.path.normcase(dest))
    for subject in SUBJECTS:
        folder = os.path.join(OUT, subject)
        if os.path.isdir(folder):
            for name in os.listdir(folder):
                p = os.path.join(folder, name)
                if name.endswith('.json') and os.path.normcase(p) not in wanted:
                    os.remove(p)
                    print(f'  removed stale copy content/{subject}/{name}')

    content_paths = sorted(wanted)
    manifest = {
        'generatedAt': datetime.datetime.now(datetime.timezone.utc).replace(microsecond=0).isoformat(),
        'contentVersion': sha(content_paths)[:12],
        'samples': use_samples,
        'subjects': [],
    }
    for subject in SUBJECTS:
        topics = []
        for s, name, _path, d in files:
            if s != subject:
                continue
            topics.append({
                'topicId': d['topicId'],
                'title': d['title'],
                'order': d['order'],
                'bookChapter': d.get('bookChapter', ''),
                'file': f'content/{subject}/{name}',
                'questions': len(d['questions']),
                'subtopics': len(d['preamble'].get('subtopics', [])),
            })
        topics.sort(key=lambda t: t['order'])
        manifest['subjects'].append({'id': subject, 'topics': topics})
    with open(os.path.join(OUT, 'manifest.json'), 'w', encoding='utf-8', newline='\n') as f:
        json.dump(manifest, f, indent=1, ensure_ascii=False)
        f.write('\n')

    # offline file list and version stamp for the service worker
    shell = [os.path.join(ROOT, p) for p in SHELL_FILES]
    for d in SHELL_DIRS:
        for base, _dirs, names in os.walk(os.path.join(ROOT, d)):
            # every runtime file, including js/generators/*.js and js/diagrams/*.js (loaded with
            # import() at start-up, so they must be cached for offline use); notes are left out
            shell += [os.path.join(base, n) for n in names if not n.startswith('.') and not n.endswith('.md')]
    listed = sorted(shell) + [os.path.join(OUT, 'manifest.json')] + content_paths
    rel = ['./'] + [os.path.relpath(p, ROOT).replace('\\', '/') for p in listed]
    template_path = os.path.join(ROOT, 'tools', 'sw.template.js')
    with open(template_path, encoding='utf-8') as f:
        template = f.read()
    version = 'study-practice-' + sha(listed + [template_path])[:12]
    sw = template.replace('__VERSION__', version).replace('__FILES__', json.dumps(rel, indent=2))
    with open(os.path.join(ROOT, 'sw.js'), 'w', encoding='utf-8', newline='\n') as f:
        f.write(sw)

    n_q = sum(len(d['questions']) for *_x, d in files)
    print(f'Built {len(files)} chapter(s), {n_q} questions. Content version {manifest["contentVersion"]}, offline cache {version} ({len(rel)} files).')
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
