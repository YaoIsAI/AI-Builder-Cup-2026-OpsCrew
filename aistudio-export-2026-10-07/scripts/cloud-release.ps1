#Requires -Version 7.3
[CmdletBinding(DefaultParameterSetName = 'File')]
param(
    [Parameter(Mandatory, ParameterSetName = 'File')][string]$ConfigPath,
    [Parameter(Mandatory, ParameterSetName = 'Memory')][hashtable]$PublicConfiguration,
    [ValidateSet('Validate', 'Plan', 'Build', 'DeployPrivate')][string]$Action = 'Validate',
    [string]$ImageDigest
)
$ErrorActionPreference = 'Stop'
$PSNativeCommandUseErrorActionPreference = $true
Set-StrictMode -Version Latest

$AppDirectory = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
if ($PSCmdlet.ParameterSetName -eq 'Memory' -and $Action -notin @('Validate','Plan')) {
    throw 'In-memory configuration is for offline Validate/Plan checks only.'
}
try {
    $Configuration = if ($PSCmdlet.ParameterSetName -eq 'Memory') { $PublicConfiguration } else { Get-Content -LiteralPath $ConfigPath -Raw | ConvertFrom-Json -AsHashtable }
} catch {
    throw 'Read one valid public release JSON configuration; never supply a credential or secret file.'
}
function Require-Shape([string]$Value, [string]$Pattern, [string]$Label) {
    if (-not $Value -or $Value -match 'REPLACE_|YOUR_' -or $Value -notmatch $Pattern) {
        throw "Review and replace the invalid $Label value."
    }
}
function Require-Keys([Collections.IDictionary]$Value, [string[]]$Expected, [string]$Label) {
    if ($null -eq $Value -or (Compare-Object @($Value.Keys | Sort-Object) @($Expected | Sort-Object))) {
        throw "The $Label fields do not match the approved public configuration schema. Never put a Gemini key or account credentials here."
    }
}
Require-Keys $Configuration @('projectId','region','serviceName','artifactRepository','buildBucket','builderServiceAccount','runtimeServiceAccount','geminiSecretName','geminiSecretVersion','geminiModel','firebase') 'release'
Require-Keys $Configuration.firebase @('webApiKey','authDomain','appId') 'Firebase web'
Require-Shape $Configuration.projectId '^[a-z][a-z0-9-]{4,28}[a-z0-9]$' 'project ID'
if ($Configuration.projectId.StartsWith('demo-')) { throw 'A demo- emulator project cannot be deployed.' }
Require-Shape $Configuration.region '^[a-z]+-[a-z0-9]+[0-9]$' 'confirmed region'
foreach ($Field in @('serviceName','artifactRepository','geminiSecretName')) {
    Require-Shape $Configuration[$Field] '^[a-z][a-z0-9-]{0,61}[a-z0-9]$' $Field
}
Require-Shape $Configuration.buildBucket '^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$' 'private build bucket'
$ProjectEscaped = [regex]::Escape($Configuration.projectId)
foreach ($Field in @('builderServiceAccount','runtimeServiceAccount')) {
    Require-Shape $Configuration[$Field] "^[a-z][a-z0-9-]{4,28}[a-z0-9]@$ProjectEscaped\.iam\.gserviceaccount\.com$" $Field
}
if ($Configuration.builderServiceAccount -eq $Configuration.runtimeServiceAccount) { throw 'Builder and runtime identities must be different.' }
Require-Shape $Configuration.geminiSecretVersion '^[1-9][0-9]*$' 'pinned numeric secret version'
if ($Configuration.geminiModel -ne 'gemini-3.1-flash-lite') { throw 'This release plan is validated for gemini-3.1-flash-lite. Review a model change separately.' }
Require-Shape $Configuration.firebase.webApiKey '^[A-Za-z0-9_-]{20,128}$' 'separate public Firebase web API key'
Require-Shape $Configuration.firebase.authDomain '^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$' 'Firebase auth domain'
Require-Shape $Configuration.firebase.appId '^1:[0-9]+:web:[a-fA-F0-9]+$' 'Firebase web app ID'
if ($Configuration.firebase.authDomain.Contains('..')) { throw 'Invalid Firebase auth domain.' }
if ($ImageDigest) { Require-Shape $ImageDigest '^sha256:[a-f0-9]{64}$' 'container image digest' }
if ($Action -eq 'DeployPrivate' -and -not $ImageDigest) { throw 'DeployPrivate requires the accepted image digest returned by Build.' }

Push-Location -LiteralPath $AppDirectory
try {
    $Commit = (& git rev-parse --short=12 HEAD).Trim()
    Require-Shape $Commit '^[a-f0-9]{12}$' 'source commit'
    $ImageBase = "$($Configuration.region)-docker.pkg.dev/$($Configuration.projectId)/$($Configuration.artifactRepository)/opscrew"
    $ImageTag = "${ImageBase}:$Commit"
    $DeployDigest = if ($ImageDigest) { $ImageDigest } else { 'sha256:REPLACE_WITH_VERIFIED_64_HEX_DIGEST' }
    $Environment = [ordered]@{
        NODE_ENV = 'production'; GEMINI_MODEL = $Configuration.geminiModel
        OPSCREW_FIREBASE_MODE = 'firestore'; FIREBASE_PROJECT_ID = $Configuration.projectId
        FIREBASE_WEB_API_KEY = $Configuration.firebase.webApiKey; FIREBASE_AUTH_DOMAIN = $Configuration.firebase.authDomain
        FIREBASE_WEB_APP_ID = $Configuration.firebase.appId; OPSCREW_MODEL_ENABLED = 'true'
        OPSCREW_MODEL_GLOBAL_CONCURRENT = '2'; OPSCREW_MODEL_OWNER_CONCURRENT = '1'
        OPSCREW_MODEL_GLOBAL_MINUTE_REQUESTS = '6'; OPSCREW_MODEL_OWNER_MINUTE_REQUESTS = '2'
        OPSCREW_MODEL_GLOBAL_DAILY_REQUESTS = '60'; OPSCREW_MODEL_OWNER_DAILY_REQUESTS = '12'
        OPSCREW_MODEL_GLOBAL_MINUTE_CALLS = '36'; OPSCREW_MODEL_OWNER_MINUTE_CALLS = '12'
        OPSCREW_MODEL_GLOBAL_DAILY_CALLS = '360'; OPSCREW_MODEL_OWNER_DAILY_CALLS = '72'
        OPSCREW_MODEL_LEASE_MS = '180000'
    }
    $EnvironmentArgument = ($Environment.GetEnumerator() | ForEach-Object { "$($_.Key)=$($_.Value)" }) -join ','
    $BuildArguments = @(
        'builds','submit','.',"--project=$($Configuration.projectId)","--region=$($Configuration.region)",
        "--tag=$ImageTag", "--service-account=projects/$($Configuration.projectId)/serviceAccounts/$($Configuration.builderServiceAccount)",
        '--ignore-file=.dockerignore',"--gcs-source-staging-dir=gs://$($Configuration.buildBucket)/source", "--gcs-log-dir=gs://$($Configuration.buildBucket)/logs"
    )
    $DeployArguments = @(
        'run','deploy',$Configuration.serviceName,"--project=$($Configuration.projectId)","--region=$($Configuration.region)",
        "--image=${ImageBase}@$DeployDigest", "--service-account=$($Configuration.runtimeServiceAccount)", '--port=8080',
        '--min=0','--max=1','--cpu=1','--memory=512Mi','--concurrency=4','--timeout=120s', '--cpu-throttling', '--no-cpu-boost',
        '--ingress=all','--invoker-iam-check','--no-allow-unauthenticated', "--set-env-vars=$EnvironmentArgument",
        "--set-secrets=GEMINI_API_KEY=$($Configuration.geminiSecretName):$($Configuration.geminiSecretVersion)",
        '--startup-probe=httpGet.path=/api/ready,httpGet.port=8080,initialDelaySeconds=0,periodSeconds=10,timeoutSeconds=5,failureThreshold=12'
    )
    if ($Action -in @('Validate','Plan')) {
        $Result = [ordered]@{ ok = $true; action = $Action; cloud_operations = 'NOT_EXECUTED'; source_commit = $Commit; image_tag = $ImageTag }
        if ($Action -eq 'Plan') { $Result.build_arguments = $BuildArguments; $Result.deploy_arguments = $DeployArguments }
        $Result | ConvertTo-Json -Depth 8
        return
    }
    if (& git status --porcelain) { throw 'Use an accepted, clean, committed checkout for a release operation.' }
    if (-not (Get-Command gcloud -ErrorAction SilentlyContinue)) { throw 'Install the official Google Cloud CLI or use approved Cloud Shell first.' }
    if ($Action -eq 'Build') {
        & gcloud @BuildArguments
        $ResolvedDigest = (& gcloud artifacts docker images describe $ImageTag "--project=$($Configuration.projectId)" '--format=value(image_summary.digest)').Trim()
        Require-Shape $ResolvedDigest '^sha256:[a-f0-9]{64}$' 'Artifact Registry image digest'
        @{ ok = $true; action = 'Build'; source_commit = $Commit; image_digest = $ResolvedDigest; image = "${ImageBase}@$ResolvedDigest" } | ConvertTo-Json
    } else {
        & gcloud @DeployArguments
        & gcloud run services describe $Configuration.serviceName "--project=$($Configuration.projectId)" "--region=$($Configuration.region)" '--format=json(status.url,status.latestReadyRevisionName,status.traffic)'
    }
} finally { Pop-Location }
