#!/usr/bin/env python3
"""
Fill IRS Form W-8BEN from a local JSON file.

Privacy: never prints field values — only missing keys, output path, size, sha256.
"""

from __future__ import annotations

import hashlib
import json
import sys
from pathlib import Path

from pypdf import PdfReader, PdfWriter
from pypdf.generic import NameObject

ROOT = Path(__file__).resolve().parents[1]
INPUT_JSON = ROOT / "private/tax/w8ben.input.json"
TEMPLATE_PDF = ROOT / "fw8ben.pdf"
OUT_DIR = ROOT / "private/tax/out"
OUT_PDF = OUT_DIR / "21371473.pdf"

# Semantic JSON key -> AcroForm field on fw8ben.pdf
FIELD_MAP = {
    "line1_name": "topmostSubform[0].Page1[0].f_1[0]",
    "line2_citizenship": "topmostSubform[0].Page1[0].f_2[0]",
    "line3_street": "topmostSubform[0].Page1[0].f_3[0]",
    "line3_city_state_postal": "topmostSubform[0].Page1[0].f_4[0]",
    "line3_country": "topmostSubform[0].Page1[0].f_5[0]",
    "line4_street": "topmostSubform[0].Page1[0].f_6[0]",
    "line4_city_state_postal": "topmostSubform[0].Page1[0].f_7[0]",
    "line4_country": "topmostSubform[0].Page1[0].f_8[0]",
    "line5_us_itin": "topmostSubform[0].Page1[0].f_9[0]",
    "line6a_china_id_number": "topmostSubform[0].Page1[0].f_10[0]",
    "line7_reference": "topmostSubform[0].Page1[0].f_11[0]",
    "line8_date_of_birth": "topmostSubform[0].Page1[0].f_12[0]",
    "line9_treaty_country": "topmostSubform[0].Page1[0].f_13[0]",
    "line10_article": "topmostSubform[0].Page1[0].f_14[0]",
    "line10_rate_percent": "topmostSubform[0].Page1[0].f_15[0]",
    "line10_income_type": "topmostSubform[0].Page1[0].f_16[0]",
    "line10_explanation": "topmostSubform[0].Page1[0].f_17[0]",
    "capacity": "topmostSubform[0].Page1[0].f_18[0]",
    "print_name_of_signer": "topmostSubform[0].Page1[0].f_21[0]",
    "signature_date": "topmostSubform[0].Page1[0].Date[0]",
}

CHECKBOX_FTIN_NR = "topmostSubform[0].Page1[0].c1_01[0]"
CHECKBOX_CERTIFY = "topmostSubform[0].Page1[0].c1_02[0]"

REQUIRED = [
    "line1_name",
    "line2_citizenship",
    "line3_street",
    "line3_city_state_postal",
    "line3_country",
    "line5_us_itin",
    "line6a_china_id_number",
    "line7_reference",
    "line8_date_of_birth",
    "line9_treaty_country",
    "print_name_of_signer",
    "signature_date",
]


def _is_blank(v: object) -> bool:
    if v is None:
        return True
    if isinstance(v, bool):
        return False
    return str(v).strip() == ""


def main() -> int:
    if not INPUT_JSON.is_file():
        print(f"missing_input: {INPUT_JSON}", file=sys.stderr)
        print(
            "hint: cp private/tax/w8ben.input.example.json private/tax/w8ben.input.json",
            file=sys.stderr,
        )
        return 2
    if not TEMPLATE_PDF.is_file():
        print(f"missing_template: {TEMPLATE_PDF}", file=sys.stderr)
        return 2

    data = json.loads(INPUT_JSON.read_text(encoding="utf-8"))
    if not isinstance(data, dict):
        print("invalid_json_root", file=sys.stderr)
        return 2

    missing = [k for k in REQUIRED if _is_blank(data.get(k))]
    if missing:
        # Key names only — never values.
        print("missing_keys:", ",".join(missing), file=sys.stderr)
        return 3

    claim_line10 = bool(data.get("claim_treaty_line10"))
    ftin_nr = bool(data.get("line6b_ftin_not_required"))
    certify = bool(data.get("certify_part_iii", True))

    updates: dict[str, str] = {}
    for key, field in FIELD_MAP.items():
        if key.startswith("line10_") and not claim_line10:
            continue
        if key.startswith("line4_") and _is_blank(data.get(key)):
            continue
        val = data.get(key)
        if _is_blank(val):
            continue
        updates[field] = str(val).strip()

    reader = PdfReader(str(TEMPLATE_PDF))
    available = set(reader.get_fields() or {})
    unknown = [f for f in updates if f not in available]
    if unknown:
        print("unknown_pdf_fields:", ",".join(unknown), file=sys.stderr)
        return 4

    writer = PdfWriter()
    writer.append(reader)
    writer.update_page_form_field_values(writer.pages[0], updates)

    checkbox: dict[str, NameObject] = {}
    if ftin_nr and CHECKBOX_FTIN_NR in available:
        checkbox[CHECKBOX_FTIN_NR] = NameObject("/1")
    if certify and CHECKBOX_CERTIFY in available:
        checkbox[CHECKBOX_CERTIFY] = NameObject("/1")
    if checkbox:
        writer.update_page_form_field_values(writer.pages[0], checkbox)

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    with OUT_PDF.open("wb") as f:
        writer.write(f)

    raw = OUT_PDF.read_bytes()
    digest = hashlib.sha256(raw).hexdigest()[:16]
    print(
        f"ok fields={len(updates)} checkboxes={len(checkbox)} "
        f"bytes={len(raw)} sha256_16={digest}"
    )
    print(f"out={OUT_PDF}")
    print("note=open_in_Preview_to_hand_sign_if_needed")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
