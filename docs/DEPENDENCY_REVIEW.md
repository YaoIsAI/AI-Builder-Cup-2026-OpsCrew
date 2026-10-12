# OpsCrew dependency review before cloud deployment

Reviewed 2026-10-11 with Node 24.14.0/npm 11.9.0. The final accepted lockfile must pass `npm audit --omit=dev`; the earlier S3 production audit had zero findings. Pre-cloud preparation moves Vite and its React/Tailwind plugins to dev dependencies, so the runtime omits them alongside Firebase CLI, tsx and TypeScript. `npm run smoke:artifact` verifies a fresh production-only install and exact native runtime layout; it does not prove a Linux image build.

The [final native artifact evidence](acceptance/PRECLOUD-runtime-artifact-2026-10-11-final.json) passed 12 checks in 80,416 ms and the accompanying production audit returned zero findings in every severity. It binds 29 source/configuration/built-asset files with before/after raw SHA-256 equality; source did not change during the check, and its owned temporary directory was removed. The base commit is the merged S3 commit with the pre-cloud working changes explicitly recorded; the final release manifest supplies the later clean release binding.

The full installed development tree currently has 12 audit findings (7 high, 5 moderate), confined to Firebase CLI/transitive tool chains. The reviewed current registry version is `firebase-tools@15.33.0`; its dependencies still contain these chains. Do not claim a clean full development audit or apply `npm audit fix --force`: the suggested CLI downgrade does not prove safe compatibility/remediation.

| Chain | Primary reviewed evidence | Handling |
| --- | --- | --- |
| CLI → chokidar → braces 3.0.3 | Advisory lists no patched version for stack exhaustion. [Advisory](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm) | Trusted local/operator patterns only; no invented override; CLI excluded from runtime |
| CLI → Pub/Sub → OpenTelemetry core 1.30.1 | Baggage fix begins at 2.8.0. [Maintainer advisory](https://github.com/open-telemetry/opentelemetry-js/security/advisories/GHSA-8988-4f7v-96qf) | Major override requires upstream compatibility evidence; not forced |
| CLI → proxy/PAC/get-uri → basic-ftp 5.3.1 | Parser fix at 6.2.1+. [Maintainer advisory](https://github.com/patrickjuchli/basic-ftp/security/advisories/GHSA-c475-qrg2-pj4r) | No assumed-safe major override; dev proxy components excluded from runtime |
| CLI → gaxios 6.7.1 → uuid 9.0.1 | Buffer-writing v3/v5/v6 issue; dependency remains audit affected. [Maintainer advisory](https://github.com/uuidjs/uuid/security/advisories/GHSA-w5hq-g745-h8pq) | Finding retained; no untested major gaxios/uuid override |
| CLI/superstatic → optional re2 1.24.1 | Fixed at 1.26.1+; reviewed registry requires Node 24.15+ or compatible 22/26. [Maintainer advisory](https://github.com/advisories/GHSA-j4r3-hg7j-8chg) | Host 24.14 cannot satisfy patched engines; CLI excluded from production; upgrading it alone would not fix braces |

The global `@grpc/grpc-js` override remains pinned at 1.14.6 after S3 review. Historical reports remain unchanged. Rerun production/artifact/emulator acceptance after any upstream update; blanket overrides/downgrades need separate compatibility evidence. Record the actual official Node base digest and image scanner outcome during the teammate's cloud build.
