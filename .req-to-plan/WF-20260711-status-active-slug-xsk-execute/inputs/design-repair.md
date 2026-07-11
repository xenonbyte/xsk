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

## Upstream Summary (read-only)
# Risk Discovery

## Risks

### RISK-GEN-001 [ADDRESSED] 生成物与 golden 脱同步
Status: open
手改 packed `SKILL.md` 或 golden，或改了 fragment 忘记重生成其一，会让 `golden.test` 红，或更糟：本地看似通过但生成管线与提交内容字节不一致。涉及两个技能（execute-plan 新建 + think 修改），think 的 golden 最易被忘。

### RISK-TEST-001 [ADDRESSED] 硬编码枚举漏改
Status: open
仓库有四处技能枚举/计数硬编码（`generator.test.js:69/73`、`install.test.js:1296-1327`、`self-conformance.test.js:~160`、`skill-behavior.test.js` 块）。`install.test.js` 的平台计数（8/7/7/7）连仓库 CLAUDE.md 的加技能清单都没提，是已被上游调研证实的最易漏点。

### RISK-REG-001 [ADDRESSED] xsk-think 回归
Status: open
修改 think 两个 fragment 可能破坏既有测试锚点（7 个必保短语），或引入被显式禁止的 `Approved Design Summary`，改变现有用户的技能语义。

### RISK-TRANS-001 [ADDRESSED] 中文规范到英文 fragment 的语义漂移
Status: open
上游需求以中文写成，而本仓库 fragment 一律英文 ASCII。翻译时可能丢失约束（如"覆写不询问仅限 done/failed"这类边界条件），且新增 skill-behavior 测试断言的英文关键词必须与 fragment 实际措辞一致，先写测试后写 fragment 会互相踩空。

### RISK-SEC-001 [ADDRESSED] 生成技能对用户项目文件的写入纪律
Status: open
新技能指导 agent 写用户项目的 `.xsk/runs/` 与 `.xsk/.gitignore`。若 fragment 措辞松动（如未写明 append-only），执行该技能的 agent 可能覆写用户已有 `.xsk/.gitignore`；ledger 的"done/failed 直接覆写"若不限定状态范围会误伤 running 台账。

### RISK-DOC-001 [ADDRESSED] 双 README 锁步破坏
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

- RISK-GEN-001 [ADDRESSED]：只改 fragment；C1 在 fragment 完成后立即重生成两技能 packed + golden 并跑 `node --test test/golden.test.js`；两技能同批处理，think 不单独遗留。
- RISK-TEST-001 [ADDRESSED]：SCOPE-IN-007 已带行号逐点列出四处；C3 全量 `npm test` 兜底；行号漂移以内容匹配为准（Assumptions）。
- RISK-REG-001 [ADDRESSED]：C2 在 think 修改后即跑 `node --test test/generator.test.js test/skill-behavior.test.js`；R5 锚点清单作为编辑时的对照检查表。
- RISK-TRANS-001 [ADDRESSED]：先写 fragment、后写断言，断言关键词取自 fragment 实际措辞；fragment 完成后对照需求 R2-R7 逐条核对边界条件是否都有对应英文语句。
- RISK-SEC-001 [ADDRESSED]：fragment 中 gitignore 措辞复用 xsk-point 已验证纪律原文模式（create-if-absent、append-only、never overwrite）；ledger 覆写语句显式限定"仅 done/failed 状态"；skill-behavior 新测试块断言这些措辞存在。
- RISK-DOC-001 [ADDRESSED]：R10 已逐行列出六处 + 表格行；readme-pinning/baseline 测试是确定性防线，C3/C4 必跑。
- Scope overflow：Boundaries 文件全集作为实现期硬边界，越界文件一律不改。

## Trace
<!-- Map this stage's IDs to upstream/downstream. R3 derives & checks closure. -->
| This ID | Upstream | Status |
|---|---|---|
| RISK-GEN-001 [ADDRESSED] | SCOPE-IN-006, SCOPE-IN-010 | mapped |
| RISK-TEST-001 [ADDRESSED] | SCOPE-IN-007 | mapped |
| RISK-REG-001 [ADDRESSED] | SCOPE-IN-004 | mapped |
| RISK-TRANS-001 [ADDRESSED] | SCOPE-IN-002, SCOPE-IN-007 | mapped |
| RISK-SEC-001 [ADDRESSED] | SCOPE-IN-003 | mapped |
| RISK-DOC-001 [ADDRESSED] | SCOPE-IN-008 | mapped |
| Boundaries | SCOPE-IN-001..010, SCOPE-OUT-001..005 | mapped |
| Scope Overflow Risks | SCOPE-OUT-001..005 | mapped |
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
