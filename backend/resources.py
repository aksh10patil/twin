from pathlib import Path
import json

DATA_DIR = Path(__file__).resolve().parent / "data"
if not DATA_DIR.exists():
    DATA_DIR = Path("data")

# Read LinkedIn Markdown
try:
    with open(DATA_DIR / "linkedin.md", "r", encoding="utf-8") as f:
        linkedin = f.read()
except FileNotFoundError:
    linkedin = "LinkedIn profile not available"

# Read other data files
with open(DATA_DIR / "summary.txt", "r", encoding="utf-8") as f:
    summary = f.read()

with open(DATA_DIR / "style.txt", "r", encoding="utf-8") as f:
    style = f.read()

with open(DATA_DIR / "facts.json", "r", encoding="utf-8") as f:
    facts = json.load(f)

# Read personality and personal context notes
try:
    with open(DATA_DIR / "me.txt", "r", encoding="utf-8") as f:
        me = f.read()
except FileNotFoundError:
    me = ""
