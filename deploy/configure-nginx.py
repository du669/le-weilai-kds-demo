#!/usr/bin/env python3
"""Add the Le Weilai reverse-proxy location to an existing HTTPS Nginx site."""

import os
import re
import shutil
import sys
import tempfile
from pathlib import Path


def server_blocks(lines):
    depth = 0
    start = None
    for index, line in enumerate(lines):
        clean = line.split("#", 1)[0]
        if start is None and depth == 0 and re.match(r"\s*server\s*\{", clean):
            start = index
        depth += clean.count("{") - clean.count("}")
        if start is not None and depth == 0:
            yield start, index, "".join(lines[start : index + 1])
            start = None


def atomic_write(path, content, mode=None):
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, temporary = tempfile.mkstemp(prefix=f".{path.name}.", dir=path.parent)
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as stream:
            stream.write(content)
        if mode is not None:
            os.chmod(temporary, mode)
        os.replace(temporary, path)
    finally:
        if os.path.exists(temporary):
            os.unlink(temporary)


def main():
    if len(sys.argv) != 3:
        raise SystemExit("Usage: configure-nginx.py DOMAIN BASE_PATH")
    domain, base_path = sys.argv[1], "/" + sys.argv[2].strip("/")
    site = Path(f"/etc/nginx/sites-available/{domain}")
    snippet = Path("/etc/nginx/snippets/le-weilai-restaurant.conf")
    if not site.is_file():
        raise SystemExit(f"Nginx site file not found: {site}")

    original = site.read_text(encoding="utf-8")
    lines = original.splitlines(keepends=True)
    target = None
    for start, end, block in server_blocks(lines):
        names = re.search(r"^\s*server_name\s+([^;]+);", block, re.M)
        tls = re.search(r"^\s*listen\s+[^;]*443[^;]*ssl", block, re.M)
        if names and domain in names.group(1).split() and tls:
            target = (start, end)
            break
    if target is None:
        raise SystemExit(f"No HTTPS server block for {domain} found in {site}")

    snippet_text = f"""# Le Weilai restaurant service, mounted below {base_path}/
location = {base_path} {{
    return 308 {base_path}/;
}}

location ^~ {base_path}/ {{
    proxy_pass http://127.0.0.1:8766;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_buffering off;
    proxy_read_timeout 3600;
    proxy_send_timeout 3600;
    add_header X-Accel-Buffering no;
}}
"""
    atomic_write(snippet, snippet_text, 0o644)

    include = f"include {snippet};"
    if include not in original:
        _, end = target
        indent = re.match(r"\s*", lines[end]).group(0) + "    "
        lines.insert(end, f"{indent}{include}\n")
        backup = site.with_name(f"{site.name}.pre-le-weilai")
        if not backup.exists():
            shutil.copy2(site, backup)
        atomic_write(site, "".join(lines), site.stat().st_mode & 0o777)

    print(f"Configured {domain}{base_path} in {site}")


if __name__ == "__main__":
    main()
