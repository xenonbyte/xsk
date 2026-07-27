# Plan

执行顺序固定为 001 → 002 → 003 → 004，串行，不得并发也不得另择拓扑序（依据 SPEC 的 PLAN Handoff：依赖图允许 001 → 003 → 002，但那条路径上 003 结束时套件不是全绿，验收判据会失效）。

每个任务的验收判据都由两部分组成：该任务自己的计数与字节指标全部命中，**且** `node --test` 的失败集合与 SPEC 实测表对应行逐条相等（不多不少）。只有 004 用"247 条全绿"。任何一项对不上，停下核对上游，不得调参、不得删断言、不得抬上限迁就。

## Tasks

### PLAN-TASK-001 fragment 的四处逐字替换
Spec References: SPEC-FRAGMENT-001, SPEC-FRAGMENT-002, SPEC-STATE-001, SPEC-REVIEW-001, SPEC-REVIEW-002, SPEC-REVIEW-003
Change Type: modify
TDD Applicable: no
Scope closed here: SCOPE-IN-001, SCOPE-IN-002, SCOPE-IN-003
Files:
- templates/fragments/execute-plan.behavior.md
Skeleton:
```js
// Four one-to-one literal replacements. Old and new texts are given verbatim in
// SPEC-FRAGMENT-001's fenced blocks; copy them from there, do not retype.
// Precondition: each of the four anchors occurs exactly once.
// R2 is an APPEND to its anchor, joined by exactly one ASCII space, same paragraph.
const fs = require('fs');
const p = 'templates/fragments/execute-plan.behavior.md';
let s = fs.readFileSync(p, 'utf8');
s = s.replace(R1_OLD, R1_NEW);
s = s.replace(R2_ANCHOR, R2_ANCHOR + ' ' + R2_APPENDED);
s = s.replace(R3A_OLD, R3A_NEW);
s = s.replace(R3B_OLD, R3B_NEW);
fs.writeFileSync(p, s);
```
Steps:
- [ ] 编辑前，对 SPEC-FRAGMENT-001 给出的四个锚点各做一次精确子串计数，确认各为 1。任一不为 1 即停。
- [ ] 应用 R1 替换：复审派发句整段换掉，交给复审的是 `base` 而非 diff 正文。
- [ ] 应用 R2 追加：在锚点句后以恰好一个 ASCII 空格相连，同段不换行（411 字节增量只在恰好一个空格时成立）。
- [ ] 应用 R3a 替换：台账写入边界句换成含 `for step 5's bounded fix` 的版本。
- [ ] 应用 R3b 替换：fix 规则整句换掉（整句替换，不是旁边插入）。
- [ ] 编辑后计数：三个旧句各 0，R2 锚点仍为 1，四段新文本各 1。
- [ ] 编辑后禁用词与保留句计数：`verdict` 为 0；`the run's one fix` 为 1；`Between tasks there is no code review and no acceptance run` 为 1 且逐字未变；`functional acceptance not run` 仍为 1。
- [ ] `wc -c templates/fragments/execute-plan.behavior.md` 为 10129。
Verification: 逐条执行上面 8 步的计数并贴出实际数值；`wc -c templates/fragments/execute-plan.behavior.md` 输出必须是 `10129`。再跑 `node --test`，失败集合必须**恰好**是这四条、不多不少：`golden: masked shell matches the committed golden fixture per skill`、`golden: committed skills/<base>/SKILL.md matches buildSkill output (packed source stays in sync)`、`skill-behavior: xsk-execute-plan: acceptance, recovery, and reporting`、`skill-behavior: xsk-execute-plan: stays inside its byte budget`，计数为 `tests 247 / pass 243 / fail 4`。`gate, ledger, and dispatch` 此时必须仍是绿的；它若也红，说明 R2 追加落错了位置。本任务的验收是计数与字节，不是全绿。

### PLAN-TASK-002 测试契约的四处更新
Spec References: SPEC-TEST-001, SPEC-TEST-002, SPEC-TEST-003, SPEC-TEST-004
Change Type: modify
TDD Applicable: yes
Scope closed here: SCOPE-IN-004, SCOPE-IN-005, SCOPE-IN-006, SCOPE-IN-007
Files:
- test/skill-behavior.test.js
Skeleton:
```js
// 1. Two caps.
const EXECUTE_PLAN_PACKED_MAX = 13200;
const EXECUTE_PLAN_BEHAVIOR_MAX = 10200;

// 2. Budget comment: rewrite the whole block above those two constants so it
//    carries the four meanings listed in SPEC-TEST-004. The sentence
//    "The packed cap is back at its original 12000" must not survive.

// 3. Nineteen new assertions, one property per assertion, one pattern per
//    assertion, block assignment fixed by SPEC-TEST-002 (8 + 11).
//    Eighteen positive, e.g.:
assert.ok(/Require nothing else back: no diff, no file contents, no task restatement/.test(c), '<one property>');
//    Exactly one negative, in the acceptance block:
assert.ok(!/the diff against `base`/.test(c), '<one property>');

// 4. Two existing patterns swapped in place (assertions kept, count unchanged).
assert.ok(/read the untracked paths directly, since a plain diff omits them and a whole new source file would otherwise never reach review/.test(c), 'review material covers the paths a plain diff hides');
assert.ok(/Allow at most one bounded fix[\s\S]*?Only a `done` fix reruns all commands and the reviewer once; never loop/.test(c), 'fixes are bounded and fully revalidated');
```
Steps:
- [ ] 把 `EXECUTE_PLAN_PACKED_MAX` 改为 `13200`、`EXECUTE_PLAN_BEHAVIOR_MAX` 改为 `10200`。
- [ ] 整段重写两个常量上方的预算注释，覆盖 SPEC-TEST-004 编号 1 到 4 的四层意思；确认 `The packed cap is back at its original 12000` 计数归 0。
- [ ] 向 `gate, ledger, and dispatch` 块加入 SPEC-TEST-002 第一组的 8 条断言，pattern 逐字照抄。
- [ ] 向 `acceptance, recovery, and reporting` 块加入第二组的 11 条断言，其中 ``/the diff against `base`/`` 必须写成 `assert.ok(!pattern.test(c), ...)`。
- [ ] 就地更换 SPEC-TEST-003 点名的 2 条既有断言的 pattern，保留断言本身与其性质说明串，不改该块原有条数。
- [ ] 每条新断言自撰一句性质说明串，沿用文件既有英文口吻，一条一句一性质；新增文本中不得出现 U+2014 与 U+2013。
- [ ] 数三个内容契约块的 `assert.ok` 条数，必须是 10 / 16 / 22。
Verification: 三个块的 `assert.ok` 条数为 `10 / 16 / 22`，文件全局为 `224`；两个常量的字面值为 `13200` 与 `10200`；`The packed cap is back at its original 12000` 计数为 `0`；对本任务新增行（`git diff` 的 `+` 行）扫 U+2014 与 U+2013 各为 `0`（不要扫整个文件，该文件既有 7 处 em-dash 在 `:8`、`:57`、`:120`、`:135`、`:155`、`:198`、`:238`，是本次不接触的既有文本）。`npm run syntaxcheck` 通过。再跑 `node --test`：计数为 `tests 247 / pass 245 / fail 2`，失败集合必须**恰好**是两条 `golden:` 用例；`gate, ledger, and dispatch`、`acceptance, recovery, and reporting`、`stays inside its byte budget` 三者此时必须全部转绿，任一仍红说明 pattern 抄错或归属放错了块。

### PLAN-TASK-003 重新生成 packed skill 与 golden fixture
Spec References: SPEC-GEN-001
Change Type: modify
TDD Applicable: no
Scope closed here: SCOPE-IN-008
Files:
- skills/execute-plan/SKILL.md
- test/fixtures/golden/xsk-execute-plan.md
Skeleton:
```js
const fs = require('fs');
const { buildSkill } = require('./lib/generator');
const { get } = require('./lib/skills');
const sharedTrim = fs.readFileSync('shared/skill-common.md', 'utf8').trim();
const s = get('xsk-execute-plan');
const content = buildSkill(s).content;
fs.writeFileSync(`skills/${s.fragmentBase}/SKILL.md`, content);
fs.writeFileSync(`test/fixtures/golden/${s.name}.md`, content.replace(sharedTrim, '<SHARED_MASKED>'));
```
Steps:
- [ ] 从仓库根用上面的配方生成两份产物，不手改任何一份。
- [ ] 比较一：`skills/execute-plan/SKILL.md` 与原始 `content` 逐字节相等。
- [ ] 比较二：`test/fixtures/golden/xsk-execute-plan.md` 与 `content.replace(sharedTrim, '<SHARED_MASKED>')` 逐字节相等。两条比较分开做，不得把 masked golden 与原始 `content` 相比。
- [ ] 对生成的 packed 内容扫 U+2014 与 U+2013，各为 0。
Verification: `wc -c skills/execute-plan/SKILL.md test/fixtures/golden/xsk-execute-plan.md` 输出 `13155` 与 `12629`；两条分离比较各自逐字节相等；packed 内容中 U+2014 与 U+2013 计数各为 `0`。`node --test` 计数为 `tests 247 / pass 247 / fail 0`。这是唯一一个以"全绿"为验收判据的中间任务边界。

### PLAN-TASK-004 全量门禁与交付对账
Spec References: SPEC-VERIFY-001, SPEC-DELIVER-001
Change Type: verify
TDD Applicable: no
Scope closed here: SCOPE-IN-009
Files:
- templates/fragments/execute-plan.behavior.md
- test/skill-behavior.test.js
- skills/execute-plan/SKILL.md
- test/fixtures/golden/xsk-execute-plan.md
Skeleton:
```sh
npm test
npm run syntaxcheck
# package check with an isolated cache, matching test/self-conformance.test.js
npm_config_cache="$(mktemp -d)" npm pack --dry-run --json
# README heading parity regression (this run does not edit either README)
diff <(grep '^#' README.md) <(grep '^#' README.zh-CN.md)
git status --short
git log --oneline -1
```
Steps:
- [ ] `npm test` 全绿，247 条。
- [ ] `npm run syntaxcheck` 通过。
- [ ] 用临时 `npm_config_cache` 跑 `npm pack --dry-run --json` 通过，避免依赖用户级 npm cache。
- [ ] 两份 README 的标题行逐字节相同（本次不改 README，只做回归确认）。
- [ ] 确认 `git log` 的 HEAD 仍是 `4c1a081`，工作区没有任何新 commit。
- [ ] 写交付对账：逐条说明这 1,161 字节买到了什么（SPEC-TEST-004 的第 3 层）。
- [ ] 写交付对账：说明 R1 让掉的是"固定快照"而非"等价替换"，并写明零让步只在 exclusive-worktree 前提实际成立时成立（现有 invariants 检不出 allowed-path 内的并发写）。
- [ ] 写交付对账：按 SPEC-REVIEW-003 用"额度可辨识"口径表述 fix 闭合程度，不复述上游"两条路径都收敛"的措辞。
Verification: `npm test` 输出 `tests 247 / pass 247 / fail 0`；`npm run syntaxcheck` 退出 0；隔离 cache 的 `npm pack --dry-run --json` 退出 0；README 标题行 `diff` 无输出；`git log --oneline -1` 仍为 `4c1a081`，`git status --short` 只列出本次改的 4 个文件加本 run 目录，无新 commit。交付文本人工核对，上面三条对账项各有一段对应内容，缺任一项即不通过。

## Execution Readiness

- Requirement brief reviewed
- Design decisions resolved; DECISION-001 selected as option A by the requirement owner, no decision request pending
- High-risk mitigations represented in tasks
- Non-goals protected
- Verification commands executable; expected changed files listed
- No unresolved ambiguity; out-of-scope work is declared in the brief, not dropped here

## Risk Handling

| Risk | Handling Task | Closure |
|---|---|---|
| RISK-IMPL-001 | PLAN-TASK-001 | [ADDRESSED] |
| RISK-IMPL-002 | PLAN-TASK-004 | [ADDRESSED] |
| RISK-STATE-001 | PLAN-TASK-001 | [ADDRESSED] |
| RISK-STATE-002 | PLAN-TASK-001 | [ADDRESSED] |
| RISK-TEST-001 | PLAN-TASK-002 | [ADDRESSED] |
| RISK-TEST-002 | PLAN-TASK-002 | [ADDRESSED] |
| RISK-GEN-001 | PLAN-TASK-003 | [ADDRESSED] |
| RISK-DOC-001 | PLAN-TASK-004 | [ADDRESSED] |
| RISK-CONV-001 | PLAN-TASK-002 | [ADDRESSED] |

## Trace
| This ID | Upstream | Status |
|---|---|---|
| PLAN-TASK-001 | SCOPE-IN-001, SCOPE-IN-002, SCOPE-IN-003, SPEC-FRAGMENT-001, SPEC-FRAGMENT-002, SPEC-STATE-001, SPEC-REVIEW-001, SPEC-REVIEW-002, SPEC-REVIEW-003 | [ADDRESSED] |
| PLAN-TASK-002 | SCOPE-IN-004, SCOPE-IN-005, SCOPE-IN-006, SCOPE-IN-007, SPEC-TEST-001, SPEC-TEST-002, SPEC-TEST-003, SPEC-TEST-004 | [ADDRESSED] |
| PLAN-TASK-003 | SCOPE-IN-008, SPEC-GEN-001 | [ADDRESSED] |
| PLAN-TASK-004 | SCOPE-IN-009, SPEC-VERIFY-001, SPEC-DELIVER-001 | [ADDRESSED] |

## Upstream Summary (read-only)
# Spec

本 SPEC 的判定对象是**文档内容**，不是运行时行为：`xsk-execute-plan` 是纯指令技能，`lib/` 从不读它。因此每条契约的验证方式都是对文件做精确子串计数、字节计数或断言执行，没有一条需要跑起来观察。

四段被替换文本与一段被追加文本在下面用围栏逐字给出。围栏内的内容就是要写进文件的内容，**不做任何同义改写、不调整标点、不改大小写、不改反引号**。

## Behavior Contracts

### SPEC-FRAGMENT-001 四处替换的前置与后置条件

被改文件唯一：`templates/fragments/execute-plan.behavior.md`。

**前置条件**（编辑前，四个锚点在文件中各精确出现一次）：

R1 锚点（step 5 复审派发句）：

```
the command results, the diff against `base`, and the full observed path list, telling it to read the untracked paths directly, since a plain diff omits them and a whole new source file would otherwise never reach review; deletions are already in that diff.
```

R2 锚点（step 4 段末）：

```
Require a compact result and the paths it believes it wrote.
```

R3a 锚点（step 4 台账写入边界）：

```
Write it here, at step 7's terminal write, and in step 6, nowhere else.
```

R3b 锚点（step 5 fix 规则）：

```
A reviewer objection or a command failure is a functional failure. Allow at most one bounded fix as an ordinary serial task, then rerun the commands and the reviewer once; never loop.
```

**替换动作**：

R1 锚点整段替换为：

```
the command results, `base`, and the full observed path list, telling it to diff against `base` itself and read the untracked paths directly, since a plain diff omits them and a whole new source file would otherwise never reach review; relaying the tracked diff or untracked file contents through this conversation would pull in the material this skill exists to keep out.
```

R2 锚点**保留原样**，在其后同段接上下面这段，**以恰好一个 ASCII 空格相连，不另起段落、不换行**（`411` 这个字节增量只有在恰好一个空格时才成立）：

```
Require nothing else back: no diff, no file contents, no task restatement. For each task-acceptance check, report its final run after the task's last write and exit result, or `not run` and why. In a valid result, an omitted check becomes `not run: not reported`; any failed final check or missing or malformed task result makes the task `failed`. Otherwise write `done` and keep the check evidence for step 7.
```

R3a 锚点整句替换为：

```
Write it here, for step 5's bounded fix, at step 7's terminal write, and in step 6, nowhere else.
```

R3b 锚点整句替换为（必须是整句替换，不是在旁边插入新句）：

```
Require exactly `no concerns` when clean; otherwise one line per concern, each naming what is wrong and identifying one or more affected paths or an acceptance criterion, without quoting file contents. Empty or malformed review makes acceptance `failed`; dispatch no fix. A valid concern or command failure is a functional failure. Allow at most one bounded fix only inside the confirmed envelope; otherwise set the run to `failed` without dispatch. Append it to the ledger as the run's one fix, an ordinary serial task under every step 4 rule. Give it the concern lines and each failing command with its exit result, but no command output; it re-reads code and reruns them for diagnostics. A failed fix goes to step 7. Only a `done` fix reruns all commands and the reviewer once; never loop.
```

**后置条件**：R1 锚点、R3a 锚点、R3b 锚点在文件中各出现 0 次；R2 锚点仍出现 1 次；四段新文本各出现 1 次；文件为 10,129 字节。

**为什么 R3b 必须整句替换而不是旁边插入**：旁边插入会让 fix 派发变成无条件的（与"只有 valid concern 或 command failure 才算 functional failure、且至多一次"冲突）、命令失败但复审无 concern 时 fixer 没有诊断入口、fix 失败后仍无条件重跑 acceptance、fix 不进台账因而恢复时看不见 in-flight 写入。

### SPEC-FRAGMENT-002 不得触碰的既有文本与禁用词

后置条件，全部可用精确子串计数判定：

- `Between tasks there is no code review and no acceptance run` 仍出现 1 次，措辞逐字不变。这句会同时被新文本的两处"看起来像冲突"所诱发改动，两处都不是真冲突：
  - **R2 那一侧**：R2 是子代理对自己已跑检查的报告义务，`:58` 是控制器不在任务之间另开门禁，两者主语不同。
  - **R3b 那一侧（更强的诱因）**：R3b 写的是 `an ordinary serial task under every step 4 rule`，而 `:58` 就是一条 step 4 规则，字面上像是"fix 之后不许跑验收"；但 R3b 紧接着又要求 `Only a \`done\` fix reruns all commands and the reviewer once`。解法是：fix 不是 envelope 的枚举任务，而是 step 5 内唯一一次、位置终结的补救任务，`between tasks` 够不着它；它触发的是被显式限额为一次的**第二遍**验收（第一遍已跑过并失败，这才有 fix），不是 step 5 那一遍的延续。`under every step 4 rule` 指任务纪律（自包含 prompt、allowed paths、invariant 双检、两个分别来源的事实、`done`/`failed` 写法），不把 step 5 的重验吸收进 `:58` 的禁令。
  
  这是解释而非文本自明，字面张力在 fragment 里仍然存在，因此这条契约的判定是机械的：计数为 1 且措辞逐字不变。
- `record the command-backed criteria as \`skipped\`` 与 `functional acceptance not run` 仍各出现 1 次，step 5 里 `skipped` 的既有处置不受本次改动影响。
- 台账状态词汇仍是 `pending|in-flight|done|failed` 四个 token，出现 1 次且集合不变，不新增第五种状态。
- `verdict` 一词在文件中出现 **0** 次。它与 `functional failure` 同义却没有取值定义，引入它等于给状态机开一个没有语义的分叉。
- 另外三份 fragment（`execute-plan.purpose.md`、`execute-plan.triggers.md`、`execute-plan.output.md`）与 `lib/skills.js` 的 description 字节不变。

### SPEC-STATE-001 实施子代理的返回下界与任务状态映射

**返回下界**：只要 compact result 与它自认写过的路径，外加每项 task-acceptance 检查的最终结果；`no diff, no file contents, no task restatement`。两个限定不可删：`For each task-acceptance check` 排除拿 `git status` 退出 0 冒充 task-specific signal，`after the task's last write` 排除最后一次改动之前的陈旧 pass。

**状态映射**：四个分支全部落在既有四 token 上：

| 子代理返回 | 任务状态 |
|---|---|
| 最后一次写入之后，每项 task-acceptance 检查的最终结果全部成功 | `done` |
| 上述任一最终结果失败 | `failed` |
| 报 `not run` 加原因；或返回有效但漏报某项 check（记为 `not run: not reported`） | `done` |
| 整份任务返回缺失或畸形 | `failed` |

三条附加判定：

1. **兜底臂必须被认作兜底臂，而不是完备划分的第五支。** `Otherwise write \`done\`` 是默认分支，两种情形会落进它而没有专门分支：报了 `not run` 却没给原因；子代理报的最终结果实际早于最后一次写入而控制器无法核验。两者都在 step 7 的逐任务报告里可见（`not run` 绝不看起来像 pass），这是本次接受的边界。
2. **`In a valid result` 的既定读法**：只辖前半句（漏报 check 记为 `not run: not reported`），后半句的"返回缺失或畸形"是独立一支。按字面读会自相矛盾（缺失的返回不是 valid result），措辞逐字冻结，此处只固定读法。
3. **与 `:56` 的关系是合取，不是两次写入。** SPEC-STATE-001 给判定规则，`:56` 给时机与另一道闸（子代理返回后重查 run-wide invariants、记录两个分别来源的事实）。两者同时满足才写 `done`；invariant 破了走 `status: interrupted`，`No later step may reach \`done\` past one` 优先。不得把新文本读成"子代理一返回就可以落 `done`"。

### SPEC-REVIEW-001 复审返回协议

只有两种合法形状：

- clean：精确返回 `no concerns`。
- 有问题：每条 concern 一行，每行点名错在哪，并标出一条或多条 affected paths 或一条 acceptance criterion；**不引用文件正文**。

空返回、工具没有返回、或不符合这两种形状的返回，一律使 acceptance `failed` 且**不派 fix**（没有可行动诊断）。

配套事实认定，不得在任何地方写反：**concern 行就是 findings，它们确实经控制器传给 fixer**。因此不许出现"findings 不经主会话"这类表述。命令失败那一路只传 command 与 exit result，fixer 自己重跑命令读输出；失败日志不进发给 fixer 的 prompt。

### SPEC-REVIEW-002 fix 的额度、输入、envelope 与状态传递

- **额度**：每 run 至多一次。fix 作为追加 ledger task 写入，其任务描述必须包含字面串 `the run's one fix`；产物侧判定为"新 fragment 中该串精确出现 1 次"。
- **envelope**：fix 必须完全落在已确认 envelope 内。需要新路径、新产品决策或其他 envelope 扩张时，不派发，并把 run 记为 `failed`。
- **输入**：concern 行，加每条失败命令与它的 exit result；**不传 command output**，fixer 重读代码并自己重跑命令取诊断。
- **状态传递**：fix 自身 `failed` 直接进 step 7；只有 `done` 的 fix 才触发一次完整重验（所有命令加 reviewer，各一次），此后 never loop。
- **台账写入边界**：step 4 的写入边界句加入 `for step 5's bounded fix` 后，step 5 获得的写入许可**仅限**这一次 bounded fix 的 `in-flight|done|failed` 记录，不是放宽任意 step 5 写台账。

### SPEC-REVIEW-003 fix 额度的闭合程度（如实表述，不得写成完全闭合）

`the run's one fix` 买到的是**额度在台账上可辨识**，不是**恢复端被强制去查**。

- 已闭合：标记落在台账任务描述里；step 6 既有流程本来就要读台账并把 goal 与 task list 摆给用户确认，标记在恢复路径上可见；"至多一次"以 run 为单位而非会话为单位；R3a 让 fix 的 `in-flight` 记录有合法落点，"死在 fix 中途"不再被误当成无人派发过。
- 未闭合：`:49` 的任务行 schema 没有"这是本 run 唯一一次 fix"的字段；step 5 与 step 6 都没有一句显式的"派 fix 前先扫台账"。因此收敛依赖读文档的 agent 自行把两条规则连起来。

需求所有者已就此裁决为"接受残余"（DECISION-001 选项 A），因此本次不改冻结措辞。**最终交付必须用"额度可辨识"的口径表述，不得复述上游"两条路径都收敛"的措辞。**

### SPEC-TEST-001 字节上限常量

`test/skill-behavior.test.js` 中：

```js
const EXECUTE_PLAN_PACKED_MAX = 13200;
const EXECUTE_PLAN_BEHAVIOR_MAX = 10200;
```

取值由上游给定，不由实测结果反推。实测若与 10,129 / 13,155 不符，处置是停下核对替换位置与措辞，**不是**调高上限让测试转绿。

### SPEC-TEST-002 19 条新增内容契约断言

写法沿用文件既有约定：一条断言一个性质，一条断言一个 pattern，不用 `&&` 串联。归属由上游钉死，不由实现者临场判断。

进 `gate, ledger, and dispatch` 块（8 条）：

```
/Require nothing else back: no diff, no file contents, no task restatement/
/For each task-acceptance check, report its final run after the task's last write and exit result/
/or `not run` and why/
/an omitted check becomes `not run: not reported`/
/any failed final check[\s\S]*?makes the task `failed`/
/missing or malformed task result makes the task `failed`/
/Otherwise write `done` and keep the check evidence for step 7/
/for step 5's bounded fix/
```

进 `acceptance, recovery, and reporting` 块（11 条）：

```
/diff against `base` itself/
/the diff against `base`/
/Require exactly `no concerns` when clean/
/each naming what is wrong and identifying one or more affected paths or an acceptance criterion, without quoting file contents/
/Empty or malformed review makes acceptance `failed`; dispatch no fix/
/A valid concern or command failure is a functional failure/
/only inside the confirmed envelope; otherwise set the run to `failed` without dispatch/
/Append it to the ledger as the run's one fix/
/an ordinary serial task under every step 4 rule/
/each failing command with its exit result, but no command output; it re-reads code and reruns them for diagnostics/
/A failed fix goes to step 7/
```

**第二块的 `/the diff against \`base\`/` 是负向断言**，必须写成 `assert.ok(!pattern.test(c), ...)`；其余 18 条为正向。它与 `/diff against \`base\` itself/` 合起来才证明"复审自取 diff 且控制器不再转手 diff 正文"。

`/Append it to the ledger as the run's one fix/` 与 `/an ordinary serial task under every step 4 rule/` 必须是两条而不是合成一条长 pattern：前者断言额度可辨识（缺了它 `never loop` 跨不了会话），后者断言 fix 完整继承 step 4 的任务纪律。合成一条会让其中一半被删掉时仍然绿。

每条断言的第三个参数（性质说明串）由实现者自撰：沿用文件既有英文口吻，一条一句，只描述该条断言的那一个性质。它不影响任何计数与任何字节预算。

### SPEC-TEST-003 两条既有断言就地更换 pattern

这两条会被新措辞打断，处置是**就地换 pattern，不是删除**，且不改变所在块的原有断言条数。

- 性质 `review material covers the paths a plain diff hides`（当前 `:459-462`）：R1 在 `telling it to ` 之后插入了 `diff against \`base\` itself and `，原 pattern 不再连续。新 pattern 去掉开头的 `telling it to `：

```
/read the untracked paths directly, since a plain diff omits them and a whole new source file would otherwise never reach review/
```

- 性质 `fixes are bounded and fully revalidated`（当前 `:463-466`）：R3b 换掉了整句。新 pattern 用单个非贪婪匹配跨过中间的状态规则：

```
/Allow at most one bounded fix[\s\S]*?Only a `done` fix reruns all commands and the reviewer once; never loop/
```

两条断言的性质与 SPEC-TEST-002 新增的任何一条都不重复：`/diff against \`base\` itself/` 断言的是"复审自己去取"而非"untracked 路径进入复审"；新增的五条 fix 断言分别是 envelope、输入、额度可辨识、台账继承与失败路由，都不是"至多一次且 done 后完整重验"。

### SPEC-TEST-004 预算注释整段重写

当前 `:368-378` 的两段注释必须整段重写（不是补一句），重写后必须覆盖四层意思：

1. 这个技能曾达到 50,757 字节的 forensic protocol，而它的职责就是加载便宜；
2. 12000 曾是一次刻意的复原，这次是有意离开它；
3. 这 1,161 字节买到的是"tracked diff 与 untracked file contents 不经主会话；实施返回只认最后一次写入后的 task-acceptance 最终检查；reviewer 有 clean/concern 完整协议；fix 能自取命令诊断，并连同它的一次性额度一起进入可恢复状态机"；
4. 改上限仍然是产品决策，属于要在最终交付里说清买到或让掉了什么的那一类，不是顺手改的便利值。

**后置条件**（可机械判定）：`The packed cap is back at its original 12000` 这句在文件中出现 0 次（保留它会与 13200 直接矛盾）。

**这是本 SPEC 两条需要人工判断的判据之一**（另一条是 SPEC-DELIVER-001 的"四项齐备"）：注释正文由实现者自撰，"四层齐备"只能人工核对，没有机械检查。为把主观性压到最小，核对时逐项对照上面编号 1 到 4 的四句，缺任何一项即为不通过；只要四项各有一句对应的话就算通过，不对文风、长度或措辞另设要求。它与 19 条断言说明串一样，都落在 `test/skill-behavior.test.js` 内，而该文件不在任何字节预算内，因此注释与说明串都不进 1,161 字节的账。

### SPEC-GEN-001 生成产物的唯一生成路径与两条分离比较

从仓库根按 `CLAUDE.md` 的配方执行：

```js
const fs = require('fs');
const { buildSkill } = require('./lib/generator');
const { get } = require('./lib/skills');
const sharedTrim = fs.readFileSync('shared/skill-common.md', 'utf8').trim();
const s = get('xsk-execute-plan');
const content = buildSkill(s).content;
fs.writeFileSync(`skills/${s.fragmentBase}/SKILL.md`, content);
fs.writeFileSync(`test/fixtures/golden/${s.name}.md`, content.replace(sharedTrim, '<SHARED_MASKED>'));
```

这段是可直接执行的（从仓库根 `node -e`），不是示意：`buildSkill` 吃的是 `get()` 返回的技能对象而不是名字字符串，两个输出路径分别由 `s.fragmentBase` 与 `s.name` 派生，因此实测落到 `skills/execute-plan/SKILL.md` 与 `test/fixtures/golden/xsk-execute-plan.md`。

**核对必须是两条分离的比较**：packed 与原始 `content` 逐字节相等，期望 13,155 字节；golden 与 `content.replace(sharedTrim, '<SHARED_MASKED>')` 逐字节相等，期望 12,629 字节。把 masked golden 直接与原始 `content` 比较会得出"生成错了"的假结论，因为 golden 里的 shared body 已被 `<SHARED_MASKED>` 替换。

两份产物一律不手改。

### SPEC-VERIFY-001 分层停机条件

每一层有独立的停机条件；任一层不符即停下核对上游，不得调参迁就：

| 层 | 检查 | 期望 |
|---|---|---|
| 编辑前 | 四个锚点精确子串计数 | 各 1 |
| 编辑后 | 三个旧句计数 | 各 0 |
| 编辑后 | R2 锚点计数 | 1 |
| 编辑后 | 四段新文本计数 | 各 1 |
| 编辑后 | `verdict` 计数 | 0 |
| 编辑后 | `the run's one fix` 计数 | 1 |
| 编辑后 | fragment 字节 | 10,129 |
| 生成后 | packed 字节，且逐字节等于原始 `content` | 13,155 |
| 生成后 | golden 字节，且逐字节等于 masked `content` | 12,629 |
| 测试层 | `npm test` | 247 条全绿 |
| 测试层 | 三个内容契约块的 `assert.ok` 条数 | 10 / 16 / 22 |
| 门禁层 | `npm run syntaxcheck` | 通过 |
| 门禁层 | 隔离 `npm_config_cache` 下 `npm pack --dry-run --json` | 通过 |
| 约定层 | 本次新增行中的 U+2014 与 U+2013 | 各 0 |
| 约定层 | 两份 README 标题行 | 逐字节相同 |

**约定层的检查范围必须限定在本次改动引入的行**（新 fragment 文本、新注释、19 条新说明串、2 条换掉的 pattern），扫 `git diff` 的新增行，不扫整文件。`test/skill-behavior.test.js` 现有 7 处 em-dash（`:8`、`:57`、`:120`、`:135`、`:155`、`:198`、`:238`，en-dash 为 0），是本次既不产生也不接触的既有文本，整文件 grep 必然回 7；按整文件判定会得到一个假失败。本技能的生成内容没有 dash 测试门禁（仓库四条 dash 断言全部只测 `xsk-write-req`），这次显式扫描是唯一一道。

`grep -c` 在零命中时退出码为 1，会打断 `set -e` 的脚本；零命中类检查须用 `|| true` 或 `grep -o | wc -l` 之类的写法。

### SPEC-DELIVER-001 最终交付必须覆盖的对账

- 逐条说明这 1,161 字节买到了什么（即 SPEC-TEST-004 的第 3 层）。
- 说明 R1 让掉的是"固定快照"而非"等价替换"：r2p 的 `git diff -U10 <base> HEAD` 是 commit 到 commit、落成文件后就定死；这里的 `git diff <base>` 是 base 对活工作区，读的那一刻才求值。相对"控制器自己跑 diff 再贴过去"让步为零，但这只在 exclusive-worktree 前提实际成立时成立（最终验证结束到 reviewer 自取 diff 之间不能有人改 allowed paths，而现有 invariants 检不出 allowed-path 内的并发写）；相对 r2p 的固定快照才是净让步，换回来的是 tracked diff 与 untracked file contents 都不经主会话。
- 按 SPEC-REVIEW-003 用"额度可辨识"口径表述 fix 闭合程度。
- 确认工作区不含任何 commit。

## API / Data / Config Contracts

无 API、无数据模型、无配置项变更。逐条说明为什么：

- **无运行时代码变更**：`lib/` 全部不动。`xsk-execute-plan` 是纯指令技能，`lib/` 从不读 `.xsk/` 与技能文档，本次三组改动全在 prose 层。
- **无 CLI 接口变更**：`bin/xsk.js` 的 `main(argv, options)` 与其分派的 `install`/`uninstall`/`status`/`doctor` 全部不动。
- **无 manifest 或安装形状变更**：技能集合不变，因此 `installed_paths`、`backups`、`installed_hashes` 的内容形状不变，四个平台的 `skillsRoot` 与 opencode 的 `commandsRoot` 行为不变。
- **无对外文档变更**：`lib/skills.js` 的 description、两份 README、`AGENTS.md` 全部不动，技能数与对外能力都没变。
- **技能内部的"数据契约"只有一处且不变**：`.xsk/runs/<slug>.md` 台账的 frontmatter 与任务行格式不变，任务状态词汇仍是 `pending|in-flight|done|failed` 四个 token。本次新增的 `the run's one fix` 落在任务描述文本内，不新增字段、不改行格式。

## External Documentation Checked

N/A — no external dependencies

`xsk` 是零第三方运行时依赖的 CommonJS 包（`package.json` 无 `dependencies`，`CLAUDE.md` 明令不得新增）。本次改动只触及 Markdown fragment、生成产物与基于 `node:test` 与 `node:assert` 的测试文件，不引入、不升级、不查询任何外部库、框架、SDK、CLI 或云服务。因此没有需要核对的外部文档。

## Test Matrix

| 契约 | 验证手段 | 通过判据 |
|---|---|---|
| SPEC-FRAGMENT-001 [ADDRESSED] | 编辑前后各一次精确子串计数 + `wc -c`；加 `acceptance, recovery, and reporting` 块新增的第 1、2 条：``/diff against `base` itself/``（正向）与 ``/the diff against `base`/``（负向），两条合起来证明 R1 既让复审自取又不再由控制器转手 | 前置各 1；后置旧句各 0、R2 锚点 1、新文本各 1；10,129 字节；两条 R1 断言通过 |
| SPEC-FRAGMENT-002 [ADDRESSED] | 子串计数 | `Between tasks...` 为 1；`skipped` 两处仍在；`verdict` 为 0；另三份 fragment 字节不变 |
| SPEC-STATE-001 [ADDRESSED] | `gate, ledger, and dispatch` 块新增 8 条中的前 7 条：`Require nothing else back`、`For each task-acceptance check...exit result`、`` or `not run` and why ``、``an omitted check becomes `not run: not reported` ``、``any failed final check...makes the task `failed` ``、``missing or malformed task result makes the task `failed` ``、``Otherwise write `done` and keep the check evidence for step 7`` | 7 条全部通过 |
| SPEC-REVIEW-001 [ADDRESSED] | SPEC-TEST-002 的 `no concerns`、concern 行、空或畸形三条断言 | 全部通过 |
| SPEC-REVIEW-002 [ADDRESSED] | `gate, ledger, and dispatch` 块新增的第 8 条 ``for step 5's bounded fix``（台账写入边界），加 `acceptance, recovery, and reporting` 块的 ``/A valid concern or command failure is a functional failure/``（fix 的触发条件）、envelope、台账标记、step 4 继承、诊断输入、failed 路由六条，加 SPEC-TEST-003 的 bounded-fix 重验断言 | 8 条全部通过 |
| SPEC-REVIEW-003 [ADDRESSED] | `the run's one fix` 子串计数；交付文本人工核对 | 计数为 1；交付未复述"两条路径都收敛" |
| SPEC-TEST-001 [ADDRESSED] | `skill-behavior: xsk-execute-plan: stays inside its byte budget` | 通过，且两个常量字面为 13200 与 10200 |
| SPEC-TEST-002 [ADDRESSED] | `npm test` + 块内 `assert.ok` 计数 | 全绿；计数 10 / 16 / 22 |
| SPEC-TEST-003 [ADDRESSED] | `npm test` | `acceptance, recovery, and reporting` 块通过，且该块断言条数为 22 |
| SPEC-TEST-004 [ADDRESSED] | 子串计数 + 人工核对四层意思 | `The packed cap is back at its original 12000` 为 0；四层齐备 |
| SPEC-GEN-001 [ADDRESSED] | 两条分离的逐字节比较 + `test/golden.test.js` | 两条比较均相等；13,155 与 12,629；golden 测试通过 |
| SPEC-VERIFY-001 [ADDRESSED] | 表内 15 行逐行执行 | 全部命中期望值 |
| SPEC-DELIVER-001 [ADDRESSED] | 交付文本人工核对；`git log` 与 `git status` | 四项齐备；无新 commit |

补充：`test/golden.test.js`、`test/generator.test.js`、`test/self-conformance.test.js` 与退役机制黑名单都是既有背板，本次不改它们，但它们必须保持绿。dash 没有背板，见 SPEC-VERIFY-001。

## Non-goals

- 不追求把 xsk 的证据模型向 r2p 靠拢：per-task commit、`commit_range`、权威产物矩阵、路径 preflight、auto-archive 门禁在 xsk 里没有落脚点（`commit` 是入场硬停，`lib/` 不读技能文档）。
- 不追求字节最优：1,161 是实测差值，上限按下一个百位取整留 45 与 71 的余量，够一次错字修正，不够一条新机制。
- 不追求增加测试用例数：新增的是既有 test 块里的 `assert.ok`，用例数仍为 247。
- 不追求扩大对外可见能力：技能清单、description、安装行为与改动前一致。
- 不追求把 fix 额度做到完全闭合：见 SPEC-REVIEW-003，需求所有者已裁决接受残余。
- 不追求清理既有的 7 处 em-dash：它们是本次既不产生也不接触的既有文本。

## PLAN Handoff

任务切分的自然边界是"每一层有独立停机条件"这条设计原则，因此建议按层切，而不是按 R1 到 R8 切：

1. **fragment 编辑**：SPEC-FRAGMENT-001 与 SPEC-FRAGMENT-002。单文件、四处替换。验收是前后精确计数加 10,129 字节，**不是** `npm test`。
2. **测试契约更新**：SPEC-TEST-001 到 SPEC-TEST-004。单文件、四组改动。验收是块内条数 10 / 16 / 22、两个常量字面值、旧注释句计数 0，**不是** `npm test`。
3. **再生成**：SPEC-GEN-001。验收是两条分离比较与 13,155 / 12,629。做完这一步 `npm test` 应当全绿。
4. **全量验证与交付对账**：SPEC-VERIFY-001 与 SPEC-DELIVER-001。

依赖是严格串行的：2 依赖 1（断言匹配的是 1 写出的文本），3 依赖 1（生成产物是 fragment 的函数），4 依赖 2 与 3。

**执行顺序必须是 1 → 2 → 3 → 4，不得按依赖图另择合法拓扑序。** 依赖图本身允许 1 → 3 → 2，但那条路径上任务 3 结束时套件是 245 / 2（红的是 `acceptance, recovery, and reporting` 与 `stays inside its byte budget`：R6 的两条断言还没换 pattern，两个上限也还没抬），任务 3 的"做完这一步应当全绿"在该顺序下是假的。把顺序钉死，下表的每一行才唯一对应一个任务边界。

**中间态的套件结果是实测的，PLAN 不得把 `npm test` 全绿当作任务 1 到 3 的验收判据。** 下表在本仓库 HEAD `4c1a081` 的沙箱克隆上逐个状态跑 `node --test` 实测得到，任务 1 与 2 的顺序不影响终态：

| 状态 | tests | pass | fail | 红的用例（精确名） |
|---|---|---|---|---|
| 基线（未改动） | 247 | 247 | 0 | 无 |
| 仅任务 1（改 fragment） | 247 | 243 | 4 | `golden: masked shell matches the committed golden fixture per skill`；`golden: committed skills/<base>/SKILL.md matches buildSkill output (packed source stays in sync)`；`skill-behavior: xsk-execute-plan: acceptance, recovery, and reporting`；`skill-behavior: xsk-execute-plan: stays inside its byte budget` |
| 仅任务 2（改测试文件） | 247 | 245 | 2 | `skill-behavior: xsk-execute-plan: gate, ledger, and dispatch`；`skill-behavior: xsk-execute-plan: acceptance, recovery, and reporting` |
| 任务 1 + 2，未再生成（**规定顺序下任务 2 的终态**） | 247 | 245 | 2 | 上表两条 `golden:` 用例 |
| 任务 1 + 3，未改测试文件（**被规定顺序排除**） | 247 | 245 | 2 | `skill-behavior: xsk-execute-plan: acceptance, recovery, and reporting`；`skill-behavior: xsk-execute-plan: stays inside its byte budget` |
| 任务 1 + 2 + 3 | 247 | 247 | 0 | 无 |

**在规定顺序 1 → 2 → 3 → 4 下，三个中间任务边界对应的行分别是第 2 行、第 4 行、第 6 行**（第 3 行"仅任务 2"与第 5 行"任务 1 + 3"都不是本顺序下可达的边界，列出它们只是为了说明机制并排除误取的拓扑序）。PLAN 必须照抄下面三条而不是自行推断：

- **任务 1 边界（表第 2 行，243 / 4）**：`stays inside its byte budget` 会红，因为 fragment 已是 10,129 而上限仍是 9,000；两条 `golden:` 会红，因为产物尚未再生成；`acceptance, recovery, and reporting` 会红，因为 R6 的两条既有断言的 pattern 还没换。`gate, ledger, and dispatch` 此时仍是绿的。
- **任务 2 边界（表第 4 行，245 / 2）**：红的恰好是两条 `golden:` 用例，因为产物仍未再生成。此时字节上限已抬到 13200 / 10200，所以 `stays inside its byte budget` 转绿；两个内容契约块也已转绿，因为断言要匹配的文本在任务 1 就写进 fragment 了。
- **任务 3 边界（表第 6 行，247 / 0）**：全绿。这是唯一一个"全绿"作为验收判据的中间边界。

对照用的机制说明（不是任务边界）：`test/skill-behavior.test.js` 的 `body()` 走的是 `buildSkill(skill).content`，运行时现生成，所以内容契约断言在 fragment 一改动的瞬间就翻面；只有两条比对已落盘产物的 `golden:` 用例才关心是否再生成过。

因此每个任务的验收判据写成：该任务自己的计数与字节指标全部命中，**且** `node --test` 的失败集合与上表对应行逐条相等（不多不少）。只有任务 4 用"247 条全绿"。

PLAN 另需注意：SPEC-VERIFY-001 的约定层检查必须限定在 `git diff` 新增行，写成整文件扫描会产生假失败（`test/skill-behavior.test.js` 本来就有 7 处 em-dash）。

## Trace
| This ID | Upstream | Status |
|---|---|---|
| SPEC-FRAGMENT-001 | SCOPE-IN-001, SCOPE-IN-002, SCOPE-IN-003, DES-EDIT-001 [ADDRESSED] | [ADDRESSED] |
| SPEC-FRAGMENT-002 | SCOPE-IN-002, SCOPE-IN-003, DES-EDIT-001 [ADDRESSED], DES-STATE-001 [ADDRESSED] | [ADDRESSED] |
| SPEC-STATE-001 | SCOPE-IN-002, DES-STATE-001 [ADDRESSED] | [ADDRESSED] |
| SPEC-REVIEW-001 | SCOPE-IN-003, DES-EDIT-001 [ADDRESSED] | [ADDRESSED] |
| SPEC-REVIEW-002 | SCOPE-IN-003, DES-STATE-001 [ADDRESSED] | [ADDRESSED] |
| SPEC-REVIEW-003 | SCOPE-IN-003, DES-STATE-002 [ADDRESSED] | [ADDRESSED] |
| SPEC-TEST-001 | SCOPE-IN-004, DES-TEST-001 [ADDRESSED] | [ADDRESSED] |
| SPEC-TEST-002 | SCOPE-IN-005, DES-TEST-001 [ADDRESSED] | [ADDRESSED] |
| SPEC-TEST-003 | SCOPE-IN-006, DES-TEST-001 [ADDRESSED] | [ADDRESSED] |
| SPEC-TEST-004 | SCOPE-IN-007, DES-TEST-001 [ADDRESSED] | [ADDRESSED] |
| SPEC-GEN-001 | SCOPE-IN-008, DES-GEN-001 [ADDRESSED] | [ADDRESSED] |
| SPEC-VERIFY-001 | SCOPE-IN-009, DES-VERIFY-001 [ADDRESSED] | [ADDRESSED] |
| SPEC-DELIVER-001 | SCOPE-IN-009, DES-VERIFY-001 [ADDRESSED] | [ADDRESSED] |
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
