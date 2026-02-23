# Agent Instructions

## Pre-commit hooks

Before committing, always ensure pre-commit hooks are installed. Run once per clone:

```bash
./scripts/install-hooks.sh
```

Or: `just install-hooks`

If the hooks are already installed, this is a no-op. The hooks run the test suite on every commit and abort the commit on failure.
