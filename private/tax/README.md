# Private W-8BEN fill kit (local only)

## Steps

1. Copy and edit (this file is gitignored):
   ```bash
   cp private/tax/w8ben.input.example.json private/tax/w8ben.input.json
   ```
2. Fill every empty string in `w8ben.input.json`.
3. Tell the agent “JSON 填好了” — they will run the filler **without opening/reading** the JSON.
   Or run yourself:
   ```bash
   private/tax/.venv/bin/python scripts/fill-w8ben.py
   ```
4. Output: `private/tax/out/21371473.pdf` (gitignored).
5. Open in Preview → hand-sign if signature is blank → upload to Apple Box → reply with Case-ID.

## Privacy

- `w8ben.input.json`, `out/`, `.venv/`, and `fw8ben.pdf` are gitignored.
- The fill script prints only missing **key names**, output path, byte size, and a short hash — never values.
