# OpsCrew Cloud Run deployment runbook

Updated 2026-10-11 for the pre-cloud S4 implementation. No command in this document has provisioned or deployed a cloud resource during local preparation. The project owner has assigned cloud deployment and actual resource testing to the teammate; follow [the handoff](CLOUD_TEAMMATE_HANDOFF.md) before account or resource operations. Historical S1/S2 preparation is retained in [DEPLOYMENT.md](DEPLOYMENT.md).

The release uses the Google AI Studio Build origin, server-side Gemini Developer API, Firebase Authentication, Admin Firestore, and Cloud Run. An Antigravity or ADK migration is not required by this architecture. An AI Studio development preview or Firebase emulator run does not establish the final contest endpoint.

## Reviewed project and cost inputs

Use an owner-approved sandbox project, preferably the same Google Cloud/Firebase project for runtime and visitor identity. Confirm actual project ID, billing/credits, organization policy, model entitlement/quota, region, Firestore location, identities, and resources before creating chargeable infrastructure. The approved USD 40 management target includes model, compute, builds, image storage, secrets, logs and database. Budget alerts and maximum instances are not monetary hard caps. Set project actual-cost alerts at 50%, 75%, 90%, and 100%, plus a forecast alert, and monitor actual spending. [Budget behavior](https://docs.cloud.google.com/billing/docs/how-to/budgets)

This workstation has no detected Docker/Podman daemon or Google Cloud CLI. Local packaging verification uses Node 24 native startup and a fresh production-only dependency installation. The first actual Linux image build belongs to the teammate's Cloud Build gate. The image must support `linux/amd64`, listen on `0.0.0.0:$PORT`, and let Cloud Run terminate TLS. [Container requirements](https://docs.cloud.google.com/run/docs/container-contract)

| Resource | Initial reviewed configuration |
| --- | --- |
| Cloud Run | One `opscrew` service; minimum 0, maximum 1; 1 CPU; 512 MiB; request-based CPU; concurrency 4; 120-second request timeout; initially private |
| Artifact Registry | Regional Docker repository; commit tag for identification and immutable `@sha256:` deployment reference |
| Cloud Build | Manual Docker build; dedicated builder; private source/log bucket; explicit upload exclusions |
| Secret Manager | Separate server Gemini key; pinned numeric version; no value in an image/build argument |
| Firebase Auth | Registered Web app; Anonymous provider; public Web configuration distinct from the Gemini secret |
| Firestore | Standard/Native `(default)` database; owner-confirmed location; deny-all client rules; two owner/date composite indexes |
| Runtime identity | Attached service account/ADC; selected-secret Accessor; Datastore User; Firebase Authentication Viewer |

The 120-second platform timeout leaves transport margin around the application's 90-second workflow deadline, without establishing measured latency. A Cloud Run timeout may leave container work running; case confirmation therefore uses durable idempotency and independent recovery/readback. [Request timeout behavior](https://docs.cloud.google.com/run/docs/configuring/request-timeout)

## Credentials and Firebase preparation

Use the official Google Cloud CLI or approved Cloud Shell. A Comet Google AI Studio login does not authenticate gcloud, Firebase CLI, or ADC. The human operator completes any login/consent/verification; session credentials must be rechecked on resumption. Do not download a service-account JSON key.

In Firebase Console, select the reviewed existing project, add Firebase if required, register a Web app, and obtain its `apiKey`, `authDomain`, `appId`, and project ID. Enable Authentication → Sign-in method → Anonymous. Review authorized domains for the final Cloud Run/custom host and test signup from that origin, including the intended shared-network judge path. [Anonymous authentication](https://firebase.google.com/docs/auth/web/anonymous-auth)

Create/reuse the `(default)` Firestore database in the confirmed location. The app addresses this database; do not silently substitute another database ID. Deploy the checked-in deny-all client rules and indexes using an appropriately privileged operator, explicitly overriding the local `.firebaserc` demo default:

```powershell
# From aistudio-export-2026-10-07 after the operator signs in.
$ProjectId = 'YOUR_APPROVED_PROJECT_ID'
if ($ProjectId -like 'YOUR_*' -or $ProjectId -like 'demo-*') { throw 'Choose the approved real project.' }
npx --no-install firebase deploy --only firestore:rules,firestore:indexes --project $ProjectId
```

Wait until both `owner_id`/`created_at` indexes on `opscrew_s3_runs` and `opscrew_s3_cases` are ready, and verify real history queries. Emulator acceptance does not prove production indexes are built. [Index deployment](https://firebase.google.com/docs/firestore/query-data/indexing)

Restrict the public Firebase Web key to the required Firebase APIs. The server Gemini key is separate and restricted to the Gemini Developer API; never enable that API on the public Web key. [Firebase key separation](https://firebase.google.com/docs/projects/api-keys)

Direct browser Firestore operations remain denied, including authenticated visitors. Admin access uses IAM and bypasses rules, so server ownership checks must pass real acceptance. Datastore User grants database data access, rather than per-collection restrictions; a dedicated sandbox project reduces the scope. [Server authorization](https://firebase.google.com/docs/firestore/security/iam)

## Identities and future one-time provisioning

| Principal | Reviewed access |
| --- | --- |
| Provisioner | Selected API/resource creation and scoped IAM; billing linkage separately owner approved |
| Human operator | Cloud Build Editor + Service Usage Consumer; Service Account User on builder/runtime; image Reader; build bucket Object Admin; Cloud Run Admin for initial configuration; Firebase rules/index deployment privileges |
| Builder | Repository Writer and private build-source/log bucket Object Admin; no model secret, deploy, Auth or database access |
| Runtime | Secret Accessor on the selected secret; project Datastore User and Firebase Auth Viewer; no Editor/Owner/build/storage administration |
| Named private tester | Cloud Run Invoker on this service; independent Firebase visitor authentication for business APIs |

Auth Viewer includes `firebaseauth.users.get` for revoked/disabled-user verification; the server needs no user creation/deletion role. Keep Google's managed service-agent roles assigned only to their service agents. [Auth permissions](https://docs.cloud.google.com/iam/docs/roles-permissions/firebaseauth)

Inspect/reuse existing matching resources before one-time creation. Every command below names the reviewed project. PowerShell 7.3+ stops on failed native commands.

```powershell
$ErrorActionPreference = 'Stop'
$PSNativeCommandUseErrorActionPreference = $true
$ProjectId = 'YOUR_APPROVED_PROJECT_ID'
$Region = 'YOUR_CONFIRMED_REGION'
$OperatorEmail = 'YOUR_OPERATOR_EMAIL'
$Service = 'opscrew'
$Repository = 'opscrew'
$BuildBucket = 'YOUR_PRIVATE_BUILD_BUCKET'
$RuntimeName = 'opscrew-runtime'
$BuilderName = 'opscrew-builder'
$SecretName = 'opscrew-gemini-api-key'
if (@($ProjectId,$Region,$OperatorEmail,$BuildBucket) | Where-Object { $_ -like 'YOUR_*' }) { throw 'Review all placeholders.' }
$RuntimeSa = "$RuntimeName@$ProjectId.iam.gserviceaccount.com"
$BuilderSa = "$BuilderName@$ProjectId.iam.gserviceaccount.com"
gcloud auth list
gcloud projects describe $ProjectId
gcloud billing projects describe $ProjectId
gcloud services enable run.googleapis.com artifactregistry.googleapis.com cloudbuild.googleapis.com secretmanager.googleapis.com iam.googleapis.com storage.googleapis.com generativelanguage.googleapis.com firestore.googleapis.com identitytoolkit.googleapis.com firebase.googleapis.com --project=$ProjectId
gcloud iam service-accounts create $RuntimeName --display-name='OpsCrew runtime' --project=$ProjectId
gcloud iam service-accounts create $BuilderName --display-name='OpsCrew builder' --project=$ProjectId
gcloud artifacts repositories create $Repository --repository-format=docker --location=$Region --project=$ProjectId
gcloud storage buckets create "gs://$BuildBucket" --location=$Region --uniform-bucket-level-access --public-access-prevention --project=$ProjectId
gcloud secrets create $SecretName --replication-policy=user-managed --locations=$Region --project=$ProjectId
gcloud secrets add-iam-policy-binding $SecretName "--member=serviceAccount:$RuntimeSa" --role=roles/secretmanager.secretAccessor --project=$ProjectId
gcloud projects add-iam-policy-binding $ProjectId "--member=serviceAccount:$RuntimeSa" --role=roles/datastore.user
gcloud projects add-iam-policy-binding $ProjectId "--member=serviceAccount:$RuntimeSa" --role=roles/firebaseauth.viewer
gcloud artifacts repositories add-iam-policy-binding $Repository --location=$Region "--member=serviceAccount:$BuilderSa" --role=roles/artifactregistry.writer --project=$ProjectId
gcloud storage buckets add-iam-policy-binding "gs://$BuildBucket" "--member=serviceAccount:$BuilderSa" --role=roles/storage.objectAdmin --project=$ProjectId
gcloud storage buckets add-iam-policy-binding "gs://$BuildBucket" "--member=user:$OperatorEmail" --role=roles/storage.objectAdmin --project=$ProjectId
gcloud artifacts repositories add-iam-policy-binding $Repository --location=$Region "--member=user:$OperatorEmail" --role=roles/artifactregistry.reader --project=$ProjectId
gcloud iam service-accounts add-iam-policy-binding $BuilderSa "--member=user:$OperatorEmail" --role=roles/iam.serviceAccountUser --project=$ProjectId
gcloud iam service-accounts add-iam-policy-binding $RuntimeSa "--member=user:$OperatorEmail" --role=roles/iam.serviceAccountUser --project=$ProjectId
foreach ($Role in @('roles/cloudbuild.builds.editor','roles/serviceusage.serviceUsageConsumer','roles/run.admin')) {
    gcloud projects add-iam-policy-binding $ProjectId "--member=user:$OperatorEmail" "--role=$Role"
}
```

The builder writes source/logs to the private bucket and is explicitly selected because default build identity varies by project. [Builder/log requirements](https://docs.cloud.google.com/build/docs/securing-builds/configure-user-specified-service-accounts)

Import the valid Gemini key through the approved Secret Manager Console input; record its name and numeric version only. Confirm actual model access/quota. Cloud Run ADC authenticates Admin Firestore/Auth; Secret Manager supplies the separate Gemini Developer API key to the server environment. No credential file is configured. [Service identity](https://docs.cloud.google.com/run/docs/configuring/services/service-identity), [Secret environment](https://docs.cloud.google.com/run/docs/configuring/services/secrets)

## Source, build and private deployment

```powershell
npm ci
npm test
npm run lint
npm run build
npm run smoke:production
npm run smoke:artifact
npm audit --omit=dev
Copy-Item -LiteralPath deploy/cloud-release.example.json -Destination deploy/cloud-release.local.json
# Edit public fields and numeric secret version; never paste the Gemini value.
pwsh -File scripts/cloud-release.ps1 -ConfigPath deploy/cloud-release.local.json -Action Validate
pwsh -File scripts/cloud-release.ps1 -ConfigPath deploy/cloud-release.local.json -Action Plan
pwsh -File scripts/cloud-release.ps1 -ConfigPath deploy/cloud-release.local.json -Action Build
# Record the returned digest/build ID; inspect the actual Linux image result.
pwsh -File scripts/cloud-release.ps1 -ConfigPath deploy/cloud-release.local.json -Action DeployPrivate -ImageDigest 'sha256:YOUR_ACCEPTED_64_HEX_DIGEST'
```

Default `Validate` and `Plan` call no cloud tool. `Build` and `DeployPrivate` require an accepted clean commit and the official gcloud command. The helper never provisions resources, logs in or publishes automatically. `.dockerignore` also controls Cloud Build source upload, excluding environments, credentials, fixtures, emulator state and local tools. [Source upload flags](https://docs.cloud.google.com/sdk/gcloud/reference/builds/submit)

The Docker runtime contains production dependencies, `server.ts`, `server/`, `src/domain/` and the built frontend; it runs as user `node` using Node 24 native erasable TypeScript. Vite/plugins, tsx, TypeScript and Firebase CLI are omitted. `smoke:artifact` verifies this exact native file/dependency layout and HTTP behavior, without credentials; it does not prove Linux container execution. Record base/image digests, actual Node/npm versions, source SHA, lock hash, build ID, ready revision, runtime identity, region and secret version. [Node TypeScript](https://nodejs.org/docs/latest-v24.x/api/typescript.html)

Local execution is recorded in the [immutable final native artifact report](acceptance/PRECLOUD-runtime-artifact-2026-10-11-final.json): 12/12 checks, 80,416 ms, zero production audit findings, unchanged hashes for 29 bound files, and no remaining owned temporary directory. Actual Linux/Cloud Run acceptance remains unexecuted.

## Real-resource checks and operational controls

Initial deployment is private: grant only named testers Cloud Run Invoker and inspect service/project/inherited access. Cloud Run identity and Firebase ID tokens are different. For direct private business API requests, put the platform token in `X-Serverless-Authorization` and Firebase token in `Authorization`; keep both in memory. Browser checks can use the authenticated Cloud Run local proxy. [Platform token header](https://docs.cloud.google.com/run/docs/authenticating/service-to-service), [Developer testing](https://docs.cloud.google.com/run/docs/authenticating/developers)

`/api/health` is liveness. `/api/ready` must return `200`, `ready:true`, `stage:S4`, `case_backend_mode:firestore`, `model_calls:0`. It checks configuration and an Admin database read without Gemini; it does not prove model availability, Auth revocation IAM, writes, indexes, or latency. Startup readiness probing may perform a bounded database read. SIGTERM grants active work up to eight seconds before process exit. [Startup probes](https://docs.cloud.google.com/run/docs/configuring/healthchecks)

Run every handoff scenario with actual Gemini/Firestore and retain every attempt/failure. The app reserves capacity transactionally: global/visitor concurrency 2/1; minute requests 6/2; UTC daily requests 60/12; minute reserved calls 36/12; daily reserved calls 360/72. Workflows reserve six possible attempts and facts-only requests two. Unknown outcomes are not refunded. New anonymous visitors can reset visitor quotas; the shared global allowance remains essential. These controls do not cap all Auth/read/network/compute costs.

Pause new analyses with the kill switch while preserving existing-case readback. A paused revision fails readiness, so update its startup probe to liveness in the same revision; restore readiness probing when re-enabling work:

```powershell
gcloud run services update $Service --update-env-vars=OPSCREW_MODEL_ENABLED=false --startup-probe=httpGet.path=/api/health,httpGet.port=8080,initialDelaySeconds=0,periodSeconds=10,timeoutSeconds=5,failureThreshold=12 --region=$Region --project=$ProjectId
```

Select an actually accepted prior ready revision, inspect its image/secret/schema compatibility, route traffic to it, and repeat smoke/recovery checks. The first deployment has no invented previous good revision:

```powershell
$KnownGoodRevision = 'YOUR_ACTUALLY_ACCEPTED_REVISION'
if ($KnownGoodRevision -like 'YOUR_*') { throw 'Choose a recorded accepted revision.' }
gcloud run services update-traffic $Service "--to-revisions=${KnownGoodRevision}=100" --region=$Region --project=$ProjectId
```

After cloud tests and owner release review pass, the approved operator may separately make the judge frontend public. Google's recommended approach disables invoker IAM checking; business APIs still require Firebase visitor identity and enforce server quotas. Resolve any organization-policy block with the owner. [Public access](https://docs.cloud.google.com/run/docs/authenticating/public)

```powershell
gcloud run services update $Service --no-invoker-iam-check --region=$Region --project=$ProjectId
```

Verify signed-out/incognito desktop/mobile access, explicit visitor session, actual synthetic workflow, human confirmation and independent case readback. Finalize the English deck/video with actual endpoint/evidence and submit the official entry. No public endpoint, cloud acceptance or submission is claimed by local preparation.
