# Risk Discovery

## Risks

### RISK-IMPL-001 逐字替换落错位置或被同义改写
需求给出的是逐字新旧文本，不是语义描述。锚点句在 fragment 中多处措辞相近（step 4 与 step 5 都谈 dispatch 与 result），一次替换落错段落，或实现者顺手把 `Require exactly` 写成 `Require an exact`，都会让字节数与内容契约断言同时对不上，而失败信号出现在测试层，离病根有距离。
Status: open

### RISK-IMPL-002 用抬高上限来迁就改错的实现
本次改动的正当性建立在"1,161 字节是实测差值、上限按下一个百位取整"上。一旦实测字节与 10,129 / 13,155 不符，最省事的动作是把 `EXECUTE_PLAN_BEHAVIOR_MAX` 再调大一点让测试转绿。那会同时销毁 AC-2 的诊断价值和 R7 注释里"这 1,161 字节买到了什么"的可核对性。
Status: open

### RISK-STATE-001 fix 与 check 语义溢出既有状态机
R2 的四个返回分支与 R3 的 fix 状态迁移都必须落在台账既有的四个 token 上。实现时最容易滑出去的三个动作：给漏报 check 造第五种状态；把"容纳 step 5 的 bounded fix"读成"step 5 可以任意写台账"；以及引入 `verdict` 这类与 `functional failure` 同义却没有取值定义的新词。任何一个都把刚焊死的状态机重新撬开。
Status: open

### RISK-STATE-002 fix 额度跨不过会话边界
`the run's one fix` 这个台账标记是"至多一次"能在恢复后仍然成立的唯一依据。若实现把它省成 `an ordinary serial task`，可达路径是：全部任务 `done`，命令失败，派 fix，fix 写 `done`，会话死在重跑 commands 与 reviewer 之前；新会话看到 `status: running` 加全部 `done`，按既有规则重跑完整验收，再次失败时没有任何依据认为额度已用，于是派出第二次 fix。
Status: open

### RISK-TEST-001 R6 的两条既有断言被删除而非就地换 pattern
新措辞会让这两条从通过变成失败。测试红的时候，删掉断言是最快的转绿方式，而这两条断言的性质（untracked 路径进入复审；至多一次且 done 后完整重验）与 R5 新增的任何一条都不重复。删掉它们，测试全绿而覆盖变薄，且断言总数从 48 变成 46 时没有任何门禁会喊。
Status: open

### RISK-TEST-002 断言归属被实现者临场决定
R5 已经把 19 条断言分别钉到 `gate, ledger, and dispatch`（8 条）与 `acceptance, recovery, and reporting`（11 条）两个块。归属若临场判断，同一份需求两个人实现会落到不同块，块内计数（10 + 16 + 22 = 48）随之失真，而 `npm test` 仍然全绿。
Status: open

### RISK-GEN-001 手改 packed skill 或 golden，或用错的比较方式
`skills/execute-plan/SKILL.md` 与 `test/fixtures/golden/xsk-execute-plan.md` 是生成产物。手改能让 `test/golden.test.js` 在本地通过而与生成器脱钩；把 masked golden 直接与原始 `content` 比较则会得出"生成错了"的假结论，因为 golden 里的 shared body 已被 `<SHARED_MASKED>` 替换。
Status: open

### RISK-DOC-001 交付说明把 R1 说成等价替换
R1 相对"控制器自己跑 diff 再贴过去"的零让步，只在 exclusive-worktree 前提实际成立时成立；相对 r2p 的固定快照，它是净让步：复审读的是活工作区，求值发生在读的那一刻，现有 invariants 检不出 allowed-path 内的并发写。交付里说成等价替换，等于把一个已知的取舍写没了。
Status: open

### RISK-CONV-001 生成内容混入仓库禁止的字符
`test/generator.test.js` 禁止生成内容出现 U+2014 与 U+2013。需求给定的英文措辞本身干净，但实现者在 fragment 里补写连接词或在注释中排版时容易带入，而这条只在生成后的测试里才暴露。
Status: open

## Boundaries

- 唯一被改的 fragment 是 `templates/fragments/execute-plan.behavior.md`；`execute-plan.purpose.md`、`execute-plan.triggers.md`、`execute-plan.output.md` 三份保持原样（SCOPE-OUT-002）。
- 唯一被改的测试文件是 `test/skill-behavior.test.js`，且只动字节上限、预算注释与三个 xsk-execute-plan 内容契约块；退役机制黑名单保持原样（SCOPE-OUT-004）。
- `skills/execute-plan/SKILL.md` 与 `test/fixtures/golden/xsk-execute-plan.md` 只能由 `buildSkill()` 写入，人手不进这两个文件。
- `lib/` 全部保持原样（SCOPE-OUT-001）：xsk 的 `lib/` 从不读技能文档，本次三组改动全在 prose 层。
- `lib/skills.js` 的 description、`README.md`、`README.zh-CN.md`、`AGENTS.md` 全部保持原样（SCOPE-OUT-003）：技能数与对外能力都没变，因此 `CLAUDE.md` 里"新增技能要同步的清单"整条不适用。
- 状态词汇边界：台账只有既有的四个 token，本次不新增取值，也不引入 `verdict`。
- 台账写入边界：step 5 获得的写入许可仅限唯一一次 bounded fix 的 `in-flight|done|failed` 记录，不是任意写入。
- 版本库边界：不 commit、不 push、不开 PR（SCOPE-OUT-010）；工作区改动交给用户裁决。

## Scope Overflow Risks

- 顺手实现被排除的候选。C、D、E、F 四条在 raw requirement 里有完整的取用条件表，任何一条被"顺便"写进 fragment，都会同时撑破字节预算并让"抬上限买到了什么"说不清（SCOPE-OUT-006、SCOPE-OUT-007、SCOPE-OUT-008、SCOPE-OUT-009）。
- 顺手"修"掉 `Between tasks there is no code review and no acceptance run`。R2 与它并不冲突：R2 是子代理对自己已跑检查的报告义务，不是控制器在任务之间新开门禁。读成冲突并删掉其中一句，是本次最可能发生的越界编辑。
- 顺手补齐 README 与 `AGENTS.md`。`CLAUDE.md` 里那份"改技能就同步计数"的清单只对新增或删除技能生效；本次技能集合没变，动它们属于越界（SCOPE-OUT-003）。
- 把 xsk 的证据模型往 r2p 方向推。per-task commit、`commit_range`、路径 preflight、auto-archive 门禁在 xsk 里没有落脚点，引入任何一条都不是本次改动的延伸而是换掉入场模型（SCOPE-OUT-005）。
- 为了让测试更"完整"而补写需求未授权的断言，或把 247 这个用例数改掉。新增的必须是既有 test 块里的 `assert.ok`。

## Mitigations

- RISK-IMPL-001 [ADDRESSED]：编辑前先对四个锚点各做一次精确计数（各命中一次），编辑后再做一次（三个旧句归零、R2 锚点仍为一次、四段新文本各一次），并以 10,129 字节作为独立交叉校验。计数对不上就停下查位置，而不是继续往下走。
- RISK-IMPL-002 [ADDRESSED]：把 10,129 / 13,155 / 12,629 三个数写进验收项，且明确规定实测不符时的动作是停下核对，禁止调高上限迁就；上限值 13200 与 10200 由需求给定，不由实现结果反推。
- RISK-STATE-001 [ADDRESSED]：R2 与 R3 的新文本逐字复制，不做同义改写；实现后用 grep 确认 `verdict` 在 fragment 中零命中，并确认台账 token 集合未变。
- RISK-STATE-002 [ADDRESSED]：`Append it to the ledger as the run's one fix` 与 `an ordinary serial task under every step 4 rule` 拆成两条独立断言，任一半被删都会红；台账写入边界句同步改为 `for step 5's bounded fix`，让 in-flight 记录有合法落点。
- RISK-TEST-001 [ADDRESSED]：R6 明确写成"就地换 pattern"，并给出两条新 pattern 的逐字文本；验收项把三个块的断言条数固定为 10 + 16 + 22 = 48，删除会让计数对不上。
- RISK-TEST-002 [ADDRESSED]：R5 已经逐条给出归属与块内条数，实现按表落位；验收核对的是每块的条数而不只是总数。
- RISK-GEN-001 [ADDRESSED]：只用 `CLAUDE.md` 的配方生成，golden 与 `content.replace(sharedTrim, '<SHARED_MASKED>')` 比较、packed 与原始 `content` 比较，两条比较分开写进验收项；`npm test` 的 `test/golden.test.js` 是最终背板。
- RISK-DOC-001 [ADDRESSED]：把"R1 让掉的是固定快照而非等价替换"写成一条独立验收项，交付说明必须显式覆盖它以及零让步成立的前提条件。
- RISK-CONV-001 [ADDRESSED]：生成后对 packed 与 golden 扫描 U+2014 与 U+2013，并保留 `npm test` 中 `test/generator.test.js` 的既有门禁作为背板。

## Trace
| This ID | Upstream | Status |
|---|---|---|
| RISK-IMPL-001 | SCOPE-IN-001, SCOPE-IN-002, SCOPE-IN-003 | [ADDRESSED] |
| RISK-IMPL-002 | SCOPE-IN-004, SCOPE-IN-007 | [ADDRESSED] |
| RISK-STATE-001 | SCOPE-IN-002, SCOPE-IN-003 | [ADDRESSED] |
| RISK-STATE-002 | SCOPE-IN-003 | [ADDRESSED] |
| RISK-TEST-001 | SCOPE-IN-006 | [ADDRESSED] |
| RISK-TEST-002 | SCOPE-IN-005 | [ADDRESSED] |
| RISK-GEN-001 | SCOPE-IN-008 | [ADDRESSED] |
| RISK-DOC-001 | SCOPE-IN-009 | [ADDRESSED] |
| RISK-CONV-001 | SCOPE-IN-008, SCOPE-IN-009 | [ADDRESSED] |

## Upstream Summary (read-only)
# Requirement Brief

## Goal

在 `templates/fragments/execute-plan.behavior.md` 内落三组 behavior 内部纪律，闭合 `xsk-execute-plan` 的 purpose（"主会话只保留紧凑结果而不是文件内容"）与 behavior 之间的实打实缺口：

- A：step 5 不再把 "the diff against `base`" 交给复审子代理，改为只交 `base`，由复审自己去 diff；
- B1：step 4 给实施子代理的返回加下界，只认最后一次写入之后每项 task-acceptance 检查的最终结果，并把四个返回分支全部映射到既有的四 token 状态机；
- B2：step 5 给复审加 clean/concern 返回协议，并把 fix 的诊断入口、台账可见性、一次性额度与状态迁移写死。

配套改 `test/skill-behavior.test.js`（两个字节上限、预算注释、内容契约断言），并按 `CLAUDE.md` 的配方重新生成 packed skill 与 golden fixture。

对外可见形状不变：技能数、description、两份 README 与 `AGENTS.md` 都不动。抬高字节上限是一次有意的产品决策，最终交付必须逐条说明这 1,161 字节买到了什么、以及 R1 让掉的是什么。

## In-Scope

- SCOPE-IN-001 R1：`execute-plan.behavior.md` step 5 的复审派发句按需求给定的逐字新旧文本整段替换，改为交 `base` 并让复审自取 tracked diff 与 untracked 正文。
- SCOPE-IN-002 R2：step 4 在锚点句 `Require a compact result and the paths it believes it wrote.` 之后同段追加实施子代理返回下界，四个分支（全部最终检查成功 / 任一最终失败 / `not run` 或漏报 / 返回缺失或畸形）分别落到 `done` 与 `failed`，不引入第五种台账状态。
- SCOPE-IN-003 R3：step 4 的台账写入边界句替换为容纳 step 5 的 bounded fix；step 5 既有的 fix 规则整句替换为 clean/concern 返回协议加 fix envelope、台账 `the run's one fix` 标记、诊断输入、失败路由与重验条件；实现中不得引入 `verdict` 一词。
- SCOPE-IN-004 R4：`test/skill-behavior.test.js` 的 `EXECUTE_PLAN_PACKED_MAX` 改为 13200、`EXECUTE_PLAN_BEHAVIOR_MAX` 改为 10200。
- SCOPE-IN-005 R5：新增 19 条内容契约 `assert.ok` 断言，按需求给定的归属分别落进 `gate, ledger, and dispatch` 块（8 条）与 `acceptance, recovery, and reporting` 块（11 条）；其中 `/the diff against \`base\`/` 必须写成负向断言。
- SCOPE-IN-006 R6：就地更换 `acceptance, recovery, and reporting` 块里 2 条会被新措辞打断的既有断言的 pattern，不删除、不改变该块原有断言条数。
- SCOPE-IN-007 R7：整段重写字节预算注释，保住需求点名的四层意思（50,757 字节的历史、12000 曾是刻意复原而这次是有意离开、这 1,161 字节买到了什么、改上限仍是产品决策）。
- SCOPE-IN-008 R8：按 `CLAUDE.md` 的配方从仓库根重新生成 `skills/execute-plan/SKILL.md` 与 `test/fixtures/golden/xsk-execute-plan.md`，两份产物一律不手改。
- SCOPE-IN-009 全量验证与交付对账：`npm test` 247 条全绿、`npm run syntaxcheck`、隔离 cache 的 `npm pack --dry-run --json`、无 U+2014 与 U+2013、两份 README 标题行逐字节相同的回归确认，以及最终交付里的逐条对账。

## Out-of-Scope

- SCOPE-OUT-001 不改 `lib/` 下任何运行时代码：这是纯指令技能，`lib/` 从不读 `.xsk/` 与技能文档。
- SCOPE-OUT-002 不改 `execute-plan.purpose.md`、`execute-plan.triggers.md`、`execute-plan.output.md`：三组都是 behavior 内部纪律，task-local check 状态属于既有 compact result，由 step 7 既有的逐任务报告承载。
- SCOPE-OUT-003 不改 `lib/skills.js` 的 description、`README.md`、`README.zh-CN.md`、`AGENTS.md`：技能数与对外能力都没变。
- SCOPE-OUT-004 不动 `test/skill-behavior.test.js` 里的退役机制黑名单。
- SCOPE-OUT-005 不引入 per-task commit、BASE、`commit_range`、权威产物矩阵、路径 preflight 五条校验、auto-archive 门禁：xsk 把 `commit` 列为入场硬停且 `lib/` 不读技能文档，这些机制在 xsk 里没有落脚点。
- SCOPE-OUT-006 排除候选 C（缺上下文或规则冲突不算失败）：约 450 到 500 字节且要动刚焊死的状态机；取用条件与前置要求见 raw requirement 的 Scope-out 表，成立时是一份新需求。
- SCOPE-OUT-007 排除候选 D（按角色选模型）：与"省上下文"的立论无关，同一次改动里塞进来会让"抬上限买到了什么"说不清。
- SCOPE-OUT-008 排除候选 E（pre-flight 计划自洽扫描）：控制器自审自己刚写的拆分，信号弱且成本落在最紧的字节预算上。
- SCOPE-OUT-009 排除候选 F（任务简报走台账路径而非粘贴）：二阶收益，却要引入靠子代理自觉遵守的定向读取协议并把恢复日志变成输入产物。
- SCOPE-OUT-010 不 commit、不 push、不开 PR：本需求不授权任何版本库写操作；只有用户另行明确要求 commit 时，才把同一份交付对账写进 commit message。

## Non-Goals

- 不追求把 xsk 的证据模型向 r2p 靠拢。xsk 的替代物是"HEAD 冻结在 `base` 加工作区入场干净"，本次三组改动全部建在这个前提上，不是过渡到 commit 边界的第一步。
- 不追求字节最优。1,161 字节是实测差值，上限按下一个百位取整为 10,200 与 13,200，留 71 与 45 的余量；不为省字节改写需求给定的措辞，也不为迁就实现去抬更高的上限。
- 不追求增加测试用例数。新增的是既有 test 块里的 `assert.ok`，`npm test` 仍是 247 条。
- 不追求扩大对外可见能力。用户看到的技能清单、description、安装行为都与改动前一致。
- 不追求消除 R1 的净让步。R1 换来的是 tracked diff 与 untracked file contents 都不经主会话，代价是复审读的是活工作区而非固定快照，交付说明里必须照实写，不得说成"等价替换"。

## Assumptions

- 需求给出的字节基线在当前 HEAD（`4c1a081`）上成立，已实测确认：behavior 8,968 字节、packed 11,994 字节、masked golden 11,468 字节。实现前若与实测不符，先停下来核对，不得抬高上限迁就。
- 需求给出的 +1,161 字节增量（R1 +115、R2 +411、R3 +26、R3 +609）是实测值，因此改动后的目标值 behavior 10,129、packed 13,155、golden 12,629 是可逐字节核对的硬指标，而不是估算。
- `npm test` 在改动前是 247 条全绿；R6 点名的 2 条既有断言是实现时就地换 pattern，不是预期的失败数。
- 需求已逐字给出 R1、R2、R3 的新旧文本以及 R5 的 19 条 pattern，实现按字复制，不做同义改写；措辞属于需求内容，不属于实现者的裁量空间。
- 三个 xsk-execute-plan 内容契约块当前共 29 条 `assert.ok`（10 + 8 + 11），加 19 条后为 48 条（10 + 16 + 22）。这是可数的，实现时按数核对。
- `.xsk/points/archive/` 与 `.xsk/requirements/archive/` 被 gitignore，被拒绝候选的原始论证不再进版本库，因此 C、D、E、F 的取用条件已复述进 Out-of-Scope，将来任一条件成立时都是新需求。

## Acceptance Criteria

- AC-1 fragment 编辑前：R1 旧句、R2 锚点句 `Require a compact result and the paths it believes it wrote.`、R3 台账旧句、R3 fix 旧句在 `templates/fragments/execute-plan.behavior.md` 中各精确命中一次。
- AC-2 fragment 编辑后：R1 与 R3 的三个旧句各为零次，R2 锚点仍为一次；R1 新句、R2 新返回段、R3 新台账句、R3 新 review/fix 段各精确命中一次；文件实测 10,129 字节。对不上即为改错位置或改动了措辞，停下来查。
- AC-3 新措辞不引入 `verdict` 一词，且不删改 `Between tasks there is no code review and no acceptance run` 这句（R2 是子代理的报告义务，不是控制器在任务之间新开门禁）。
- AC-4 重新生成后：`skills/execute-plan/SKILL.md` 实测 13,155 字节且逐字节等于 `buildSkill()` 的原始 `content`；`test/fixtures/golden/xsk-execute-plan.md` 实测 12,629 字节且逐字节等于 `content.replace(sharedTrim, '<SHARED_MASKED>')`；不得把 masked golden 直接与原始 `content` 比较。
- AC-5 `test/skill-behavior.test.js` 的两个上限为 13200 与 10200，预算注释已整段重写并保住四层意思，三个内容契约块共 48 条 `assert.ok`（10 + 16 + 22），其中 `/the diff against \`base\`/` 为负向断言。
- AC-6 `npm test` 仍是 247 条且全部通过。任何失败先停下来核对需求，不得删除、放宽或补写需求未授权的断言。
- AC-7 `npm run syntaxcheck` 通过；用与 `test/self-conformance.test.js` 相同的临时 `npm_config_cache` 运行 `npm pack --dry-run --json` 通过。
- AC-8 仓库约定回归：生成内容中无 U+2014 与 U+2013；两份 README 的标题行仍逐字节相同（本次不改 README，只做回归确认）。
- AC-9 最终交付逐条说明抬高上限买到了什么，以及 R1 让掉的是"固定快照"而非"等价替换"；工作区不含任何 commit（见 SCOPE-OUT-010）。

## Open Questions

无。用户已于 2026-07-28 定死全部选择：task 状态只认最后一次写入后每项 task-acceptance 检查的最终结果；clean review 固定返回 `no concerns`，空、缺失或畸形 review 使 acceptance `failed` 且不派 fix；fixer 自己重跑失败命令读取诊断，fix 追加为 ledger task 并标记 `the run's one fix`，完整继承 step 4，只有 `done` 后才重验，越出 confirmed envelope 则不派发并把 run 记为 `failed`。三组采纳项的措辞、字节账、断言清单在 raw requirement 中已逐字给出；C、D、E、F 是已决的拒绝项，不是待决问题。

## Sources

- `.xsk/requirements/execute-plan-return-bounds.md`：本需求原文，R1 到 R8 的逐字文本、字节账与 Checkpoints 均出自此处。
- `.xsk/points/execute-plan-r2p-borrowings.md`（status: ready，经两轮外部审查后原地修订）：本需求由该调研点折叠而来，A、B1、B2 采纳、C 到 F 拒绝的论证在此。
- `templates/fragments/execute-plan.behavior.md`（当前 8,968 字节）：唯一被改的 fragment，R1、R2、R3 的锚点行号 `:52`、`:54`、`:60` 与状态机四 token（`:49`）均指向此文件。
- `test/skill-behavior.test.js`（当前 205 条 `assert.ok`）：字节上限 `:379-380`、预算注释 `:368-378`、R6 点名的既有断言 `:459-462` 与 `:463-466`。
- `CLAUDE.md`：generation pipeline 一节给出的 `buildSkill` 重新生成配方，以及 packed skill 与 golden 必须同步的约定。
- 仓库当前 HEAD `4c1a081`：所有实测字节数与断言计数的基线。

## Trace
| This ID | Upstream | Status |
|---|---|---|
| SCOPE-IN-001 | raw_requirement R1 | [ADDRESSED] |
| SCOPE-IN-002 | raw_requirement R2 | [ADDRESSED] |
| SCOPE-IN-003 | raw_requirement R3 | [ADDRESSED] |
| SCOPE-IN-004 | raw_requirement R4 | [ADDRESSED] |
| SCOPE-IN-005 | raw_requirement R5 | [ADDRESSED] |
| SCOPE-IN-006 | raw_requirement R6 | [ADDRESSED] |
| SCOPE-IN-007 | raw_requirement R7 | [ADDRESSED] |
| SCOPE-IN-008 | raw_requirement R8 | [ADDRESSED] |
| SCOPE-IN-009 | raw_requirement Checkpoints 1-6 | [ADDRESSED] |
| SCOPE-OUT-001 | raw_requirement Scope Out | [OUT-OF-SCOPE] |
| SCOPE-OUT-002 | raw_requirement Scope Out | [OUT-OF-SCOPE] |
| SCOPE-OUT-003 | raw_requirement Scope Out | [OUT-OF-SCOPE] |
| SCOPE-OUT-004 | raw_requirement Scope Out | [OUT-OF-SCOPE] |
| SCOPE-OUT-005 | raw_requirement Scope Out | [OUT-OF-SCOPE] |
| SCOPE-OUT-006 | raw_requirement Scope-out 表 C | [OUT-OF-SCOPE] |
| SCOPE-OUT-007 | raw_requirement Scope-out 表 D | [OUT-OF-SCOPE] |
| SCOPE-OUT-008 | raw_requirement Scope-out 表 E | [OUT-OF-SCOPE] |
| SCOPE-OUT-009 | raw_requirement Scope-out 表 F | [OUT-OF-SCOPE] |
| SCOPE-OUT-010 | raw_requirement Checkpoints 6 | [OUT-OF-SCOPE] |
<!-- /r2p-read-only -->

## Project Context (read-only)
# Project Context Pack

- repo_root: `/Users/xubo/x-studio/xsk`
- languages: {'JavaScript': 6826}
- package_managers: npm
- test_commands: ['npm test']
- entrypoints: none
- config_files: none
- dependencies (0): none
- source_dirs: ['bin', 'docs', 'lib', 'requirements', 'scripts', 'shared', 'skills', 'templates', 'test']
<!-- /r2p-read-only -->
