import base64, getpass, hashlib, os, re, secrets

ENV_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env")

email = input("Admin email: ").strip().lower()
password = getpass.getpass("Choose an admin password (at least 12 characters): ")
if "@" not in email:
    raise SystemExit("Enter a valid email address.")
if len(password) < 12:
    raise SystemExit("Password too short. Use at least 12 characters.")

salt = os.urandom(16)
digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 200_000)
hash_value = "pbkdf2$200000$%s$%s" % (base64.b64encode(salt).decode(), base64.b64encode(digest).decode())
secret = secrets.token_urlsafe(48)

# Keep only valid lines from the old file. This drops broken admin lines and leftover fragments.
kept = []
if os.path.exists(ENV_PATH):
    with open(ENV_PATH, "r", encoding="utf-8") as f:
        for line in f.read().splitlines():
            ok = line.strip() == "" or line.lstrip().startswith("#") or re.match(r"^[A-Z][A-Z0-9_]*=", line)
            if ok and not line.startswith("ADMIN_"):
                kept.append(line)
while kept and kept[-1].strip() == "":
    kept.pop()

kept += ["", "# ---- Admin dashboard ----",
         "ADMIN_EMAIL=" + email,
         "ADMIN_PASSWORD_HASH='" + hash_value + "'",
         "ADMIN_JWT_SECRET='" + secret + "'"]

with open(ENV_PATH, "w", encoding="utf-8", newline="\n") as f:
    f.write("\n".join(kept) + "\n")
print("Saved admin settings to backend/.env. Restart the server.")