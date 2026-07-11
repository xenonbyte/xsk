# Plan

任务按依赖排序，文件集互不相交。中间态说明：PLAN-TASK-001 落地后到 PLAN-TASK-005 完成前，全量 `npm test` 处于预期红（golden 缺失/计数未更新），故 001-004 只做任务级定向验证，全量回归在 006 的 C3 与 007 的 C4 收口。

## Tasks
<!-- Granularity: one PLAN-TASK = one implementer subagent, one task-reviewer; split a task spanning too many files/behaviors, merge only one indivisible behavior. -->

### PLAN-TASK-001 注册表条目
Spec References: SPEC-CONFIG-001
Change Type: modify
TDD Applicable: no（一条数据条目，断言在 PLAN-TASK-005 落地）
Files:
- lib/skills.js
Skeleton:
```js
// skills 数组末尾（xsk-check 之后）追加，逐字取自 SPEC-CONFIG-001：
{
  name: 'xsk-execute-plan',
  description:
    'Execute a small plan or request as subagent-isolated tasks tracked in a .xsk/runs/ ledger, with one confirmation gate, no per-task review, and unified acceptance at the end. Explicit invocation only.',
  platforms: ALL_PLATFORMS.slice(),
  fragmentBase: 'execute-plan',
},
```
Steps:
- [ ] 在 `skills` 数组 `xsk-check` 条目后追加上述逐字条目
Verification: (1) `npm run syntaxcheck` 通过；(2) `node -e "const{get}=require('./lib/skills');const s=get('xsk-execute-plan');console.log(s.platforms.join(','),s.fragmentBase)"` 输出 `claude,codex,opencode,gemini execute-plan`。全量 suite 此时预期红，不作为本任务判据。

### PLAN-TASK-002 四个 execute-plan fragment
Spec References: SPEC-BEHAVIOR-001, SPEC-BEHAVIOR-002, SPEC-BEHAVIOR-003, SPEC-BEHAVIOR-004
Change Type: add
TDD Applicable: no（内容即 spec 逐字定稿；断言在 PLAN-TASK-005 落地）
Files:
- templates/fragments/execute-plan.purpose.md
- templates/fragments/execute-plan.triggers.md
- templates/fragments/execute-plan.behavior.md
- templates/fragments/execute-plan.output.md
Skeleton:
```text
四个文件内容 = 06-spec.md SPEC-BEHAVIOR-001..004 围栏块逐字内容（behavior 含内嵌 ledger schema 的 3 反引号围栏）。
```
Steps:
- [ ] 从 spec 逐字落盘四个 fragment（不改一字；若确需微调措辞，必须同步改 PLAN-TASK-005 的断言正则并在 PR 说明中记录）
- [ ] 依赖：PLAN-TASK-001（buildSkill 需要注册表条目）
Verification: (1) `node -e "const{buildSkill}=require('./lib/generator');const{get}=require('./lib/skills');const c=buildSkill(get('xsk-execute-plan')).content;if(/—|–/.test(c)||/\{\{\w+\}\}/.test(c))throw new Error('banned content');console.log(c.length)"` 正常输出长度；(2) `grep -c 'explicitly invoked only\|at most 2 rounds\|never overwrite' templates/fragments/execute-plan.*.md` 命中非零。

### PLAN-TASK-003 think 两 fragment 衔接编辑
Spec References: SPEC-BEHAVIOR-005, SPEC-BEHAVIOR-006
Change Type: modify
TDD Applicable: no（既有锚点断言即回归网，C2 验证）
Files:
- templates/fragments/think.behavior.md
- templates/fragments/think.output.md
Skeleton:
```text
think.behavior.md 第 6 步：整段替换为 SPEC-BEHAVIOR-005 新文（仅追加两句）。
think.output.md 末行后：追加 SPEC-BEHAVIOR-006 新段。
```
Steps:
- [ ] 按 SPEC-BEHAVIOR-005/006 精确 diff 编辑两文件
- [ ] 对照 spec 锚点核对表逐项确认 7 组锚点短语仍逐字存在、无 `Approved Design Summary`
Verification: `grep -l 'never an automatic invocation' templates/fragments/think.behavior.md && grep -l 'never invoke it automatically' templates/fragments/think.output.md && ! grep -rn 'Approved Design Summary' templates/fragments/` 全部满足。

### PLAN-TASK-004 再生成 packed + golden（C1 门）
Spec References: SPEC-GEN-001
Change Type: add + regenerate
TDD Applicable: no（golden.test 即验证）
Files:
- skills/execute-plan/SKILL.md（新）
- test/fixtures/golden/xsk-execute-plan.md（新）
- skills/think/SKILL.md（再生成）
- test/fixtures/golden/xsk-think.md（再生成）
Skeleton:
```js
// 仓库 CLAUDE.md 的 node -e 片段，各跑一次：s = get('xsk-execute-plan') 与 get('xsk-think')
```
Steps:
- [ ] 依赖：PLAN-TASK-002、PLAN-TASK-003
- [ ] 对两技能分别执行再生成片段，产出 4 文件
Verification: **C1 门**：`node --test test/golden.test.js` 全绿（含确定性、平台中立、masked shell 匹配）。

### PLAN-TASK-005 测试枚举与新断言块（C2 门）
Spec References: SPEC-TEST-001, SPEC-TEST-002, SPEC-TEST-003, SPEC-TEST-004
Change Type: modify
TDD Applicable: yes（断言即测试，跑在 004 的产物上）
Files:
- test/generator.test.js
- test/install.test.js
- test/self-conformance.test.js
- test/skill-behavior.test.js
Skeleton:
```js
// generator: :69 标题 eight->nine；:73 名单插入 'xsk-execute-plan'（consume-point 与 point 之间）
// install: :1296 标题 8->9/7->8；:1323-1326 计数 9/8/8/8 + 消息同步
// self-conformance: 必含数组追加 'skills/execute-plan/SKILL.md'
// skill-behavior: 新增 SPEC-TEST-004 逐字测试块 + xsk-think 块追加两条衔接断言
```
Steps:
- [ ] 依赖：PLAN-TASK-004（断言运行在再生成产物上）
- [ ] 按 SPEC-TEST-001..004 逐字修改四个测试文件
Verification: **C2 门**：`node --test test/generator.test.js test/skill-behavior.test.js` 全绿（think 锚点 + 新块）；另 `node --test test/install.test.js test/self-conformance.test.js` 全绿。

### PLAN-TASK-006 双 README + CLAUDE.md 同步（C3 门）
Spec References: PLAN Handoff W6（DES-DOC-001 [ADDRESSED]）
Change Type: modify
TDD Applicable: partial（标题字节一致有测试；计数措辞无测试保护，靠本任务自查 + C4 人工对照）
Files:
- README.md
- README.zh-CN.md
- CLAUDE.md
Skeleton:
```text
EN 15 行 eight/six->nine/seven；21 行 Eight->Nine；65 行 Eight->Nine；表末追加 xsk-execute-plan 行。
CN 15 行 八/六->九/七；21 行 八->九；65 行 八->九；表末追加对应中文行。
CLAUDE.md "Skill runtime stores" 段：技能清单加 xsk-execute-plan，路径清单加 .xsk/runs/。
```
Steps:
- [ ] 依赖：PLAN-TASK-005
- [ ] 按 spec 六处计数 + 两行表格行 + CLAUDE.md 段落逐字修改
Verification: **C3 门**：`npm test` 全量全绿；`grep -c 'nine\|九个\|共九' README.md README.zh-CN.md` 自查计数落位。

### PLAN-TASK-007 终门 C4 + 验收对照
Spec References: PLAN Handoff W7（SCOPE-IN-010）
Change Type: verify-only（零文件改动）
TDD Applicable: no
Files:
- （无改动；只读验证）
Skeleton:
```sh
npm test && npm run syntaxcheck && npm pack --dry-run
```
Steps:
- [ ] 依赖：PLAN-TASK-006
- [ ] 跑三命令并读输出
- [ ] 对照 AC-001..007 逐项打勾；人工核对双 README 六处计数与表格行（AC-006 无测试保护）
Verification: **C4 门**：三命令全过、`npm pack --dry-run` 文件列表含 `skills/execute-plan/SKILL.md`、AC-001..007 全勾。粘贴三命令实际输出作为证据。

## Execution Readiness

- Requirement brief 已评审（checkpoint approved）
- 设计决策全部闭合；Decision Requests = none（design 评审验证成立）
- 高风险缓解全部映射到任务（见 Risk Handling）
- 非目标受保护：任务文件集与 risk_discovery Boundaries 全集一致，`shared/skill-common.md`、`templates/skill.md.tmpl`、`lib/` 其余文件、`package.json` 不在任何任务的 Files 中
- 验证命令全部可执行；预期改动文件已逐任务列出
- 无未决歧义；范围外工作已在 brief 声明，本计划无 deferral

## Risk Handling
| Risk | Handling Task | Closure |
|---|---|---|
| RISK-GEN-001 | PLAN-TASK-004（C1 即时验证再生成同步） | [ADDRESSED] |
| RISK-TEST-001 | PLAN-TASK-005（四处枚举逐字修改 + install 计数） | [ADDRESSED] |
| RISK-REG-001 | PLAN-TASK-003（锚点核对）+ PLAN-TASK-005（C2 断言） | [ADDRESSED] |
| RISK-TRANS-001 | PLAN-TASK-002（spec 逐字落盘，先 fragment 后断言不变式） | [ADDRESSED] |
| RISK-SEC-001 | PLAN-TASK-002（gitignore 纪律句式在 SPEC-BEHAVIOR-003 定稿内） | [ADDRESSED] |
| RISK-DOC-001 | PLAN-TASK-006（六处 + 表格行）+ PLAN-TASK-007（C4 人工对照） | [ADDRESSED] |

## Trace
<!-- Map this stage's IDs to upstream/downstream. R3 derives & checks closure. -->
| This ID | Upstream | Status |
|---|---|---|
| PLAN-TASK-001 | SPEC-CONFIG-001, SCOPE-IN-001 | mapped |
| PLAN-TASK-002 | SPEC-BEHAVIOR-001..004, SPEC-DATA-001, SCOPE-IN-002, SCOPE-IN-003, SCOPE-IN-005 | mapped |
| PLAN-TASK-003 | SPEC-BEHAVIOR-005, SPEC-BEHAVIOR-006, SCOPE-IN-004 | mapped |
| PLAN-TASK-004 | SPEC-GEN-001, SCOPE-IN-006 | mapped |
| PLAN-TASK-005 | SPEC-TEST-001..004, SCOPE-IN-007 | mapped |
| PLAN-TASK-006 | PLAN Handoff W6, SCOPE-IN-008, SCOPE-IN-009 | mapped |
| PLAN-TASK-007 | PLAN Handoff W7, SCOPE-IN-010, AC-001..007 | mapped |

## Upstream Summary (read-only)
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

````markdown
**1. Intake and ground lightly.** Restate the goal in one sentence. A concrete plan (such as an approved `xsk-think` design) is taken as given; a small plain-language request gets a quick scan of the directly relevant code and config, not a full design pass. Derive the run slug from the goal line using the pattern `^[a-z0-9]+(-[a-z0-9]+)*$`. If `.xsk/runs/<slug>.md` already exists with `status: running` and pending or failed tasks, ask the user once whether to resume (re-dispatch only the unfinished tasks, skipping the done ones) or start over (overwrite the ledger). A leftover ledger whose status is `done` or `failed` is overwritten silently; only `running` triggers the question.

**2. Preflight the hard rules.** Scan `CLAUDE.md`, `AGENTS.md`, and any repo rules or config for constraints that would forbid or force a choice. Keep this brief: it is a check, not a study.

**3. Decompose and define acceptance.** Produce an ordered task list with at least one entry; a trivial run is simply a one-line list. Define the acceptance criteria before anything executes. Mark every task that has a UI surface and record for it the reference (a design link or image), the target platform (Android, web, or desktop), and how to render and screenshot it.

**4. One confirmation gate.** Show the user the task list and the acceptance criteria, and get a single go-ahead. This is the only checkpoint on the normal path; the resume question in step 1 is exceptional recovery, not a second gate. Even an already-approved `xsk-think` plan passes through it, because what is being confirmed is the task breakdown, which the user has not seen yet.

**5. Open the ledger, then dispatch.** Only after the gate passes, write the run ledger `.xsk/runs/<slug>.md` with `status: running`:

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

`source: plan` means the input was a concrete plan; `source: request` means a small plain-language request, not a `.xsk/requirements/` document. Every `## Tasks` entry carries the full task description as confirmed at the gate; a one-line stub would make resuming meaningless once the session context is gone. Ensure `.xsk/.gitignore` contains the line `runs/` (create `.xsk/` and `.xsk/.gitignore` if absent; append the line only if it is missing; never overwrite an existing `.xsk/.gitignore`). The ledger is transient execution state, not a deliverable: never offer to commit it, and stale ledgers may be deleted freely.

Then dispatch. Each task goes to one subagent with a self-contained prompt holding its slice of the plan and its acceptance items, because a subagent sees none of the main conversation. Order tasks by dependency. Run tasks in parallel only when their expected file sets do not overlap; when in doubt, run them serially, since parallel subagents editing the same file overwrite each other. Between tasks there is no review and no acceptance run: the main conversation records only each task's compact result, and updates the task's ledger line as soon as it finishes. When a task fails, stop its dependents, keep what finished, and report honestly. No pretended atomicity, no unbounded auto-fixing.

**6. Accept once, after all tasks.** Two tiers with different weight.

- Functional acceptance is a real signal. Run the project's own verification (tests, lint, build) and read the output. A failure is reported as a failure and may set the ledger to `status: failed`, with at most one bounded fix attempt, never a loop. When the project has no runnable verification at all, skip it but state "functional acceptance not run" prominently in the report: a run with zero gates must never look verified.
- UI fidelity acceptance is warning-level, never a gate. Run it only for tasks marked with a UI surface, and only when the environment can render the UI and capture a screenshot; otherwise skip it with the single line "UI acceptance skipped: cannot render or screenshot here", which is not a failure, blocks nothing, and asks nothing of the user. When it runs: render, screenshot, compare against the design reference, and list concrete deviations (spacing, color, alignment, missing elements, overflow), delegating rendering, screenshots, and visual comparison to existing tools rather than building any. Dispatch a fix subagent scoped to exactly those deviations, re-render, and re-compare, at most 2 rounds by default (the user may set another bound at invocation). Fix subagents follow the same file-set rule as step 5. Record each round in the ledger. Any deviation that survives the last round goes into the report as a warning for the user to weigh; it never fails the run and never gates anything.

The final `done` or `failed` comes from functional acceptance and task outcomes alone; UI residuals never change it.

**7. Report and stop.** Fill `## Result`: each task's compact outcome, each acceptance criterion's pass or fail, UI warnings if any, and whether functional acceptance ran. Set the final ledger status. Do not commit, push, or publish unless the user asks for it. Stop.
````

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

实现 DES-ARCH-001 [ADDRESSED]。插入位置：`skills` 数组末尾（`xsk-check` 条目之后；数组顺序无语义，测试名单对 `names.sort()` 断言）。description 相对 R1 原定稿的改动（"ledger: one" -> "ledger, with one"，并列结构补 and）已于 2026-07-11 经用户确认：未加引号的 YAML frontmatter 值内不允许冒号+空格（spec 评审 F2），`.xsk/requirements/xsk-execute-plan.md` R1 已同步回改。逐字内容：

```js
  {
    name: 'xsk-execute-plan',
    description:
      'Execute a small plan or request as subagent-isolated tasks tracked in a .xsk/runs/ ledger, with one confirmation gate, no per-task review, and unified acceptance at the end. Explicit invocation only.',
    platforms: ALL_PLATFORMS.slice(),
    fragmentBase: 'execute-plan',
  },
```

### SPEC-DATA-001 run ledger 数据契约

即 SPEC-BEHAVIOR-003 内嵌 schema（status/slug/created_at/source 四字段 frontmatter + Acceptance/Tasks/Result 三节）。数据契约完全活在生成的技能 prose 中，`lib/` 零感知（SCOPE-OUT-001）。

### SPEC-GEN-001 再生成规程

实现 DES-ARCH-001/002 的生成收口（RISK-GEN-001 [ADDRESSED]）。fragment 落盘后，对 `xsk-execute-plan` 与 `xsk-think` 各执行一次仓库 CLAUDE.md 的 node -e 片段（替换其中的技能名），产出 4 个文件：`skills/execute-plan/SKILL.md`、`test/fixtures/golden/xsk-execute-plan.md`、`skills/think/SKILL.md`、`test/fixtures/golden/xsk-think.md`。

## External Documentation Checked

N/A — no external dependencies

零依赖 CLI，纯仓库内约定，无外部库/框架/SDK 需核查。仓库内规范来源：CLAUDE.md（生成管线、约定）、既有 fragment 原型（point.behavior 的 gitignore 纪律句式）。

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
