# jam-testing

Smoke testing and performance measurement suite for JAM implementations.
Each team provides a Docker image that speaks the
[JAM Fuzz protocol](https://github.com/davxy/jam-conformance/tree/main/fuzz-proto),
and the suite runs two stages against it:

- **[Minifuzz](./minifuzz/)** — replays pre-constructed protocol examples and
  validates that the implementation handles the bare minimum features correctly
  and returns expected responses. Acts as a gate: if minifuzz fails, performance
  tests are skipped.
- **[Picofuzz](./picofuzz/)** — sends STF traces at the implementation without
  checking responses. Its only purpose is to measure block import performance
  (timings are displayed on the [dashboard](#dashboard)).

## Minifuzz + Performance

| Team | Status |
|------|--------|
| typeberry | [![Picofuzz: typeberry](https://github.com/FluffyLabs/jam-testing/actions/workflows/typeberry-picofuzz.yml/badge.svg)](https://github.com/FluffyLabs/jam-testing/actions/workflows/typeberry-picofuzz.yml) |
| pyjamaz | [![Picofuzz: pyjamaz](https://github.com/FluffyLabs/jam-testing/actions/workflows/pyjamaz-picofuzz.yml/badge.svg)](https://github.com/FluffyLabs/jam-testing/actions/workflows/pyjamaz-picofuzz.yml) |
| boka | [![Picofuzz: boka](https://github.com/FluffyLabs/jam-testing/actions/workflows/boka-picofuzz.yml/badge.svg)](https://github.com/FluffyLabs/jam-testing/actions/workflows/boka-picofuzz.yml) |
| turbojam | [![Picofuzz: turbojam](https://github.com/FluffyLabs/jam-testing/actions/workflows/turbojam-picofuzz.yml/badge.svg)](https://github.com/FluffyLabs/jam-testing/actions/workflows/turbojam-picofuzz.yml) |
| graymatter | [![Picofuzz: graymatter](https://github.com/FluffyLabs/jam-testing/actions/workflows/graymatter-picofuzz.yml/badge.svg)](https://github.com/FluffyLabs/jam-testing/actions/workflows/graymatter-picofuzz.yml) |
| jam4s | [![Picofuzz: jam4s](https://github.com/FluffyLabs/jam-testing/actions/workflows/jam4s-picofuzz.yml/badge.svg)](https://github.com/FluffyLabs/jam-testing/actions/workflows/jam4s-picofuzz.yml) |
| pbnjam | [![Picofuzz: pbnjam](https://github.com/FluffyLabs/jam-testing/actions/workflows/pbnjam-picofuzz.yml/badge.svg)](https://github.com/FluffyLabs/jam-testing/actions/workflows/pbnjam-picofuzz.yml) |
| javajam | [![Picofuzz: javajam](https://github.com/FluffyLabs/jam-testing/actions/workflows/javajam-picofuzz.yml/badge.svg)](https://github.com/FluffyLabs/jam-testing/actions/workflows/javajam-picofuzz.yml) |
| jamforge | [![Picofuzz: jamforge](https://github.com/FluffyLabs/jam-testing/actions/workflows/jamforge-picofuzz.yml/badge.svg)](https://github.com/FluffyLabs/jam-testing/actions/workflows/jamforge-picofuzz.yml) |

## How it works

1. A **reusable GitHub Actions workflow** pulls your Docker image, starts it
   with a shared Unix socket volume, and runs tests against it.
2. **Minifuzz** runs first as a gate — it replays pre-constructed fuzz protocol
   examples (forks and no_forks) and validates that the implementation returns
   correct responses. If minifuzz fails, picofuzz is skipped entirely.
3. **Picofuzz** sends STF traces to the implementation and collects per-trace
   timing statistics (it does not verify responses).
4. Each team has its own workflow file (e.g. `typeberry-picofuzz.yml`) that
   passes team-specific config (image, command, env vars, memory) to the
   reusable workflow.
5. Tests run on a self-hosted runner. Timing results (CSV with per-trace
   percentiles) are uploaded as artifacts and displayed on the dashboard.

### Picofuzz suites

| Suite | Description |
|---|---|
| `fallback` | Fallback STF traces |
| `safrole` | Safrole STF traces |
| `storage` | Storage STF traces |
| `storage_light` | Lightweight storage traces |

### Readiness detection

The suite needs to know when your implementation is ready to accept
connections on the Unix socket. Two modes are supported:

- **Log pattern** (recommended if your impl prints a startup message):
  set `readiness_pattern` to a regex matching your ready log line.
- **Socket probe** (default): polls for the socket file to appear inside the
  Docker volume. Works with any implementation, no config needed.

## Adding your team

1. **Provide a Docker image** that accepts a Unix socket path and speaks the
   [JAM Fuzz protocol](https://github.com/davxy/jam-conformance/tree/main/fuzz-proto).
   The image must be publicly pullable (or accessible to the runner).

2. **Create a workflow file** at `.github/workflows/<team>-picofuzz.yml`:

   ```yaml
   name: "Picofuzz: myteam"

   on:
     schedule:
       - cron: '0 6 * * *'
     workflow_dispatch:

   jobs:
     test:
       uses: ./.github/workflows/reusable-picofuzz.yml
       with:
         target_name: myteam
         docker_image: 'ghcr.io/myorg/myimage:latest'
         docker_cmd: 'fuzz --socket {TARGET_SOCK}'
         # Optional overrides:
         # docker_env: 'MY_VAR=value'
         # docker_memory: '512m'
         # docker_platform: 'linux/amd64'
         # readiness_pattern: 'Server ready'
   ```

3. **Create a team directory** at `teams/<team>/` for any team-specific
   scripts or data you might add later.

4. **Open a PR** and trigger the workflow via `workflow_dispatch` to verify
   everything works.

### Workflow inputs reference

| Input | Required | Default | Description |
|---|---|---|---|
| `target_name` | yes | — | Your implementation name |
| `docker_image` | yes | — | Full image reference |
| `docker_cmd` | yes | — | Command with `{TARGET_SOCK}` placeholder for the socket path |
| `docker_env` | no | `""` | Space-separated `KEY=VALUE` pairs passed as `-e` flags |
| `docker_memory` | no | `"512m"` | Container memory limit |
| `docker_platform` | no | `"linux/amd64"` | Platform for `docker pull` |
| `readiness_pattern` | no | `""` | Regex matched against stdout to detect readiness |
| `timeout_minutes` | no | `10` | Per-suite timeout |
| `max_wait_minutes` | no | `120` | Max queuing time before the job self-cancels |
| `test_suites` | no | all four | JSON array of picofuzz suite names to run |

## Running locally

```bash
# Install dependencies
npm ci

# Build the picofuzz Docker image
npm run build-docker -w @fluffylabs/picofuzz

# Pull the target image
docker pull --platform=linux/amd64 ghcr.io/fluffylabs/typeberry:latest

# Prepare results directory
mkdir -p ./picofuzz-result

# Run a single suite
TARGET_NAME=typeberry \
TARGET_IMAGE='ghcr.io/fluffylabs/typeberry:latest' \
TARGET_CMD='--version=1 fuzz-target {TARGET_SOCK}' \
TARGET_READINESS_PATTERN='PVM Backend' \
npx tsx --test tests/picofuzz/fallback.test.ts
```

### Environment variables

| Variable | Description |
|---|---|
| `TARGET_NAME` | Implementation name |
| `TARGET_IMAGE` | Docker image to test |
| `TARGET_CMD` | Container command (`{TARGET_SOCK}` is replaced with the socket path) |
| `TARGET_ENV` | Space-separated `KEY=VALUE` pairs |
| `TARGET_MEMORY` | Container memory limit (default `512m`) |
| `TARGET_READINESS_PATTERN` | Regex for log-based readiness |

## Regenerating minifuzz traces

The `minifuzz-traces/` directory contains pre-captured request-response pairs
generated by running picofuzz in capture mode against typeberry (reference
implementation). These traces must be regenerated whenever the STF test data
in `picofuzz-stf-data/` is updated:

```bash
./minifuzz-traces/populate.sh
```

The script builds picofuzz, pulls typeberry, and runs capture for all four
suites. It tracks the STF data version and skips regeneration if already
up-to-date.

## Project structure

```
.github/workflows/
  reusable-picofuzz.yml       # Core reusable workflow (minifuzz + picofuzz)
  <team>-picofuzz.yml         # Per-team workflow files
minifuzz/                     # Minifuzz Docker image (Python fuzz example runner)
minifuzz-traces/              # Captured request-response pairs from typeberry
  populate.sh                 # Script to regenerate traces
  {suite}/                    # Per-suite trace files (fallback, safrole, etc.)
picofuzz/                     # Picofuzz tool (fuzz protocol client + capture mode)
tests/
  common.ts                   # Target startup & shared helpers
  external-process.ts         # Docker process management
  minifuzz/
    common.ts                 # Minifuzz test harness
    *.test.ts                 # Minifuzz suites (forks, no_forks, fallback, safrole, ...)
  picofuzz/
    common.ts                 # Picofuzz test harness
    *.test.ts                 # Per-suite test files
teams/<team>/                 # Team-specific scripts & data
picofuzz-stf-data/            # Git submodule: STF test traces
picofuzz-conformance-data/    # Git submodule: jam-conformance (minifuzz examples)
```

## License

MPL-2.0
