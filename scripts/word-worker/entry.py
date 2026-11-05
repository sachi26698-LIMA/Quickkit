#!/usr/bin/python3
"""Runs only inside the ephemeral, network-less job image. No broker credentials."""
import json
import os
import pathlib
import resource
import shutil
import subprocess
import sys
import time

os.umask(0o077)
LIMIT_INPUT = 20 * 1024 * 1024
LIMIT_OUTPUT = 50 * 1024 * 1024


def counter(path):
    try:
        return int(pathlib.Path(path).read_text().strip())
    except (OSError, ValueError):
        return None


def cpu_usec():
    try:
        return int(dict(line.split() for line in pathlib.Path('/sys/fs/cgroup/cpu.stat').read_text().splitlines())['usage_usec'])
    except (OSError, ValueError, KeyError):
        return None


def verify_isolation():
    # Fail closed on a host/runtime that cannot enforce this recipe's boundaries.
    status = dict(line.split(':', 1) for line in pathlib.Path('/proc/self/status').read_text().splitlines() if ':' in line)
    if os.getuid() != 65532 or int(status['CapEff'].strip(), 16) != 0 or status['NoNewPrivs'].strip() != '1' or status['Seccomp'].strip() != '2':
        raise ValueError('Required identity/capability/seccomp policy missing')
    if not os.statvfs('/').f_flag & os.ST_RDONLY or set(os.listdir('/sys/class/net')) != {'lo'}:
        raise ValueError('Read-only root or network isolation missing')
    memory = counter('/sys/fs/cgroup/memory.max')
    pids = counter('/sys/fs/cgroup/pids.max')
    quota, period = pathlib.Path('/sys/fs/cgroup/cpu.max').read_text().split()
    if memory is None or not 0 < memory <= 1073741824 or pids is None or not 0 < pids <= 128 or quota == 'max' or not 0 < int(quota) <= int(period) or counter('/sys/fs/cgroup/memory.swap.max') != 0:
        raise ValueError('Required cgroup v2 resource limits missing')


def main():
    verify_isolation()
    if len(sys.argv) != 2:
        raise ValueError('Invalid invocation')
    if sys.argv[1] == '--version':
        os.execv('/usr/bin/libreoffice', ['/usr/bin/libreoffice', '--headless', '--version'])
    export_filter = json.loads(sys.argv[1])
    if not isinstance(export_filter, dict):
        raise ValueError('Invalid filter')
    home = pathlib.Path('/work/home')
    home.mkdir(mode=0o700)
    profile = pathlib.Path('/work/profile/user')
    profile.mkdir(parents=True, mode=0o700)
    (profile / 'registrymodifications.xcu').write_text('''<?xml version="1.0" encoding="UTF-8"?><oor:items xmlns:oor="http://openoffice.org/2001/registry"><item oor:path="/org.openoffice.Office.Common/Security/Scripting"><prop oor:name="MacroSecurityLevel" oor:op="fuse"><value>3</value></prop></item></oor:items>''')
    data = sys.stdin.buffer.read(LIMIT_INPUT + 1)
    if len(data) > LIMIT_INPUT or not data.startswith(b'PK\x03\x04'):
        raise ValueError('Invalid DOCX')
    pathlib.Path('/work/input.docx').write_bytes(data)
    del data
    start = time.monotonic()
    # Inner deadline survives broker/CLI crashes. Docker still enforces outer deadline.
    result = subprocess.run([
        '/usr/bin/timeout', '--kill-after=5s', '110s', '/usr/bin/libreoffice',
        '-env:UserInstallation=file:///work/profile', '--headless', '--nologo',
        '--nodefault', '--nofirststartwizard', '--norestore', '--nolockcheck',
        '--convert-to', 'pdf:writer_pdf_Export:' + json.dumps(export_filter, separators=(',', ':')),
        '--outdir', '/work', '/work/input.docx',
    ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=False)
    elapsed = time.monotonic() - start
    output = pathlib.Path('/work/input.pdf')
    if result.returncode != 0 or not output.is_file() or not 5 <= output.stat().st_size <= LIMIT_OUTPUT:
        raise ValueError('Native conversion failed')
    usage = resource.getrusage(resource.RUSAGE_CHILDREN)
    metrics = dict(elapsedSeconds=elapsed, userSeconds=usage.ru_utime,
                   systemSeconds=usage.ru_stime, peakRssKiB=usage.ru_maxrss,
                   containerPeakBytes=counter('/sys/fs/cgroup/memory.peak'), containerCpuUsec=cpu_usec())
    # Metrics contain numbers only; all native diagnostics are discarded, not logged.
    sys.stderr.write('QUICKKIT_METRICS ' + json.dumps(metrics, separators=(',', ':')) + '\n')
    with output.open('rb') as stream:
        if stream.read(5) != b'%PDF-':
            raise ValueError('Invalid native output')
        stream.seek(0)
        shutil.copyfileobj(stream, sys.stdout.buffer, length=65536)


if __name__ == '__main__':
    try:
        main()
    except Exception:
        sys.stderr.write('Native job failed.\n')
        sys.exit(1)
