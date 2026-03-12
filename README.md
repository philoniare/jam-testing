# jam-testing

Performance and smoke testing suite for JAM implementations.
Each team provides a Docker image, and the suite runs [minifuzz](./minifuzz/)
conformance examples and [picofuzz](./picofuzz/) traces against it,
collecting per-trace timing statistics.

## Conformance status

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
   examples (forks and no_forks) and validates responses. If minifuzz fails,
   picofuzz is skipped entirely.
3. **Picofuzz** runs the full test suites with detailed timing measurements.
4. Each team has its own workflow file (e.g. `typeberry-picofuzz.yml`) that
   passes team-specific config (image, command, env vars, memory) to the
   reusable workflow.
5. Tests run on a self-hosted runner. Results (CSV with per-trace timing
   percentiles) are uploaded as artifacts.

### Test suites

| Suite | Data source | Description |
|---|---|---|
| `fallback` | `picofuzz-stf-data` | Fallback STF traces |
| `safrole` | `picofuzz-stf-data` | Safrole STF traces |
| `storage` | `picofuzz-stf-data` | Storage STF traces |
| `storage_light` | `picofuzz-stf-data` | Lightweight storage traces |
| `conformance` | `picofuzz-conformance-data` | Cross-implementation conformance traces |

### Readiness detection

The suite needs to know when your implementation is ready to accept
connections on the Unix socket. Two modes are supported:

- **Log pattern** (recommended if your impl prints a startup message):
  set `readiness_pattern` to a regex matching your ready log line.
- **Socket probe** (default): polls for the socket file to appear inside the
  Docker volume. Works with any implementation, no config needed.

## Adding your team

1. **Provide a Docker image** that accepts a Unix socket path and speaks the
   [picofuzz fuzz protocol](./picofuzz/). The image must be publicly pullable
   (or accessible to the runner).

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
         # docker_cmd_conformance: 'fuzz --conformance --socket {TARGET_SOCK}'
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
| `docker_cmd_conformance` | no | `""` | Override command for the conformance suite |
| `docker_env` | no | `""` | Space-separated `KEY=VALUE` pairs passed as `-e` flags |
| `docker_memory` | no | `"512m"` | Container memory limit |
| `docker_platform` | no | `"linux/amd64"` | Platform for `docker pull` |
| `readiness_pattern` | no | `""` | Regex matched against stdout to detect readiness |
| `timeout_minutes` | no | `10` | Per-suite timeout |
| `max_wait_minutes` | no | `120` | Max queuing time before the job self-cancels |
| `test_suites` | no | all five | JSON array of suite names to run |

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
| `TARGET_CMD_CONFORMANCE` | Optional override for conformance suite |
| `TARGET_ENV` | Space-separated `KEY=VALUE` pairs |
| `TARGET_MEMORY` | Container memory limit (default `512m`) |
| `TARGET_READINESS_PATTERN` | Regex for log-based readiness |

## Project structure

```
.github/workflows/
  reusable-picofuzz.yml       # Core reusable workflow (minifuzz + picofuzz)
  <team>-picofuzz.yml         # Per-team workflow files
minifuzz/                     # Minifuzz Docker image (Python fuzz example runner)
picofuzz/                     # Picofuzz tool (fuzz protocol client)
tests/
  common.ts                   # Target startup & shared helpers
  external-process.ts         # Docker process management
  minifuzz/
    common.ts                 # Minifuzz test harness
    *.test.ts                 # Minifuzz test suites (forks, no_forks)
  picofuzz/
    common.ts                 # Picofuzz test harness
    *.test.ts                 # Per-suite test files
teams/<team>/                 # Team-specific scripts & data
picofuzz-stf-data/            # Git submodule: STF test traces
picofuzz-conformance-data/    # Git submodule: conformance traces
```

## License

MPL-2.0
