# Spec

## Behavior Contracts

以下 fragment 文本为逐字定稿（全 ASCII，无 em/en dash）。skill-behavior 断言正则直接取自这些文本；实现期若微调措辞，必须同步调整断言（见 Test Matrix 不变式）。

### SPEC-BEHAVIOR-001 execute-plan.purpose.md（新建，全文）

实现 DES-ARCH-002 [ADDRESSED] 的 purpose 部分：

```markdown
Execute a small, decision-light plan or request through subagent-isolated tasks, so the main conversation keeps only compact results instead of file contents. A persistent run ledger under `.xsk/runs/` records every task and its acceptance state, so a mid-run context compression loses nothing that matters.

It fits tasks that are simple to decide but heavy to execute: the work reads and writes far more content than the task description itself (several files, several steps). It is the wrong tool for trivia: a one-file tweak or a single command is cheaper done inline, and dispatching a subagent for it costs more than it saves.
```

### SPEC-BEHAVIOR-002 execute-plan.triggers.md（新建，全文）

```markdown
This skill is explicitly invoked only: `/xsk-execute-plan`, or a direct request such as "use xsk-execute-plan to run this". As a deliberate local rule that overrides the shared intent-matching convention below, it never self-triggers on execution intent, so it cannot collide with a harness's own plan or execution modes.

It accepts two kinds of input:

- a concrete execution plan, such as an approved `xsk-think` design
- a small plain-language request that needs no real design work first
```

### SPEC-BEHAVIOR-003 execute-plan.behavior.md（新建，全文，七步）

实现 DES-DATA-001 [ADDRESSED] 与 DES-SEM-001 [ADDRESSED]；步骤 1 完整保留 R4 的 "pending or failed" 限定（design 评审 F1 回溯）；gitignore 句式复用 point.behavior 已验证纪律（RISK-SEC-001 [ADDRESSED]）：

```markdown
**1. Intake and ground lightly.** Restate the goal in one sentence. A concrete plan (such as an approved `xsk-think` design) is taken as given; a small plain-language request gets a quick scan of the directly relevant code and config, not a full design pass. Derive the run slug from the goal line using the pattern `^[a-z0-9]+(-[a-z0-9]+)*$`. If `.xsk/runs/<slug>.md` already exists with `status: running` and pending or failed tasks, ask the user once whether to resume (re-dispatch only the unfinished tasks, skipping the done ones) or start over (overwrite the ledger). A leftover ledger whose status is `done` or `failed` is overwritten silently; only `running` triggers the question.

**2. Preflight the hard rules.** Scan `CLAUDE.md`, `AGENTS.md`, and any repo rules or config for constraints that would forbid or force a choice. Keep this brief: it is a check, not a study.

**3. Decompose and define acceptance.** Produce an ordered task list with at least one entry; a trivial run is simply a one-line list. Define the acceptance criteria before anything executes. Mark every task that has a UI surface and record for it the reference (a design link or image), the target platform (Android, web, or desktop), and how to render and screenshot it.

**4. One confirmation gate.** Show the user the task list and the acceptance criteria, and get a single go-ahead. This is the only checkpoint on the normal path; the resume question in step 1 is exceptional recovery, not a second gate. Even an already-approved `xsk-think` plan passes through it, because what is being confirmed is the task breakdown, which the user has not seen yet.

**5. Open the ledger, then dispatch.** Only after the gate passes, write the run ledger `.xsk/runs/<slug>.md`:

```markdown
---
status: running | done | failed
slug: <slug>
created_at: <ISO date>
source: plan | request
---

# <goal in one line>

## Acceptance
- [ ] <criterion>

## Tasks
1. [pending|done|failed] <full task description, self-contained enough to re-dispatch, with its acceptance items> - <compact result>

## Result
(after all tasks: per-criterion pass/fail, failures, leftovers)
```

`source: plan` means the input was a concrete plan; `source: request` means a small plain-language request. Every `## Tasks` entry carries the full task description as confirmed at the gate; a one-line stub would make resuming meaningless once the session context is gone. Ensure `.xsk/.gitignore` contains the line `runs/` (create `.xsk/` and `.xsk/.gitignore` if absent; append the line only if it is missing; never overwrite an existing `.xsk/.gitignore`). The ledger is transient execution state, not a deliverable: never offer to commit it, and stale ledgers may be deleted freely.

Then dispatch. Each task goes to one subagent with a self-contained prompt holding its slice of the plan and its acceptance items, because a subagent sees none of the main conversation. Order tasks by dependency. Run tasks in parallel only when their expected file sets do not overlap; when in doubt, run them serially, since parallel subagents editing the same file overwrite each other. Between tasks there is no review and no acceptance run: the main conversation records only each task's compact result, and updates the task's ledger line as soon as it finishes. When a task fails, stop its dependents, keep what finished, and report honestly. No pretended atomicity, no unbounded auto-fixing.

**6. Accept once, after all tasks.** Two tiers with different weight.

- Functional acceptance is a real signal. Run the project's own verification (tests, lint, build) and read the output. A failure is reported as a failure and may set the ledger to `status: failed`, with at most one bounded fix attempt, never a loop. When the project has no runnable verification at all, skip it but state "functional acceptance not run" prominently in the report: a run with zero gates must never look verified.
- UI fidelity acceptance is warning-level, never a gate. Run it only for tasks marked with a UI surface, and only when the environment can render the UI and capture a screenshot; otherwise skip it with the single line "UI acceptance skipped: cannot render or screenshot here", which is not a failure and blocks nothing. When it runs: render, screenshot, compare against the design reference, and list concrete deviations (spacing, color, alignment, missing elements, overflow), delegating rendering, screenshots, and visual comparison to existing tools rather than building any. Dispatch a fix subagent scoped to exactly those deviations, re-render, and re-compare, at most 2 rounds by default (the user may set another bound at invocation). Fix subagents follow the same file-set rule as step 5. Record each round in the ledger. Any deviation that survives the last round goes into the report as a warning for the user to weigh; it never fails the run and never gates anything.

The final `done` or `failed` comes from functional acceptance and task outcomes alone; UI residuals never change it.

**7. Report and stop.** Fill `## Result`: each task's compact outcome, each acceptance criterion's pass or fail, UI warnings if any, and whether functional acceptance ran. Set the final ledger status. Do not commit, push, or publish unless the user asks for it. Stop.
```

### SPEC-BEHAVIOR-004 execute-plan.output.md（新建，全文）

```markdown
A per-task list of compact results; the acceptance report with each criterion's pass or fail, UI warnings if any, and whether functional acceptance ran; and the ledger path `.xsk/runs/<slug>.md` with its final `status` (`done` or `failed`).
```

### SPEC-BEHAVIOR-005 think.behavior.md 第 6 步（精确 diff）

实现 DES-ARCH-003 [ADDRESSED]、RISK-REG-001 [ADDRESSED]。

旧（整段）：

```markdown
**6. Stop at the design.** Output the plan, surface blocking ambiguities as one-sentence questions, then stop. Implementation starts only on explicit approval.
```

新（整段替换，仅追加两句，锚点 `explicit approval` 原样保留）：

```markdown
**6. Stop at the design.** Output the plan, surface blocking ambiguities as one-sentence questions, then stop. Implementation starts only on explicit approval. When the design is an executable plan with concrete steps (not a pure judgment such as "not worth doing" or "keep things as they are") and every Open Question is resolved, offer `xsk-execute-plan` as the executor; the offer is a proposal, never an automatic invocation. Otherwise do not offer it.
```

### SPEC-BEHAVIOR-006 think.output.md（精确 diff）

旧（末行）：

```markdown
Then stop and wait for approval. Do not begin implementation.
```

新（末行后追加一段，锚点 `stop`/`wait for approval`/`Proposed Design Summary`/`Open Questions` 不动）：

```markdown
Then stop and wait for approval. Do not begin implementation.

If the plan is executable (not a pure judgment) and no Open Questions remain, offer to run it with `xsk-execute-plan`. Offer only; never invoke it automatically.
```

锚点保留核对表（C2 验证）：`decision-complete plan` (purpose，未触碰) / `planning-only` (purpose，未触碰) / `explicit approval` (step 6 新文含) / `Open Questions` (output 含) / `Proposed Design Summary` (output 未触碰段) / `出方案`+`plan this` (triggers，未触碰) / `stop ... wait for approval` (output 含)；新文不含字符串 `Approved Design Summary`。

## API / Data / Config Contracts

### SPEC-CONFIG-001 lib/skills.js 注册表条目

实现 DES-ARCH-001 [ADDRESSED]。插入位置：`skills` 数组末尾（`xsk-check` 条目之后；数组顺序无语义，测试名单对 `names.sort()` 断言）。逐字内容：

```js
  {
    name: 'xsk-execute-plan',
    description:
      'Execute a small plan or request as subagent-isolated tasks tracked in a .xsk/runs/ ledger: one confirmation gate, no per-task review, unified acceptance at the end. Explicit invocation only.',
    platforms: ALL_PLATFORMS.slice(),
    fragmentBase: 'execute-plan',
  },
```

### SPEC-DATA-001 run ledger 数据契约

即 SPEC-BEHAVIOR-003 内嵌 schema（status/slug/created_at/source 四字段 frontmatter + Acceptance/Tasks/Result 三节）。数据契约完全活在生成的技能 prose 中，`lib/` 零感知（SCOPE-OUT-001）。

### SPEC-GEN-001 再生成规程

实现 DES-ARCH-001/002 的生成收口（RISK-GEN-001 [ADDRESSED]）。fragment 落盘后，对 `xsk-execute-plan` 与 `xsk-think` 各执行一次仓库 CLAUDE.md 的 node -e 片段（替换其中的技能名），产出 4 个文件：`skills/execute-plan/SKILL.md`、`test/fixtures/golden/xsk-execute-plan.md`、`skills/think/SKILL.md`、`test/fixtures/golden/xsk-think.md`。

## External Documentation Checked

无外部库/框架/SDK 依赖（零依赖 CLI，纯仓库内约定），不适用 Context7/外部文档核查。仓库内规范来源：CLAUDE.md（生成管线、约定）、既有 fragment 原型（point.behavior 的 gitignore 纪律句式）。

## Test Matrix

不变式：skill-behavior 新断言的正则字面量必须与 SPEC-BEHAVIOR-001..004 定稿文本逐字对应（RISK-TRANS-001 [ADDRESSED]：先 fragment 后断言）。

### SPEC-TEST-001 test/generator.test.js

- `:69` 标题：`'generator: all eight skills are registered with name + description frontmatter'` -> `'generator: all nine skills are registered with name + description frontmatter'`。
- `:73` 名单（sort 后 deepStrictEqual）插入 `'xsk-execute-plan'` 于 `'xsk-consume-point'` 与 `'xsk-point'` 之间。

### SPEC-TEST-002 test/install.test.js（RISK-TEST-001 [ADDRESSED]）

- `:1296` 标题：`'install: claude gets all 8 skills; codex/opencode/gemini get 7 (no bypass-claude)'` -> `'install: claude gets all 9 skills; codex/opencode/gemini get 8 (no bypass-claude)'`。
- `:1323-1326` 四行断言：claude 8->9（消息 `'claude has 9 skills'`），codex/opencode/gemini 7->8（消息同步 `'... has 8 skills'`）。

### SPEC-TEST-003 test/self-conformance.test.js

`:158-160` 必含路径数组追加 `'skills/execute-plan/SKILL.md'`（`includes()` 检查，顺序无关，追加于 `'skills/consume-point/SKILL.md'` 之后）。

### SPEC-TEST-004 test/skill-behavior.test.js 新增测试块（逐字）

```js
test('skill-behavior: xsk-execute-plan — explicit-only, ledger, isolated dispatch, unified two-tier acceptance', () => {
  const c = body(skills.find((s) => s.name === 'xsk-execute-plan'));
  assert.ok(/explicitly invoked only/.test(c), 'explicit invocation only');
  assert.ok(/never self-triggers/.test(c), 'no self-trigger on execution intent');
  assert.ok(/simple to decide but heavy to execute/.test(c), 'fit criterion');
  assert.ok(/cheaper done inline/.test(c), 'inline counter-example');
  assert.ok(/ordered task list/.test(c) && /acceptance criteria before anything executes/.test(c), 'decompose then acceptance first');
  assert.ok(/\.xsk\/runs\//.test(c), 'ledger path');
  assert.ok(/never overwrite an existing `\.xsk\/\.gitignore`/.test(c), 'gitignore append-only discipline');
  assert.ok(/self-contained prompt/.test(c), 'self-contained subagent dispatch');
  assert.ok(/self-contained enough to re-dispatch/.test(c), 'ledger tasks re-dispatchable');
  assert.ok(/file sets do not overlap/.test(c), 'parallel only when file sets disjoint');
  assert.ok(/no review and no acceptance run/.test(c), 'no per-task review');
  assert.ok(/only the unfinished tasks/.test(c) && /pending or failed/.test(c), 'resume semantics');
  assert.ok(/functional acceptance not run/.test(c), 'zero-gate run labeled prominently');
  assert.ok(/warning-level, never a gate/.test(c), 'UI acceptance warning-level');
  assert.ok(/UI acceptance skipped/.test(c), 'unrenderable UI skips without failing');
  assert.ok(/at most 2 rounds/.test(c), 'bounded UI fix rounds');
  assert.ok(/never fails the run/.test(c), 'UI residual never fails the run');
  assert.ok(/Do not commit, push/.test(c), 'stops without committing');
});
```

另在既有 xsk-think 测试块（`:55` 起）追加两行断言（衔接覆盖）：

```js
  assert.ok(/xsk-execute-plan/.test(c), 'offers execute-plan handoff');
  assert.ok(/never an automatic invocation/.test(c), 'offer never auto-runs');
```

### 过程门（SCOPE-IN-010，RISK-GEN-001 [ADDRESSED]）

| 门 | 命令 | 判据 |
|---|---|---|
| C1 | `node --test test/golden.test.js` | fragment 落盘 + 4 文件再生成后全绿 |
| C2 | `node --test test/generator.test.js test/skill-behavior.test.js` | think 锚点 + 新块断言全绿 |
| C3 | `npm test` | 全量全绿 |
| C4 | `npm test` + `npm run syntaxcheck` + `npm pack --dry-run` | 三命令全过；人工对照 AC-004/005/006（README 计数措辞无测试保护，design 评审 F3：必须人工核对六处 + 表格行） |

## Non-goals

继承 brief：SCOPE-OUT-001..005（`lib/` 零改动、不自建 UI 框架、不自动触发、不替代 r2p/plan mode、ledger 无 commit 编排）与三条设计性非目标（UI 不作门、不逐任务 review、不扩 CLI 能力）。本 spec 未新增任何非目标。

## PLAN Handoff

PLAN 阶段将本 spec 排为有序工作项，边界为 risk_discovery Boundaries 文件全集：

1. W1：SPEC-CONFIG-001 注册表条目（`lib/skills.js`）。
2. W2：SPEC-BEHAVIOR-001..004 四个 fragment 新建。
3. W3：SPEC-BEHAVIOR-005/006 think 两 fragment 编辑（对照锚点核对表）。
4. W4：SPEC-GEN-001 再生成 4 文件，跑 C1。
5. W5：SPEC-TEST-001..004 测试更新，跑 C2。
6. W6：README 双份六处计数 + 两行表格行（表末追加，design 评审 F2；EN 15 行含 six->seven original）+ CLAUDE.md "Skill runtime stores" 段（加 `xsk-execute-plan` 与 `.xsk/runs/`），跑 C3。
7. W7：C4 终门 + AC-001..007 逐项对照。

顺序约束：W2 先于 W4/W5（断言取自定稿文本）；W3 先于 W4（think 再生成含新句）；W4 先于 W5 的 C2（断言跑在再生成后的产物上）。

## Trace
<!-- Map this stage's IDs to upstream/downstream. R3 derives & checks closure. -->
| This ID | Upstream | Status |
|---|---|---|
| SPEC-BEHAVIOR-001 | DES-ARCH-002 [ADDRESSED], SCOPE-IN-002 | mapped |
| SPEC-BEHAVIOR-002 | DES-ARCH-002 [ADDRESSED], SCOPE-IN-002 | mapped |
| SPEC-BEHAVIOR-003 | DES-ARCH-002 [ADDRESSED], DES-DATA-001 [ADDRESSED], DES-SEM-001 [ADDRESSED], SCOPE-IN-002, SCOPE-IN-003, SCOPE-IN-005 | mapped |
| SPEC-BEHAVIOR-004 | DES-ARCH-002 [ADDRESSED], SCOPE-IN-002 | mapped |
| SPEC-BEHAVIOR-005 | DES-ARCH-003 [ADDRESSED], SCOPE-IN-004 | mapped |
| SPEC-BEHAVIOR-006 | DES-ARCH-003 [ADDRESSED], SCOPE-IN-004 | mapped |
| SPEC-CONFIG-001 | DES-ARCH-001 [ADDRESSED], SCOPE-IN-001 | mapped |
| SPEC-DATA-001 | DES-DATA-001 [ADDRESSED], SCOPE-IN-003 | mapped |
| SPEC-GEN-001 | DES-ARCH-001 [ADDRESSED], SCOPE-IN-006 | mapped |
| SPEC-TEST-001..004 | DES-TEST-001 [ADDRESSED], SCOPE-IN-007, SCOPE-IN-010 | mapped |
| PLAN Handoff W6 | DES-DOC-001 [ADDRESSED], SCOPE-IN-008, SCOPE-IN-009 | mapped |

## Upstream Summary (read-only)
# Design

## Design Summary

xsk-execute-plan 作为第九个注册技能接入既有生成管线：一条 `lib/skills.js` 注册表条目 + 四个 fragment 经 `buildSkill` 产出 packed `SKILL.md`，golden fixture 锁形状。技能语义全部编码在 fragment prose 里（纯指令技能），`lib/` 零改动。xsk-think 的 behavior 第 6 步与 output 段追加两条件衔接提议。测试面按已验证的行号锚点扩枚举与计数，双 README 与仓库 CLAUDE.md 同步。全程由确定性测试收口（golden 字节比对、计数断言、README pinning、`npm test`/`syntaxcheck`/`pack --dry-run`）。

## Current Code Evidence

- 注册表与访问器：`lib/skills.js`（`skills` 数组、`get`、`forPlatform`、`ALL_PLATFORMS`），现有 8 条目结构一致，install 动态消费注册表（`lib/install.js:8` require）。
- 生成管线：`lib/generator.js` `buildSkill` 以 `templates/skill.md.tmpl` 填 `{{NAME}}/{{DESCRIPTION}}/{{PURPOSE}}/{{TRIGGERS}}/{{BEHAVIOR}}/{{OUTPUT}}/{{SHARED}}`，shared 体来自 `shared/skill-common.md`；golden 为 packed 内容以 `<SHARED_MASKED>` 掩蔽 shared 体（`test/golden.test.js:15-18`）。
- 枚举/计数硬编码：`test/generator.test.js:69`（标题 "all eight skills"）与 `:73`（排序名单 deepStrictEqual）；`test/install.test.js:1296-1327`（计数 8/7/7/7 与标题）；`test/self-conformance.test.js:158-160`（打包必含路径）；`test/skill-behavior.test.js`（逐技能断言块）。
- xsk-think 既有锚点：`test/generator.test.js:123-130`、`test/skill-behavior.test.js:55-64`（含否定断言 `!Approved Design Summary`）。
- README 计数措辞：EN/CN 各 15/21/65 行；标题字节一致由 `test/readme-pinning.test.js` 与 baseline/self-conformance 保障。
- `package.json` `files` 含 `skills/` 整目录；打包无需增改。
- fragment 纪律参照：`templates/fragments/point.behavior.md` 的 gitignore append-only 措辞（create-if-absent、append-only、never overwrite）为 RISK-SEC-001 [ADDRESSED] 的已验证原型。

## Requirements Coverage

| SCOPE-IN | 设计元素 |
|---|---|
| 001 注册表 | DES-ARCH-001 |
| 002 四 fragment | DES-ARCH-002 |
| 003 ledger 规范 | DES-DATA-001 |
| 004 think 衔接 | DES-ARCH-003 |
| 005 两级验收 | DES-SEM-001 |
| 006 重生成 | DES-ARCH-001/002（管线复用，无新机制） |
| 007 测试 | DES-TEST-001 |
| 008 README | DES-DOC-001 |
| 009 CLAUDE.md | DES-DOC-001 |
| 010 检查点 C1-C4 | DES-TEST-001 |

SCOPE-OUT-001..005 通过 risk_discovery Boundaries 文件全集硬边界执行。

## Options Considered

上游调研点（三轮审查）已裁决的关键分叉，此处记录结论与被否方案：

- 执行位置：会话内联 vs 子代理隔离。选子代理隔离；内联无压缩防护，是本需求要解决的问题本身。
- 执行状态：仅会话内维护 vs 持久化 ledger。选 ledger（`.xsk/runs/`）；会话内维护在压缩时丢失，续跑不可能。
- UI 验收定位：质量门 vs 警告级有界闭环 vs 不做。选警告级 + 默认 2 轮有界还原；作门会让 UI 偏差阻塞交付（用户明确否决），不做则丢掉真实痛点。
- 触发方式：意图匹配 vs 仅显式调用。选仅显式；意图匹配与 harness plan mode 语义冲突（用户红线）。
- 拆解形状：琐碎任务免列表 vs 一律列表。选一律列表（最少一条）；形状统一利于 fragment 编写与测试断言。
- 与 xsk-think 衔接：自动调用 vs 条件提议。选两条件提议（可执行方案 + 决策完备）；自动调用违反显式红线。

## Chosen Design

### DES-ARCH-001 注册表驱动的第九技能
`lib/skills.js` 追加单条目（name/description/platforms/fragmentBase 与现有 8 条同构，description 上游已定稿），排序语义上位于 consume-point 与 point 之间（仅测试名单有序，注册表数组追加到末尾即可，名单另行维护）。生成与安装零新机制：`buildSkill` 与 install 管线原样复用。

### DES-ARCH-002 四 fragment 内容架构
- `execute-plan.purpose.md`：定位 + 适用判据（决策轻 + 执行吃上下文）+ 反例（内联做）。
- `execute-plan.triggers.md`：仅显式调用，技能本地规则显式覆盖 shared 的意图匹配约定；两类输入（计划/小需求）。
- `execute-plan.behavior.md`：编码七步（Intake/preflight/拆解/唯一确认门/派发/统一验收/上报即停）+ ledger 规范（DES-DATA-001）+ 两级验收（DES-SEM-001）。措辞为英文 ASCII，边界条件逐条译自需求 R2-R7，无语义丢失（RISK-TRANS-001 [ADDRESSED] 对照核对）。
- `execute-plan.output.md`：逐任务紧凑结果 + 逐项验收 pass/fail + ledger 路径与最终 status。

### DES-ARCH-003 xsk-think 条件衔接
`think.behavior.md` 第 6 步与 `think.output.md` 各加一句：仅当产出为可执行方案（非纯裁决）且决策完备（Open Questions 已清）时，提议（永不自动调用）用 xsk-execute-plan 执行。逐字保留 R5 全部锚点短语；不引入 `Approved Design Summary`。

### DES-DATA-001 run ledger 数据形状
`.xsk/runs/<slug>.md`：frontmatter `status: running|done|failed`、`slug`（由目标一行生成，`^[a-z0-9]+(-[a-z0-9]+)*$`）、`created_at`、`source: plan|request`；正文 `# 目标` / `## Acceptance`（勾选项）/ `## Tasks`（自包含可重派条目 + 紧凑结果）/ `## Result`。生命周期：确认门通过才落盘；任务级增量更新；续跑仅对 `running` 询问，done/failed 直接覆写；`.xsk/.gitignore` 补 `runs/`（append-only，措辞复用 point.behavior 已验证模式）；无 commit offer。

### DES-SEM-001 两级验收语义
功能/代码验收 = 真实信号：跑项目自带验证并读输出，失败可置 `failed` + 至多一次有界修复；无可运行验证时报告显著标注"功能验收未执行"。UI 还原度 = 警告级 best-effort：可渲染截图才做，跳过不失败；偏差走默认 2 轮 fix-subagent 有界还原（文件集规则同任务派发）；残差仅 warning 永不 gate；每轮记 ledger。整体 done/failed 只由功能验收 + 任务结果决定。

### DES-TEST-001 测试策略
四处既有枚举/计数按行号锚点更新（漂移以内容匹配为准）；`skill-behavior.test.js` 新增 xsk-execute-plan 断言块，关键词取自 fragment 定稿措辞（先 fragment 后断言，防 RISK-TRANS-001 [ADDRESSED] 踩空）；过程门 C1（golden）/C2（think 锚点）/C3（全量）/C4（三命令终门）。

### DES-DOC-001 文档同步
双 README 各三处计数 + 表格行（EN 15 行牵连 six->seven original）；标题行字节不动；CLAUDE.md "Skill runtime stores" 段加技能名与 `.xsk/runs/`。

## Decision Requests

none

## Rollback

全部改动为"新增文件 + 少量既有文件行级编辑"，无数据/状态迁移，未触发 npm 发布。回滚 = `git revert` 对应提交（或未提交时丢弃工作区）；packed/golden 由 fragment 确定性再生成，不存在不可重建状态。用户侧无影响：技能仅在下次 `xsk install` 后生效，卸载由既有 manifest 机制覆盖。

## Observability

- 构建期：确定性测试即观测面（golden 字节比对、计数断言、README pinning、锚点断言）；C1-C4 每步有明确命令与通过判据。
- 运行期（技能被消费后）：run ledger `.xsk/runs/<slug>.md` 即执行轨迹（任务状态、验收结果、UI 轮次），可直接人读；报告措辞规则（"功能验收未执行"显著标注、UI warning 列表）保证零门禁与残差可见。
- 本 CLI 零依赖无遥测，不新增。

## SPEC Handoff

SPEC 阶段须产出可逐字落盘的实现细节：

1. 四个 fragment 的完整英文定稿文本（含 ledger schema 代码块、两级验收表述、gitignore 纪律句式）。
2. think 两 fragment 的精确 diff（旧句 -> 新句），并附锚点保留核对表。
3. `lib/skills.js` 条目的插入位置与逐字内容。
4. 四个测试文件的精确修改（generator 名单/标题、install 计数/标题、self-conformance 路径、skill-behavior 新块的具体断言正则）。
5. 双 README 六处措辞 + 两行表格行的逐字新文本；CLAUDE.md 段落新文本。
6. 执行顺序与 C1-C4 门的嵌入位置（A fragment 先行、断言后写）。

## Trace
<!-- Map this stage's IDs to upstream/downstream. R3 derives & checks closure. -->
| This ID | Upstream | Status |
|---|---|---|
| DES-ARCH-001 | SCOPE-IN-001, SCOPE-IN-006 | mapped |
| DES-ARCH-002 | SCOPE-IN-002, SCOPE-IN-006, RISK-TRANS-001 [ADDRESSED] | mapped |
| DES-ARCH-003 | SCOPE-IN-004, RISK-REG-001 [ADDRESSED] | mapped |
| DES-DATA-001 | SCOPE-IN-003, RISK-SEC-001 [ADDRESSED] | mapped |
| DES-SEM-001 | SCOPE-IN-005 | mapped |
| DES-TEST-001 | SCOPE-IN-007, SCOPE-IN-010, RISK-TEST-001 [ADDRESSED], RISK-GEN-001 [ADDRESSED] | mapped |
| DES-DOC-001 | SCOPE-IN-008, SCOPE-IN-009, RISK-DOC-001 [ADDRESSED] | mapped |
<!-- /r2p-read-only -->

## Project Context (read-only)
# Project Context Pack

- repo_root: `/Users/xubo/x-studio/xsk`
- languages: {'JavaScript': 6571}
- package_managers: npm
- test_commands: ['npm test']
- entrypoints: none
- config_files: none
- dependencies (0): none
- source_dirs: ['bin', 'docs', 'lib', 'requirements', 'scripts', 'shared', 'skills', 'templates', 'test']
<!-- /r2p-read-only -->
