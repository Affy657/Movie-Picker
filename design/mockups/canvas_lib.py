import json
import pathlib
import re
import sys

sys.path.insert(0, str(pathlib.Path(__file__).parent))
import base_screens as b
import manifest

HERE = pathlib.Path(__file__).parent
VOID = {"area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "source", "track", "wbr"}
BASE_CSS = (b.COMMON_CSS + b.CSS).strip("\n")
FONT = re.search(r'<link href="(https://fonts\.googleapis\.com/css2[^"]+)" rel="stylesheet">', b.foundation.FONTS).group(1).replace("&", "&amp;")
META = {n: dict(slug=s, label=l, device=d, page=p, module=m) for n, s, l, d, p, m in manifest.SCREENS}


def file_name(num):
    return "Main.dc.html" if num == "00" else f"{num}-{META[num]['slug']}.dc.html"


def size(num):
    if num == "00":
        return 1120, None
    return (1120, 700) if META[num]["device"] == "desk" else (375, 800)


def close_self(m):
    tag, attrs = m.group(1), m.group(2)
    if tag.lower() in VOID:
        return f"<{tag}{attrs.rstrip()}>"
    return f"<{tag}{attrs.rstrip()}></{tag}>"


def tidy(html):
    html = re.sub(r'<([a-zA-Z][a-zA-Z0-9-]*)((?:\s+[^<>]*?)?)\s*/>', close_self, html)
    return re.sub(r'href="(\d\d-[a-z0-9-]+)\.html"', r'href="\1.dc.html"', html)


def artboard(title, html, w, h, js, extra_css=""):
    props = json.dumps({"$preview": {"width": w, "height": h}}, separators=(",", ":"))
    css = BASE_CSS + ("\n" + extra_css.strip("\n") if extra_css.strip() else "")
    return ('<!doctype html>\n<html lang="fr">\n<head>\n<meta charset="utf-8">\n'
            f'<title>{title}</title>\n<script src="./support.js"></script>\n</head>\n<body>\n<x-dc>\n<helmet>\n'
            '<link rel="preconnect" href="https://fonts.googleapis.com">\n'
            f'<link href="{FONT}" rel="stylesheet">\n<style>\n{css}\nbody{{margin:0}}\n</style>\n</helmet>\n{tidy(html)}\n</x-dc>\n'
            f"<script type=\"text/x-dc\" data-dc-script data-props='{props}'>\n{js or b.component()}\n</script>\n</body>\n</html>\n")


def static_page(num, html, extra_css=""):
    body = f'<div style="padding:40px;display:flex;justify-content:center">{html}</div>'
    return b.page(f"Salle obscure, {META[num]['label']}", body, extra_css)


def render_module(mod, dc):
    b.DC = dc
    try:
        return {num: fn() for num, fn in mod.SCREENS.items()}
    finally:
        b.DC = False
