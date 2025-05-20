#!/usr/bin/env python3
"""
Dieses Skript kann:
 1. Eine kombinierte Datei mit Trennmarkern in einzelne Dateien aufteilen.
 2. Einzelne Dateien aus einer Liste in eine kombinierte Datei mit Trennmarkern zusammenführen.

Verwendung:
  # Aufteilen:
  python file_splitter_and_combiner.py split --input combined.txt --outdir ./output_dir

  # Zusammenführen anhand einer Liste:
  python file_splitter_and_combiner.py join --filelist files.txt --output combined.txt
"""

import os
import re
import argparse

# Erkennung des File-Markierung:
# Matcht Zeilen wie "// File: pfad/zur/datei.ext"
SEPARATOR_PATTERN = re.compile(r'^//\s*File:\s*(?P<path>.+?)\s*$', re.MULTILINE)


def split_file(input_path: str, out_dir: str):
    """
    Liest eine kombinierte Datei mit File-Markern und schreibt jeden Abschnitt in eine eigene Datei.
    """
    with open(input_path, 'r', encoding='utf-8') as f:
        content = f.read()

    matches = list(SEPARATOR_PATTERN.finditer(content))
    if not matches:
        print("Keine Datei-Trennmarker gefunden.")
        return

    for i, match in enumerate(matches):
        rel_path = match.group('path').strip()
        start = match.end() + 1
        end = matches[i+1].start() if i+1 < len(matches) else len(content)
        section = content[start:end].lstrip('\n')

        target_path = os.path.join(out_dir, rel_path)
        os.makedirs(os.path.dirname(target_path), exist_ok=True)
        with open(target_path, 'w', encoding='utf-8') as out_f:
            out_f.write(section)
        print(f"Schreibe: {target_path}")


def join_files_from_list(file_list_path: str, output_path: str):
    """
    Liest Dateipfade aus einer Textdatei und fügt deren Inhalt in eine kombinierte Datei mit File-Markern.
    """
    if not os.path.isfile(file_list_path):
        print(f"Dateiliste nicht gefunden: {file_list_path}")
        return

    with open(file_list_path, 'r', encoding='utf-8') as f:
        files = [line.strip() for line in f if line.strip()]

    if not files:
        print("Die Dateiliste ist leer.")
        return

    with open(output_path, 'w', encoding='utf-8') as out_f:
        for rel_file in files:
            if not os.path.isfile(rel_file):
                print(f"Datei nicht gefunden, übersprungen: {rel_file}")
                continue
            out_f.write("// ================================\n")
            out_f.write(f"// File: {rel_file}\n")
            out_f.write("// ================================\n\n")
            try:
                with open(rel_file, 'r', encoding='utf-8') as in_f:
                    out_f.write(in_f.read())
            except Exception as e:
                print(f"Fehler beim Lesen von {rel_file}: {e}")
            out_f.write("\n\n")
            print(f"Eingefügt: {rel_file}")


def main():
    parser = argparse.ArgumentParser(
        description="Datei-Splitter und -Joiner mit Trennmarkern"
    )
    sub = parser.add_subparsers(dest='command', required=True)

    p_split = sub.add_parser('split', help='Kombinierte Datei aufteilen')
    p_split.add_argument(
        '--input', '-i', required=True,
        help='Pfad zur kombinierten Eingabedatei'
    )
    p_split.add_argument(
        '--outdir', '-o', required=True,
        help='Zielverzeichnis für einzelne Dateien'
    )

    p_join = sub.add_parser('join', help='Einzelne Dateien anhand einer Liste zusammenführen')
    p_join.add_argument(
        '--filelist', '-f', required=True,
        help='Textdatei mit je einem Dateipfad pro Zeile'
    )
    p_join.add_argument(
        '--output', '-o', required=True,
        help='Pfad zur kombinierten Ausgabedatei'
    )

    args = parser.parse_args()
    if args.command == 'split':
        split_file(args.input, args.outdir)
    elif args.command == 'join':
        join_files_from_list(args.filelist, args.output)


if __name__ == '__main__':
    main()

