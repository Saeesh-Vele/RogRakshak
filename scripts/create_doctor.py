#!/usr/bin/env python3
"""Usage: python3 scripts/create_doctor.py --email doc@hospital.org --name "Dr. S. Kulkarni" --role "Infection Control Lead"

LOCAL-ONLY developer tool. Creates a RogRakshak doctor account directly via the
Supabase Auth Admin API, because the app has no self-service sign-up.

Reads SUPABASE_URL and SUPABASE_SECRET_KEY from scripts/.env.local (gitignored).
That key is a full admin credential: it bypasses row-level security and can read
or delete any user. It is deliberately NOT prefixed with NEXT_PUBLIC_ and lives
outside frontend/, so Next.js never loads it and it cannot reach the browser
bundle. Never paste it into frontend/.env.local.

Depends on the standard library only — no pip install, no virtualenv.
"""

from __future__ import annotations

import argparse
import base64
import json
import secrets
import ssl
import string
import sys
import urllib.error
import urllib.request
from pathlib import Path

# Same seven roles the removed sign-up form offered. The value is stored in
# user_metadata.role and rendered verbatim in the app's top bar.
ROLES = [
    "Infection Control Lead",
    "Infection Preventionist",
    "Clinical Microbiologist",
    "Hospital Epidemiologist",
    "Intensivist",
    "Attending Physician",
    "Nursing Superintendent",
]

ENV_FILE = Path(__file__).resolve().parent / ".env.local"
MIN_PASSWORD_LENGTH = 8


def load_env(path: Path) -> dict[str, str]:
    """Minimal KEY=VALUE reader — avoids a python-dotenv dependency."""
    values: dict[str, str] = {}
    if not path.exists():
        return values
    for line in path.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        values[key.strip()] = value.strip().strip('"').strip("'")
    return values


def looks_like_publishable_key(key: str) -> bool:
    """
    Reject the browser-safe key early rather than letting the API return a
    confusing 401. Covers both key formats Supabase issues:
      - new style: sb_publishable_... (safe) vs sb_secret_... (admin)
      - legacy JWT: {"role": "anon"} (safe) vs {"role": "service_role"} (admin)
    """
    if key.startswith("sb_publishable_"):
        return True
    if key.startswith("sb_secret_"):
        return False

    parts = key.split(".")
    if len(parts) == 3:  # looks like a JWT
        payload = parts[1] + "=" * (-len(parts[1]) % 4)
        try:
            claims = json.loads(base64.urlsafe_b64decode(payload))
        except Exception:
            return False
        return claims.get("role") != "service_role"
    return False


def build_ssl_context() -> ssl.SSLContext:
    """
    The python.org macOS builds ship with an empty CA directory until you run
    "Install Certificates.command", which makes every HTTPS call fail with
    CERTIFICATE_VERIFY_FAILED. Fall back to certifi's bundle when the default
    trust store is empty — certificate verification stays fully enabled either
    way; this only points OpenSSL at a bundle that actually exists.
    """
    context = ssl.create_default_context()
    if context.cert_store_stats()["x509"] > 0:
        return context

    try:
        import certifi
    except ImportError:
        sys.exit(
            "error: this Python has no CA certificates, so HTTPS cannot be verified.\n"
            "       fix with:  /Applications/Python 3.x/Install Certificates.command\n"
            "       or:        python3 -m pip install certifi"
        )
    return ssl.create_default_context(cafile=certifi.where())


def generate_password(length: int = 16) -> str:
    """Readable temporary password — the doctor is expected to change it."""
    alphabet = string.ascii_letters + string.digits
    return "".join(secrets.choice(alphabet) for _ in range(length))


def create_user(
    base_url: str, secret_key: str, email: str, password: str, name: str, role: str
) -> dict:
    body = json.dumps(
        {
            "email": email,
            "password": password,
            # Pre-confirmed: there is no inbox round-trip in a closed system,
            # so the doctor can sign in the moment they get the credentials.
            "email_confirm": True,
            "user_metadata": {"full_name": name, "role": role},
        }
    ).encode()

    request = urllib.request.Request(
        f"{base_url.rstrip('/')}/auth/v1/admin/users",
        data=body,
        method="POST",
        headers={
            "Content-Type": "application/json",
            "apikey": secret_key,
            "Authorization": f"Bearer {secret_key}",
        },
    )

    try:
        with urllib.request.urlopen(
            request, timeout=30, context=build_ssl_context()
        ) as response:
            return json.loads(response.read())
    except urllib.error.HTTPError as err:
        detail = err.read().decode(errors="replace")
        try:
            parsed = json.loads(detail)
            detail = parsed.get("msg") or parsed.get("message") or detail
        except Exception:
            pass
        sys.exit(f"error: Supabase returned HTTP {err.code} — {detail}")
    except urllib.error.URLError as err:
        sys.exit(f"error: could not reach {base_url} — {err.reason}")


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Create a RogRakshak doctor account in Supabase.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="Roles:\n  " + "\n  ".join(ROLES),
    )
    parser.add_argument("--email", required=True, help="doctor's work email")
    parser.add_argument(
        "--name", required=True, help='display name, e.g. "Dr. S. Kulkarni"'
    )
    parser.add_argument(
        "--role", required=True, choices=ROLES, metavar="ROLE", help="clinical role"
    )
    parser.add_argument(
        "--password",
        help="temporary password (generated if omitted)",
    )
    args = parser.parse_args()

    if not args.name.strip():
        sys.exit("error: --name cannot be blank; it is the app's top-bar identity")

    env = load_env(ENV_FILE)
    base_url = env.get("SUPABASE_URL", "").strip()
    secret_key = env.get("SUPABASE_SECRET_KEY", "").strip()

    if not base_url or not secret_key:
        sys.exit(
            f"error: SUPABASE_URL and SUPABASE_SECRET_KEY must be set in {ENV_FILE}\n"
            f"       copy {ENV_FILE.name}.example and fill it in "
            "(Supabase Dashboard -> Project Settings -> API)"
        )

    if looks_like_publishable_key(secret_key):
        sys.exit(
            "error: SUPABASE_SECRET_KEY looks like the publishable/anon key, which "
            "cannot create users.\n       Use the secret (service_role) key instead."
        )

    password = args.password or generate_password()
    if len(password) < MIN_PASSWORD_LENGTH:
        sys.exit(f"error: password must be at least {MIN_PASSWORD_LENGTH} characters")

    user = create_user(
        base_url, secret_key, args.email.strip(), password, args.name.strip(), args.role
    )

    print("\nDoctor account created.\n")
    print(f"  Email     {user.get('email', args.email)}")
    print(f"  Password  {password}")
    print(f"  Name      {args.name.strip()}")
    print(f"  Role      {args.role}")
    print(f"  User ID   {user.get('id', '(unknown)')}")
    print("\nHand these over out of band (in person, Slack DM) — not by email.\n")


if __name__ == "__main__":
    main()
