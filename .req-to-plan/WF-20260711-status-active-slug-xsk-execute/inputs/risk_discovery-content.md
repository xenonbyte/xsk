# Risk Discovery

## Risks

### RISK-GEN-001 生成物与 golden 脱同步
Status: open
手改 packed `SKILL.md` 或 golden，或改了 fragment 忘记重生成其一，会让 `golden.test` 红，或更糟：本地看似通过但生成管线与提交内容字节不一致。涉及两个技能（execute-plan 新建 + think 修改），think 的 golden 最易被忘。

### RISK-TEST-001 硬编码枚举漏改
Status: open
仓库有四处技能枚举/计数硬编码（`generator.test.js:69/73`、`install.test.js:1296-1327`、`self-conformance.test.js:~160`、`skill-behavior.test.js` 块）。`install.test.js` 的平台计数（8/7/7/7）连仓库 CLAUDE.md 的加技能清单都没提，是已被上游调研证实的最易漏点。

### RISK-REG-001 xsk-think 回归
Status: open
修改 think 两个 fragment 可能破坏既有测试锚点（7 个必保短语），或引入被显式禁止的 `Approved Design Summary`，改变现有用户的技能语义。

### RISK-TRANS-001 中文规范到英文 fragment 的语义漂移
Status: open
上游需求以中文写成，而本仓库 fragment 一律英文 ASCII。翻译时可能丢失约束（如"覆写不询问仅限 done/failed"这类边界条件），且新增 skill-behavior 测试断言的英文关键词必须与 fragment 实际措辞一致，先写测试后写 fragment 会互相踩空。

### RISK-SEC-001 生成技能对用户项目文件的写入纪律
Status: open
新技能指导 agent 写用户项目的 `.xsk/runs/` 与 `.xsk/.gitignore`。若 fragment 措辞松动（如未写明 append-only），执行该技能的 agent 可能覆写用户已有 `.xsk/.gitignore`；ledger 的"done/failed 直接覆写"若不限定状态范围会误伤 running 台账。

### RISK-DOC-001 双 README 锁步破坏
Status: open
计数措辞每份三处（15/21/65 行）+ 表格行 + 标题行字节一致约束；漏改任何一处触发 readme-pinning/baseline 红，EN 15 行还牵连 `six original` -> `seven original`。

## Boundaries

本 run 允许改动的文件全集（超出即越界）：

- `lib/skills.js`（仅追加一个条目）
- `templates/fragments/execute-plan.{purpose,triggers,behavior,output}.md`（新建）
- `templates/fragments/think.behavior.md`、`templates/fragments/think.output.md`
- `skills/execute-plan/SKILL.md`（新建，生成）、`skills/think/SKILL.md`（再生成）
- `test/fixtures/golden/xsk-execute-plan.md`（新建，生成）、`test/fixtures/golden/xsk-think.md`（再生成）
- `test/generator.test.js`、`test/install.test.js`、`test/self-conformance.test.js`、`test/skill-behavior.test.js`
- `README.md`、`README.zh-CN.md`、`CLAUDE.md`

明确不可触碰：`bin/`、`lib/` 其余文件、`shared/skill-common.md`、`templates/skill.md.tmpl`、其他技能的 fragment/packed/golden、`package.json`。

## Scope Overflow Risks

- 触碰 `shared/skill-common.md`：它嵌入所有九个技能，任何改动迫使全量 golden 再生成，改动面爆炸。禁止。
- 给 `lib/` 加 `.xsk/runs/` 感知（manifest、status、doctor）：违反 SCOPE-OUT-001（纯指令技能）。
- 顺手重构 generator/测试结构或"美化"其他 fragment：违反最小改动，扩大回归面。
- README 除 R10 指定处以外的改写（如重排技能表格顺序）。

## Mitigations

- RISK-GEN-001：只改 fragment；C1 在 fragment 完成后立即重生成两技能 packed + golden 并跑 `node --test test/golden.test.js`；两技能同批处理，think 不单独遗留。
- RISK-TEST-001：SCOPE-IN-007 已带行号逐点列出四处；C3 全量 `npm test` 兜底；行号漂移以内容匹配为准（Assumptions）。
- RISK-REG-001：C2 在 think 修改后即跑 `node --test test/generator.test.js test/skill-behavior.test.js`；R5 锚点清单作为编辑时的对照检查表。
- RISK-TRANS-001：先写 fragment、后写断言，断言关键词取自 fragment 实际措辞；fragment 完成后对照需求 R2-R7 逐条核对边界条件是否都有对应英文语句。
- RISK-SEC-001：fragment 中 gitignore 措辞复用 xsk-point 已验证纪律原文模式（create-if-absent、append-only、never overwrite）；ledger 覆写语句显式限定"仅 done/failed 状态"；skill-behavior 新测试块断言这些措辞存在。
- RISK-DOC-001：R10 已逐行列出六处 + 表格行；readme-pinning/baseline 测试是确定性防线，C3/C4 必跑。
- Scope overflow：Boundaries 文件全集作为实现期硬边界，越界文件一律不改。

## Trace
<!-- Map this stage's IDs to upstream/downstream. R3 derives & checks closure. -->
| This ID | Upstream | Status |
|---|---|---|
| RISK-GEN-001 | SCOPE-IN-006, SCOPE-IN-010 | mapped |
| RISK-TEST-001 | SCOPE-IN-007 | mapped |
| RISK-REG-001 | SCOPE-IN-004 | mapped |
| RISK-TRANS-001 | SCOPE-IN-002, SCOPE-IN-007 | mapped |
| RISK-SEC-001 | SCOPE-IN-003 | mapped |
| RISK-DOC-001 | SCOPE-IN-008 | mapped |
| Boundaries | SCOPE-IN-001..010, SCOPE-OUT-001..005 | mapped |
| Scope Overflow Risks | SCOPE-OUT-001..005 | mapped |

## Upstream Summary (read-only)
# Requirement Brief

## Goal

为 xsk 新增四平台纯指令技能 `xsk-execute-plan`（`fragmentBase: execute-plan`）：显式调用 + 一次确认门 + 子代理隔离执行 + 全部完成后统一验收，配合持久化 run ledger（`.xsk/runs/<slug>.md`）抗上下文压缩。适用判据写进 purpose：决策轻 + 执行吃上下文（多文件、多步骤）；琐碎单文件改动内联做。交付包括注册表条目、四个 fragment、xsk-think 衔接修改、packed/golden 重生成、测试枚举与计数更新、双 README 与仓库 CLAUDE.md 同步，最终以 `npm test` + `npm run syntaxcheck` + `npm pack --dry-run` 全绿收口。

## In-Scope

- SCOPE-IN-001 `lib/skills.js` 注册表新条目，description 已定稿（上游 R1 的英文一行，全 ASCII），四平台 `ALL_PLATFORMS.slice()`。
- SCOPE-IN-002 新建 `templates/fragments/execute-plan.{purpose,triggers,behavior,output}.md`：purpose 含适用判据与反例；triggers 仅显式调用（技能本地规则覆盖 shared 意图匹配）；behavior 编码七步（Intake/preflight/拆解/唯一确认门/派发执行/统一验收/上报即停）；output 为逐任务紧凑结果 + 逐项验收 pass/fail。全 ASCII，禁 em/en dash。
- SCOPE-IN-003 behavior fragment 内编码 run ledger 规范：schema（status/slug/created_at/source: plan|request）、确认门通过才落盘、Tasks 条目自包含可重派、续跑与覆写规则、`.xsk/.gitignore` 补 `runs/`、不做 commit offer。
- SCOPE-IN-004 修改 `templates/fragments/think.behavior.md` 第 6 步 + `think.output.md`：两条件（可执行方案且决策完备）同时满足才提议 xsk-execute-plan，只提议不自动调用；保留全部既有测试锚点，不引入 `Approved Design Summary`。
- SCOPE-IN-005 behavior fragment 内编码两级验收语义（功能验收=真实信号可判 failed + 一次有界修复；功能验收缺失须显著标注）与 UI 验收细则（可验收才做、跳过不失败、默认 2 轮有界还原、修复子代理沿用文件集规则、残差仅 warning 永不 gate、每轮记 ledger）。
- SCOPE-IN-006 用仓库 CLAUDE.md 的 node -e 片段重生成 xsk-execute-plan 与 xsk-think 的 packed `skills/<base>/SKILL.md` + golden `test/fixtures/golden/<name>.md`（2 技能 x 2 文件；golden 用 skill.name，目录/fragment 用 base）。
- SCOPE-IN-007 测试更新：`generator.test.js:73` 列表插入（xsk-consume-point 与 xsk-point 之间）与 `:69` 标题 eight->nine；`install.test.js:1296-1327` 计数与标题 8/7/7/7 -> 9/8/8/8；`self-conformance.test.js:~160` 打包列表加 `skills/execute-plan/SKILL.md`；`skill-behavior.test.js` 新增覆盖 16 项断言的测试块（显式触发、适用判据、拆任务+验收、ledger 落盘+gitignore、条目自包含、subagent 执行、并行文件集、任务间不 review、统一验收、功能验收缺失标注、续跑、UI 警告级、跳过不失败、残差 warning、有界轮数、停止上报）。
- SCOPE-IN-008 双 README 各三处计数措辞（EN/CN 15/21/65 行，含 EN `six original`->`seven original`）+ 各加 `xsk-execute-plan` 表格行，标题行字节一致。
- SCOPE-IN-009 仓库 CLAUDE.md "Skill runtime stores" 段：技能清单加 xsk-execute-plan，存储路径加 `.xsk/runs/`。
- SCOPE-IN-010 过程检查点 C1-C4 逐一执行：C1 fragment 后重生成并过 golden.test；C2 think 修改后锚点断言绿；C3 枚举更新后 `npm test` 全绿；C4 最终门三命令全过并对照验收清单。

## Out-of-Scope

- SCOPE-OUT-001 不改任何 `lib/` 运行时代码（纯指令技能，`lib/` 不感知 `.xsk/runs/`）。
- SCOPE-OUT-002 不自建 UI 测试框架（渲染/截图/视觉比对全部委派现有工具）。
- SCOPE-OUT-003 不做自动触发（显式调用是红线）。
- SCOPE-OUT-004 不替代 r2p-execute，不与 harness plan mode 集成。
- SCOPE-OUT-005 不为 run ledger 做 git 提交编排（台账 gitignored，交付物由用户自己提交）。

## Non-Goals

- 不追求 UI 验收成为质量门：警告级 best-effort 是设计决策，非妥协。
- 不追求执行期逐任务 review：任务间不 review 不验收是"不过重"原则的刻意取舍。
- 不为本次新增技能扩展 CLI/manifest/安装机制的任何能力。

## Assumptions

- 全部行号锚点（`generator.test.js:69/73/123`、`skill-behavior.test.js:55`、`install.test.js:1296-1327`、`self-conformance.test.js:~160`、README 双份 15/21/65）于 2026-07-11 对源码逐条验证；实现时若行号漂移，以内容匹配为准。
- 生成管线以仓库 CLAUDE.md 记载的 node -e 再生成片段为准；`package.json` `files` 含 `skills/` 整目录，新增技能无需改 package.json。
- 上游需求已决策完备（调研点三轮审查，Open Questions 为空），本 run 不再做方案分叉。

## Acceptance Criteria

- AC-001 `npm test` 全绿（含 golden、self-conformance、install 计数、readme-pinning、baseline）。
- AC-002 `npm run syntaxcheck` 通过。
- AC-003 `npm pack --dry-run` 文件列表含 `skills/execute-plan/SKILL.md`。
- AC-004 生成的 `skills/execute-plan/SKILL.md` 无 em/en dash、无未替换 `{{...}}` 占位符。
- AC-005 重生成的 xsk-think SKILL.md 保留 R5 全部锚点且不含 `Approved Design Summary`。
- AC-006 双 README 标题行字节一致，计数措辞两份均为 nine/九。
- AC-007 检查点 C1-C4 全部实际执行并通过（SCOPE-IN-010）。

## Open Questions

无。上游 Open Questions 为空，本阶段未产生新的开放问题。

## Sources

- `00-raw-requirement.md`：`.xsk/requirements/xsk-execute-plan.md` 逐字副本（repo commit 10fa3bf）。
- `.xsk/points/archive/xsk-execute-plan.md`：已消费调研点（status: consumed，三轮审查溯源）。
- 本会话对 xsk 源码的行号级验证（见 Assumptions 第一条）。

## Trace
<!-- Map this stage's IDs to upstream/downstream. R3 derives & checks closure. -->
| This ID | Upstream | Status |
|---|---|---|
| SCOPE-IN-001 | 需求 R1 | mapped |
| SCOPE-IN-002 | 需求 R2、R3、Goal 适用判据 | mapped |
| SCOPE-IN-003 | 需求 R4 | mapped |
| SCOPE-IN-004 | 需求 R5 | mapped |
| SCOPE-IN-005 | 需求 R6、R7 | mapped |
| SCOPE-IN-006 | 需求 R8 | mapped |
| SCOPE-IN-007 | 需求 R9 | mapped |
| SCOPE-IN-008 | 需求 R10 | mapped |
| SCOPE-IN-009 | 需求 R11 | mapped |
| SCOPE-IN-010 | 需求 Acceptance + Checkpoints C1-C4 | mapped |
| SCOPE-OUT-001 | 需求 Scope Out 第 1 条 | mapped |
| SCOPE-OUT-002 | 需求 Scope Out 第 2 条 | mapped |
| SCOPE-OUT-003 | 需求 Scope Out 第 3 条 | mapped |
| SCOPE-OUT-004 | 需求 Scope Out 第 4 条 | mapped |
| SCOPE-OUT-005 | 需求 Scope Out 第 5 条 | mapped |
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
