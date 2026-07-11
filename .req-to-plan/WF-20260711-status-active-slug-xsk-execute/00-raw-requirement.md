---
r2p_stage: raw_requirement
r2p_version: 1
r2p_status: approved
r2p_created_at: 2026-07-11T08:59:49.496923+00:00
r2p_updated_at: 2026-07-11T09:11:46.294288+00:00
---

---
status: active
slug: xsk-execute-plan
created_at: 2026-07-11
---

# 需求：新增轻量任务执行技能 xsk-execute-plan

## Background

在会话里直接执行任务（无论来自 xsk-think 的已批准方案，还是用户直接给出的小需求），执行期要读写大量文件内容，会把主会话上下文灌爆；一旦触发压缩，执行精度与中间状态丢失。现有工具不填这个位：r2p-execute 是完整 spec 流程（过重），harness plan mode 是另一种交互范式，裸 subagent 无纪律约束。需要一个落在"内联手做"与"完整 spec/r2p"之间的轻量执行技能。

本需求由调研点 `.xsk/points/archive/xsk-execute-plan.md`（status: consumed）折叠而来，该点已经过三轮审查，全部仓库事实带行号验证。

## Goal

新增四平台纯指令技能 `xsk-execute-plan`（`fragmentBase: execute-plan`）。核心契约：显式调用 + 一次确认门 + 子代理隔离执行 + 全部完成后统一验收。价值主张：把吃上下文的读文件/改代码工作隔离进 subagent，主会话只保留紧凑结果，配合持久化 run ledger 抗上下文压缩。

适用判据（写进 purpose）：任务决策上简单、但执行期读写量明显大于任务描述本身（多文件改动、多步骤）。反例（内联直接做，不调此技能）：琐碎单文件修改、一条命令能完成的事。

## Scope

### In

- `lib/skills.js` 注册表新条目（四平台）。
- 四个新 fragment：`templates/fragments/execute-plan.{purpose,triggers,behavior,output}.md`。
- 修改 xsk-think 两个 fragment 增加衔接提议。
- 重生成 xsk-execute-plan 与 xsk-think 的 packed SKILL.md 与 golden fixture。
- 测试枚举与计数更新（generator / install / self-conformance / skill-behavior）。
- 双 README 计数措辞与技能表格行。
- 仓库 CLAUDE.md 的 "Skill runtime stores" 段更新。

### Out（真实非目标）

- 不改任何 `lib/` 运行时代码：这是纯指令技能，`lib/` 不感知 `.xsk/runs/`。
- 不自建 UI 测试框架：渲染/截图/视觉比对全部委派现有工具。
- 不做自动触发：显式调用是红线。
- 不替代 r2p-execute，不与 harness plan mode 集成。
- 不为 run ledger 做 git 提交编排（台账 gitignored，交付物由用户自己提交）。

## Requirements

### R1 注册表条目

`lib/skills.js` 追加（description 已定稿，全 ASCII）：

```js
{
  name: 'xsk-execute-plan',
  description:
    'Execute a small plan or request as subagent-isolated tasks tracked in a .xsk/runs/ ledger: one confirmation gate, no per-task review, unified acceptance at the end. Explicit invocation only.',
  platforms: ALL_PLATFORMS.slice(),
  fragmentBase: 'execute-plan',
}
```

### R2 技能行为（behavior fragment 的七步）

1. Intake + 轻量落地：一句话复述目标；输入是具体计划直接用，是小需求就快速扫直接相关代码/config（轻量，非完整 xsk-think）。
2. 快速 preflight：扫 CLAUDE.md/AGENTS.md 硬规则，点到为止。
3. 拆解：有序任务列表（最少一条，琐碎即单行一条）+ 执行前定义验收标准；标注每个任务是否有 UI 面，UI 项记"参照(设计稿链接/图) + 目标端(Android/web/desktop) + 渲染截图方式"。
4. 唯一确认门：任务列表 + 验收标准给用户拿一次 go-ahead，正常执行路径全程仅此一个 checkpoint（R4 的续跑询问属异常恢复路径，不计入）；输入即便是已批准的 xsk-think 方案也要过（确认的是任务拆分）。
5. 派发执行：每任务一个 subagent，prompt 自包含（含该任务的计划切片 + 归属验收项）；按依赖排序；仅当预期改动文件集互不相交才并行，无法判定即串行；任务间不 review 不验收；主会话只记紧凑结果；任务失败停其依赖链、保留已完成、如实上报，不假装原子性、不无限自动修。
6. 全部完成后统一验收：按 R6/R7 两级语义执行。
7. 上报即停：逐任务紧凑结果 + 逐项验收 pass/fail；失败提供至多一次有界修复，不循环；不 commit/push 除非用户要求。

### R3 触发规则（triggers fragment）

仅显式调用（`/xsk-execute-plan` 或"用 xsk-execute-plan 执行"）。故意不自触发于执行意图，避开 harness plan mode 冲突；此为技能本地规则，覆盖 shared 的"按意图匹配"约定。接受两类输入：具体执行计划 / 小需求。

### R4 run ledger（`.xsk/runs/<slug>.md`）

schema：

```markdown
---
status: running | done | failed
slug: <slug>            # 由目标一行生成，^[a-z0-9]+(-[a-z0-9]+)*$
created_at: <ISO date>
source: plan | request  # request 指"小需求"输入，非 .xsk/requirements 文档
---

# <目标一行>

## Acceptance
- [ ] 验收项

## Tasks
1. [pending|done|failed] <完整任务描述，自包含可重派，含归属验收项> - <紧凑结果>

## Result
（全部完成后填：逐项 pass/fail、失败项、遗留）
```

规则：

- 确认门通过、开始执行时才落盘 `status: running`；每任务完成即更新对应行；全部完成写 Result 并置 `done`/`failed`。
- Tasks 条目必须自包含（完整任务描述 + 归属验收项），足以在会话上下文丢失后直接重派子代理。
- 续跑：发现同 slug 的 `status: running` 且有 pending/failed 任务时询问"续跑还是重开"；续跑只重派未完成、跳过 done；重开覆写旧 ledger。同 slug 的 done/failed 旧台账被新运行直接覆写、不询问。台账可随时删除，不做归档。
- 确保 `.xsk/.gitignore` 含 `runs/`（缺则建、只追加、绝不覆盖既有文件）。
- 不做 commit offer。

### R5 与 xsk-think 的衔接

改 `templates/fragments/think.behavior.md` 第 6 步 + `think.output.md`：仅当 (1) 产出是含具体执行步骤的可执行方案（非纯判断/审查裁决，如"不值得做""保持现状"），且 (2) 方案决策完备、Open Questions 已全部解决，才追加一句"是否用 xsk-execute-plan 执行？"。只提议，绝不自动调用。

措辞必须保留既有测试锚点（`test/generator.test.js:123`、`test/skill-behavior.test.js:55`）：`decision-complete plan`、`planning-only`、`explicit approval`、`Open Questions`、`Proposed Design Summary`、`出方案` 与 `plan this`、`stop ... wait for approval`；不得引入 `Approved Design Summary`。

### R6 两级验收语义

| 验收类型 | 级别 | 失败后果 |
|---|---|---|
| 功能/代码验收（tests/lint/build） | 真实信号（无未经验证的断言） | 如实报 pass/fail；失败可置 `status: failed` 并提供一次有界修复 |
| UI 还原度验收 | 警告级 best-effort | 残差仅作 warning 附注，不影响整体 done/failed，不是 GATE |
| 不可验收（UI 或功能均适用） | 无 | 跳过并注明，不失败、不阻断 |

整体 `done`/`failed` 只由功能/代码验收 + 任务执行结果决定。功能验收不可执行（项目无任何可运行验证）时同样只能跳过，但必须在报告显著位置标注"功能验收未执行"，绝不能让零门禁运行看起来像被验证过。

### R7 UI 验收细则（警告级，仅可验收时）

1. 可验收判定：环境能否渲染该 UI 并截图。能则进行；不能则跳过并记一句"UI 验收跳过：当前环境不可渲染/截图"，不算失败、不阻断、不要求用户处理。
2. 观测 + 比对：渲染截图，与设计稿参照视觉比对，列具体偏差（间距/颜色/对齐/缺元素/溢出）；委派现有工具。
3. 有界还原：有偏差则派只针对这些偏差的 fix subagent，重渲染重比对；默认最多 2 轮，用户可在调用时指定其他轮数。多个 UI 验收项的修复子代理沿用 R2 步骤 5 的文件集规则：预期改动文件集互不相交才并行，无法判定即串行。
4. 结果仅警告级：到上限仍有残差则作 warning 列入报告，绝不判 failed、绝不作 gate；每轮记入 ledger。非 UI 任务跳过本环节。

### R8 生成物与 golden

用仓库 CLAUDE.md 的 `node -e` 再生成片段，分别重生成 xsk-execute-plan 与 xsk-think 的 packed（`skills/<base>/SKILL.md`）+ golden（`test/fixtures/golden/<name>.md`），共 2 技能 x 2 文件。golden 文件名用 skill.name（`xsk-execute-plan.md`），目录与 fragment 用 base（`execute-plan`）。所有 fragment 全 ASCII，禁 em-dash(U+2014)/en-dash(U+2013)。

### R9 测试更新

- `test/generator.test.js:73` 排序列表插入 `'xsk-execute-plan'`（在 `xsk-consume-point` 与 `xsk-point` 之间）；`:69` 测试标题 "all eight skills" 改 nine。
- `test/install.test.js:1296-1327` 平台计数断言与测试标题由 8/7/7/7（"all 8 skills"/"get 7"）改为 9/8/8/8。
- `test/self-conformance.test.js:~160` 打包必含列表加 `'skills/execute-plan/SKILL.md'`。
- `test/skill-behavior.test.js` 新增 xsk-execute-plan 测试块，断言覆盖：显式触发、适用判据、拆任务 + 验收、ledger 落盘 + gitignore `runs/`、ledger 条目自包含可重派、subagent 执行、并行需文件集不相交、任务间不 review、全部完成后验收、功能验收缺失显著标注、续跑、UI 验收警告级非 gate、不可渲染跳过不失败、残差仅 warning、有界轮数、停止上报。
- xsk-think 的既有断言锚点见 R5，衔接措辞不得破坏。

### R10 README 更新（双份锁步）

各改三处计数措辞 + 各加一行表格行：

- EN：15 行 `eight curated skills (two distilled from third parties, six original)` 改 `nine ... seven original`；21 行 `**Eight curated skills**` 改 `**Nine curated skills**`；65 行 `Eight skills, prefixed` 改 `Nine skills, prefixed`。
- CN：15 行 `八个精选 skill（两个……六个原创）` 改 `九个……七个原创`；21 行 `**八个精选 skill**` 改 `**九个精选 skill**`；65 行 `共八个 skill` 改 `共九个 skill`。
- 表格各加 `xsk-execute-plan` 一行，两份文案对应。标题行保持字节一致。

### R11 仓库 CLAUDE.md 更新

"Skill runtime stores" 段：把 `xsk-execute-plan` 加入技能清单，把 `.xsk/runs/` 加入 `.xsk/` 存储路径清单。

## Acceptance

- `npm test` 全绿（含 golden、self-conformance、install 计数、readme-pinning、baseline）。
- `npm run syntaxcheck` 通过。
- `npm pack --dry-run` 的文件列表含 `skills/execute-plan/SKILL.md`。
- 生成的 `skills/execute-plan/SKILL.md` 无 em/en dash、无未替换占位符（`{{...}}`）。
- 生成的 xsk-think SKILL.md 保留 R5 全部锚点且不含 `Approved Design Summary`。
- 双 README 标题行字节一致，计数措辞两份均为"九/nine"。

## Checkpoints

- C1 fragment 完成后：立即重生成 packed + golden（两技能都要），`node --test test/golden.test.js` 通过后再继续。
- C2 xsk-think fragment 修改后：`node --test test/generator.test.js test/skill-behavior.test.js` 确认锚点断言仍绿。
- C3 测试枚举更新后：完整 `npm test` 全绿。
- C4 最终门：`npm test` + `npm run syntaxcheck` + `npm pack --dry-run` 三项全部通过，对照本文件 Acceptance 逐项确认。

## Implementation notes

- 手改 packed SKILL.md 或 golden 必崩 golden.test：只改 fragment，再重生成二者。
- `install.test.js` 的平台计数是最易漏的硬编码（仓库 CLAUDE.md 加技能清单未提及）。
- 并行子代理改同一文件会互相覆写：无法判定文件集不相交就串行。
- subagent prompt 不自包含则抗压缩收益归零。
- ledger 只在确认门通过后落盘，避免为未批准方案留垃圾。
- UI 残差只能降 warning；只有功能验收 + 任务执行失败才允许 `status: failed`。
- EN README 15 行还牵连 `six original` 改 `seven original`（execute-plan 属原创）。

## Open Questions

无。全部决策已在调研点阶段闭合（三轮审查，无遗留分叉）。
