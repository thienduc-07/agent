import os
from pathlib import Path
from typing import Union, Optional
from backend.app.core.config import settings

FORBIDDEN_FILE_PATTERNS = {
    ".env",
    ".env.local",
    ".env.production",
    "id_rsa",
    "id_dsa",
    "id_ecdsa",
    "id_ed25519",
}

FORBIDDEN_EXTENSIONS = {
    ".key",
    ".pem",
    ".pfx",
    ".p12",
}

class PathSecurityError(PermissionError):
    """Raised when a path traversal or forbidden file access is detected."""
    pass

def safe_resolve_path(
    path_input: Union[str, Path],
    base_root: Optional[Union[str, Path]] = None,
    must_exist: bool = False,
    allow_write: bool = False,
) -> Path:
    """
    Safely resolves a path, preventing directory traversal outside the base_root,
    symlink escaping, and access to forbidden credential or environment files.
    """
    root = Path(base_root or settings.WORKSPACE_ROOT).resolve()
    path_str = str(path_input).strip()

    if not path_str:
        return root

    # Handle absolute paths vs relative paths
    raw_path = Path(path_str)
    if raw_path.is_absolute():
        # If absolute, verify it begins inside root
        candidate = raw_path.resolve()
    else:
        candidate = (root / raw_path).resolve()

    # Symlink and Path Traversal Check:
    # candidate must strictly reside within root
    try:
        candidate.relative_to(root)
    except ValueError as e:
        raise PathSecurityError(
            f"Path traversal violation: '{path_str}' escapes allowed boundary '{root}'"
        ) from e

    # Check forbidden filenames and extensions
    file_name = candidate.name.lower()
    if file_name in FORBIDDEN_FILE_PATTERNS or any(file_name.startswith(p) for p in [".env."]):
        raise PathSecurityError(f"Access to credential/environment file '{file_name}' is strictly forbidden.")

    if candidate.suffix.lower() in FORBIDDEN_EXTENSIONS:
        raise PathSecurityError(f"Access to private key/certificate file '{file_name}' is strictly forbidden.")

    if must_exist and not candidate.exists():
        raise FileNotFoundError(f"Target file does not exist: '{path_str}'")

    return candidate
