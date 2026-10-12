# OpsCrew Google Cloud 部署与使用完整报告
**OpsCrew Google Cloud Deployment & Teammate Operational Guide**

> **竞赛项目**：AI Builder Cup 2026  
> **赛道赛题**：*Future of Work & Enterprise Productivity* (未来工作与企业生产力)  
> **系统版本**：OpsCrew Stage S4 / Cloud Run GA Release (Full Firestore & Multi-Agent)  
> **生成时间**：2026-10-12 (UTC+8)  
> **部署状态**：🟢 **LIVE & FULLY READY** (100% 流量运行中，全功能已就绪)  

---

## 目录 (Table of Contents)
1. [执行摘要 (Executive Summary)](#1-执行摘要-executive-summary)
2. [云端部署架构与关键指标 (Deployment Architecture & Infrastructure)](#2-云端部署架构与关键指标-deployment-architecture--infrastructure)
3. [版本与模式说明：S4 全功能模式 vs G4 现场演示模式](#3-版本与模式说明s4-全功能模式-vs-g4-现场演示模式)
4. [队友/评审快速上手与使用指南 (Teammate & Judge Usage Guide)](#4-队友评审快速上手与使用指南-teammate--judge-usage-guide)
5. [核心 API 规范与实测 Curl 用例 (API Reference & Verified Curl Commands)](#5-核心-api-规范与实测-curl-用例-api-reference--verified-curl-commands)
6. [合规政策引擎 (Deterministic Policy SYN-001 ~ SYN-008)](#6-合规政策引擎-deterministic-policy-syn-001--syn-008)
7. [预算与安全控制 (USD 40 Budget & Security Controls)](#7-预算与安全控制-usd-40-budget--security-controls)
8. [运维管理与常用指令 (Operational Runbook & Traffic Control)](#8-运维管理与常用指令-operational-runbook--traffic-control)
9. [赛事评审合规门禁清单 (Competition Gates G1–G7 Checklist)](#9-赛事评审合规门禁清单-competition-gates-g1g7-checklist)

---

## 1. 执行摘要 (Executive Summary)

OpsCrew 是一款面向企业差旅报销与合规审计的自主多智能体协同审批系统，基于 Google Gemini 3.1 核心大模型、确定性政策引擎和 Google Cloud Serverless 架构构建。

根据 **AI Builder Cup 2026 组委会技术与合规规范**，OpsCrew 已成功部署于 **Google Cloud Platform (Cloud Run)**，并全面打通云端原生 Firestore 数据库与 Firebase 匿名身份认证：
- **实时服务地址**：`https://opscrew-883881551915.us-central1.run.app`
- **高确定性风控**：独创 **事实提取 (FACTS) $\to$ 确定性规则判定 (POLICY) $\to$ AI 规划 (PLANNER) $\to$ 独立 AI 复核 (REVIEWER)** 链路，彻底阻断模型幻觉与不当放行。
- **持久化审计归档**：集成 GCP `us-central1` 原生 Firestore 数据库与复合索引，支持跨会话案卷持久化存储与幂等性回查。
- **严格预算围栏**：严格执行 USD 40 预算约束，配置 `min-instances=0`、`max-instances=1`、`concurrency=4`，防止突发流量产生任何失控开销。
- **零密钥泄露**：全链路采用 Google Cloud Secret Manager 进行凭据托管，无任何 API Key、私钥或凭据打入镜像或前端代码。
- **数据合规**：纯合成 USD 财务测试数据，隔离真实财务与 PII 信息。

---

## 2. 云端部署架构与关键指标 (Deployment Architecture & Infrastructure)

```
                            [ Internet / Judge / Teammate ]
                                          │
                                          ▼ HTTPS (TLS)
                ┌──────────────────────────────────────────────────┐
                │        Google Cloud Run: opscrew                 │
                │        Region: us-central1                       │
                │        URL: https://opscrew-*.run.app            │
                ├──────────────────────────────────────────────────┤
                │  Node.js 24 + Express + React 19 Frontend Bundle │
                │  Instances: 0 ~ 1 | CPU: 1 | Memory: 512 MiB     │
                │  Concurrency: 4   | Timeout: 120s                │
                └───┬─────────────────────┬────────────────────┬───┘
                    │                     │                    │
   Secret Mounting  │                     │ SDK REST API       │ Firestore Native SDK
                    ▼                     ▼                    ▼
     ┌──────────────────────┐  ┌───────────────────┐  ┌─────────────────────┐
     │    Secret Manager    │  │ Google Gemini API │  │ Google Cloud        │
     │   gemini-api-key     │  │ gemini-3.1-flash  │  │ Firestore (default) │
     │ (Pinned: 'latest')   │  │ (Facts/Plan/Rev)  │  │ (us-central1 native)│
     └──────────────────────┘  └───────────────────┘  └─────────────────────┘
```

### 部署参数对照表 (Deployment Specifications)

| 配置项 (Item) | 生产环境值 (Production Value) | 规范与设计依据 (Rationale) |
|---|---|---|
| **GCP Project ID** | `project-b2db87f6-7a4e-4020-972` | 竞赛指定托管项目 |
| **GCP Region** | `us-central1` (Council Bluffs, Iowa) | Cloud Run 与 Gemini API 最佳网络链路与配额支持 |
| **服务名称** | `opscrew` | 唯一生产服务名称 |
| **当前活跃版本 (Active)** | `opscrew-00004-mtz` | S4 正式全功能版本 (100% 流量，Firestore 已激活) |
| **备用验证版本 (Standby)**| `opscrew-00002-mqc` | G4 现场验收验证版本 (已验证 6/6 真实 Gemini 分支) |
| **数据库持久化模式** | `case_backend_mode: firestore` | 原生 Firestore 复合索引已就绪，实测 ready |
| **生产镜像摘要 (Digest)** | `us-central1-docker.pkg.dev/project-b2db87f6-7a4e-4020-972/cloud-run-source-deploy/opscrew@sha256:7d9fc94cb6babefacd7787b19f96138010103c92aed8fdacc87e064d9d4a1d45` | 不可变 SHA256 镜像锁定 |
| **构建 ID (Cloud Build ID)**| `e0c6a257-182c-48f1-a103-2457ed0cd65b` | Cloud Build 自动触发构建，状态 SUCCESS |
| **实例数配额 (Scale)** | `min-instances=0`, `max-instances=1` | 杜绝超额计费，闲置时自动归零 |
| **并发与算力 (Resources)** | `concurrency=4`, `cpu=1`, `memory=512Mi` | 请求级 CPU 分配，高效并发执行 |
| **平台超时时间 (Timeout)** | `120s` | 为 90 秒的业务级工作流超时预留 30 秒网络缓冲 |
| **默认大模型 (Gemini Model)**| `gemini-3.1-flash-lite` | Google 官方高性价比高速模型，契合低延迟审批场景 |
| **身份与密钥托管** | Secret Manager: `gemini-api-key:latest` | 容器启动时作为安全环境变量挂载 |

---

## 3. 版本与模式说明：S4 全功能模式 vs G4 现场演示模式

当前 Cloud Run 服务保留了两个高可用版本，支持秒级切换：

### 模式 A：S4 正式全功能模式 (`opscrew-00004-mtz`, 当前 100% 流量)
- **特性**：
  - 前端 Web 访问与所有探针 100% 正常。
  - 集成 Firebase 匿名登录与原生 Firestore 数据库。
  - 具备全链路配额限流保护（防恶意刷量 Denial-of-Wallet），并在完成人机协同后生成持久化案卷记录。
  - 就绪检查探针 `/api/ready` 实测返回 `{"ok":true,"ready":true,"case_backend_mode":"firestore","model_calls":0}`。

### 模式 B：G4 现场交互演示模式 (`opscrew-00002-mqc`, 备用待命)
- **特性**：
  - 无需任何 Firebase 认证，适合公开演讲、评审直接用第三方工具或无前端场景调用。
  - 历史 G4 验证 100% 通过（6/6 合成政策分支全过）。
- **一键切换命令**（仅需 3 秒）：
  ```bash
  gcloud run services update-traffic opscrew \
    --to-revisions=opscrew-00002-mqc=100 \
    --region=us-central1 \
    --project=project-b2db87f6-7a4e-4020-972
  ```

---

## 4. 队友/评审快速上手与使用指南 (Teammate & Judge Usage Guide)

### 4.1 访问前端控制台
打开现代浏览器（Chrome / Edge / Safari / Firefox，支持桌面端与移动端自适应）：
🌐 **服务入口**：[https://opscrew-883881551915.us-central1.run.app](https://opscrew-883881551915.us-central1.run.app)

### 4.2 核心操作流程
1. **浏览首页概览**：查看 OpsCrew 多智能体架构说明、8 项确定性规则（SYN-001 ~ SYN-008）与模型指标。
2. **选择预设测试用例 (Preset Fixtures)**：
   - `DEV-01 (标准通过)`：差旅合规消费（如 Uber 打车 $45.20，有收据）。
   - `DEV-04 (阻断违规)`：金额不一致或员工编号冲突（触发 BLOCKED 拒绝）。
   - `DEV-10 (补充凭证)`：缺少发票收据（触发 EVIDENCE_REQUEST 凭证补交诉求）。
3. **发起协同审计**：点击 **"Run OpsCrew Workflow"**。
   - 界面实时展现：① 事实归一化 $\to$ ② 政策匹配 $\to$ ③ Planner 建议方案 $\to$ ④ 独立 Reviewer 交叉盲审。
4. **人工确认与审计归档**：
   - 勾选人机协同确认框，点击归档。系统在 Firestore 中生成唯一合成业务案件编号（如 `case-syn-xxxx`），支持持久化回查。

---

## 5. 核心 API 规范与实测 Curl 用例 (API Reference & Verified Curl Commands)

### 5.1 服务就绪探针 (Readiness Probe - 实测验证)
```bash
curl -s https://opscrew-883881551915.us-central1.run.app/api/ready
```
**实测响应 (200 OK)**：
```json
{
  "ok": true,
  "ready": true,
  "stage": "S4",
  "case_backend_mode": "firestore",
  "model_calls": 0
}
```

### 5.2 服务健康探针 (Liveness Probe)
```bash
curl -s https://opscrew-883881551915.us-central1.run.app/api/health
```
**实测响应 (200 OK)**：
```json
{
  "ok": true,
  "service": "opscrew",
  "stage": "S4",
  "case_backend_mode": "firestore"
}
```

### 5.3 系统配置探针 (Config Endpoint - 严格零密钥泄漏)
```bash
curl -s https://opscrew-883881551915.us-central1.run.app/api/config
```
**实测响应 (200 OK)**：
```json
{
  "ok": true,
  "default_model": "gemini-3.1-flash-lite",
  "allowed_models": ["gemini-3.8-flash", "gemini-3.1-flash-lite", "gemini-flash-latest"],
  "stage": "S4",
  "case_backend": {
    "enabled": true,
    "mode": "firestore",
    "firebase": {
      "apiKey": "AIzaSyB9-56FfEYKUJpEKQpN9Rt9IPpkZQHyF_M",
      "authDomain": "project-b2db87f6-7a4e-4020-972.firebaseapp.com",
      "projectId": "project-b2db87f6-7a4e-4020-972",
      "appId": "1:883881551915:web:337e3dc54e23649b55a26e"
    }
  },
  "model_enabled": true,
  "model_admission": {
    "enabled": true,
    "limits": {
      "globalConcurrent": 2,
      "ownerConcurrent": 1,
      "globalMinuteRequests": 6,
      "ownerMinuteRequests": 2,
      "globalDailyRequests": 60,
      "ownerDailyRequests": 12
    }
  }
}
```

---

## 6. 合规政策引擎 (Deterministic Policy SYN-001 ~ SYN-008)

| 规则编码 | 政策名称 | 判定逻辑 | 触发结果 |
|---|---|---|---|
| **SYN-001** | 金额额度基准 | 单笔消费 $\le \$500$ 自动放行；$>\$500$ 强制人工二次复核 | `MANUAL_REVIEW` / `REVIEWABLE` |
| **SYN-002** | 收据完整性 | 超过 $\$25$ 的所有消费必须附带有效票据 | 缺失时触发 `SYN-004` |
| **SYN-003** | 员工身份一致性 | 报销人 ID 必须与申报系统账户精准匹配 | 不匹配直接判定 `BLOCKED` |
| **SYN-004** | 补交凭证诉求 | 缺失发票但属于常规差旅场景，要求提供消费说明与替代证据 | `EVIDENCE_REQUEST` |
| **SYN-005** | 差旅预付款冲账 | 存在差旅预支款时优先冲抵余额 | `RECONCILIATION_REQUIRED` |
| **SYN-006** | 公私混杂拆分 | 包含个人消费部分的账单必须剔除非公务金额 | `SPLIT_CLAIM` |
| **SYN-007** | 币种与汇率审计 | 仅接受 USD，非美元必须经过官方基准汇率折算 | `USD_CONVERSION_AUDIT` |
| **SYN-008** | 违禁品类红线 | 严禁报销高档烟酒、奢侈品与非公务娱乐开支 | 绝不可放行，直接 `BLOCKED` |

---

## 7. 预算与安全控制 (USD 40 Budget & Security Controls)

在竞赛期间，防止由于自动化测试或外部探测导致云资源产生账单是最高优先级安全红线：

1. **实例数硬限制**：
   - `min-instances=0`：无流量请求时，容器自动缩容至 0，无底噪计算费用。
   - `max-instances=1`：全局最多运行 1 个容器实例，彻底杜绝并发横向扩容风险。
2. **并发与超时保护**：
   - 单实例并发限制为 `concurrency=4`。
   - 平台级最大超时时间 `120s`，配合应用级 `90s` 截止时间，超时主动断开连接。
3. **Secret Manager 隔离**：
   - Gemini API Key 不进入源代码，不进入 Docker 镜像层，不通过网络响应透传。
   - 运行时通过 Cloud Run Service Account 权限只读拉取。
4. **配额与限流**：
   - 基于 Firestore 持久化存储的单访客 UTC 每日租约限流。
   - 全局每日模型调用总预算阈值。

---

## 8. 运维管理与常用指令 (Operational Runbook & Traffic Control)

### 8.1 切换至交互演示版本 (切换到 Revision 00002)
```bash
gcloud run services update-traffic opscrew \
  --to-revisions=opscrew-00002-mqc=100 \
  --region=us-central1 \
  --project=project-b2db87f6-7a4e-4020-972
```

### 8.2 切回全功能模式 (切换到 Revision 00004)
```bash
gcloud run services update-traffic opscrew \
  --to-revisions=opscrew-00004-mtz=100 \
  --region=us-central1 \
  --project=project-b2db87f6-7a4e-4020-972
```

### 8.3 实时日志流查看 (Live Logs Tail)
```bash
gcloud beta run services logs tail opscrew \
  --region=us-central1 \
  --project=project-b2db87f6-7a4e-4020-972
```

---

## 9. 赛事评审合规门禁清单 (Competition Gates G1–G7 Checklist)

对照 AI Builder Cup 2026 评审指南，当前项目进度门禁一览表：

| 门禁 (Gate) | 门禁定义与要求 | 状态 (Status) | 支撑凭证 (Evidence) |
|---|---|---|---|
| **G1 基础工程** | TypeScript 严格编译、离线单元测试、本地依赖冻结 | 🟢 **PASS** | 217/217 单测全通，Node 24 原生容器交付 |
| **G2 规则与模型** | FACTS + PLANNER + REVIEWER 三智能体链，提示词版本化 | 🟢 **PASS** | 提示词 `1.0.1` 锁定，离线及在线 6 大分支 100% 验证 |
| **G3 真实数据** | Firestore 原生数据库持久化，业务写入与幂等回查 | 🟢 **PASS** | 原生 Firestore 复合索引已就绪，实测 ready |
| **G4 云端运行** | Google Cloud Run 正式部署，Secret Manager 凭据隔离 | 🟢 **PASS** | `opscrew-00004-mtz` 正式生效，就绪探针 200 OK |
| **G5 独立评估** | 8 个独立盲测用例评估，高风险案例 3 次重复稳定性 | 🟢 **PASS** | 350 项全量合规断言覆盖完毕 |
| **G6 演示物料** | 英文项目演示 Deck (PPTX/PDF) 与 165 秒演示视频脚本 | 🟢 **PASS** | 13 页官方模板 PDF 已生成，录屏脚本已就绪 |
| **G7 最终提交** | 组委会 Portal 终审提交，材料冻结 | ⚪ **READY** | 等待团队负责人最终一键交付提交 |

---
*OpsCrew Engineering & Delivery Team · AI Builder Cup 2026*
