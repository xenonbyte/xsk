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

## Upstream Summary (read-only)
# Design

## Design Summary

本次没有架构可设计：`xsk-execute-plan` 是纯指令技能，改动全部落在 prose 与它的内容契约测试上。因此本设计的全部工作是把"改什么"钉死成"逐字替换哪四段、哪些断言落哪个块、哪些数是硬指标"，让实现者没有裁量空间。

四层结构：

1. **fragment 层**：在 `templates/fragments/execute-plan.behavior.md` 内做四处逐字替换（R1 复审派发句、R2 锚点后追加、R3a 台账写入边界句、R3b fix 规则整句）。
2. **测试契约层**：`test/skill-behavior.test.js` 抬两个上限、整段重写预算注释、按需求给定的归属加 19 条断言、就地更换 2 条既有断言的 pattern。
3. **生成层**：按 `CLAUDE.md` 的配方用 `buildSkill()` 重新生成 packed skill 与 masked golden，两份产物一律不手改。
4. **验证与对账层**：字节、grep 计数、断言计数、`npm test`、`npm run syntaxcheck`、隔离 cache 的 `npm pack --dry-run --json`、仓库约定回归，以及最终交付的逐条对账。

设计阶段已把需求给出的全部数字在当前 HEAD（`4c1a081`）上做了一次只读的内存演算并逐项命中，因此下游可以把它们当硬指标而不是估算（见 Current Code Evidence 的实测结果）。

一处残余风险被显式保留而非声称关闭：fix 的一次性额度靠台账标记 `the run's one fix` 变得**可辨识**，但冻结措辞里没有一句强制恢复端去查它，因此需求 R3 描述的"第二次 fix"路径在原则上仍可达。这与上游 R3 的收尾断言存在落差，已作为 DECISION-001 路由给需求所有者并裁决为"接受残余"；完整表述见 DES-STATE-002。本设计不为消除它去改冻结措辞，因为增写一句会打破 1,161 字节的账与 AC-2 的 10,129 硬指标。

## Current Code Evidence

四个替换锚点，均取自 `templates/fragments/execute-plan.behavior.md` 当前内容（8,968 字节）：

- `:49` 台账任务行定义了状态词汇，只有四个 token：`1. [pending|in-flight|done|failed] <full task description ...>`。R2 的四个返回分支与 R3b 的 fix 状态必须全部落进这四个里。
- `:52` 台账写入边界句（R3a 锚点，全文命中一次）：`Write it here, at step 7's terminal write, and in step 6, nowhere else.`
- `:54` 段末（R2 锚点，全文命中一次）：`Require a compact result and the paths it believes it wrote.` 该段已经承载"自包含 prompt 带上 hard rules、任务与验收项、allowed paths、依赖结果、step 1 prohibitions"，R2 追加的是同一段的返回侧下界。
- `:58` 段末：`Between tasks there is no code review and no acceptance run.` 这句与 R2 并存：R2 约束子代理报告自己已跑过的检查，`:58` 约束控制器不在任务之间另开门禁，两者不是同一个主语。
- `:60` step 5 内含两个锚点：复审派发句 `... the command results, the diff against \`base\`, and the full observed path list, telling it to read the untracked paths directly, ... deletions are already in that diff.`（R1），以及 `A reviewer objection or a command failure is a functional failure. Allow at most one bounded fix as an ordinary serial task, then rerun the commands and the reviewer once; never loop.`（R3b）。
- `:60` 同段已有 `skipped` 的处置（`record the command-backed criteria as \`skipped\` and state "functional acceptance not run" prominently`），R3b 的替换不触碰它。

purpose 侧的缺口证据：`skills/execute-plan/SKILL.md` 承诺主会话只保留紧凑结果，而 `:60` 现文把 diff 正文交给控制器转手，这正是 R1 要消掉的不一致。

`test/skill-behavior.test.js` 现状：

- `:368-378` 是预算注释的后两段：`:368-371` 讲"字节预算是产品决策，这个技能曾达到 50757 字节"，`:372` 是一行裸 `//`，`:373-378` 明写 `The packed cap is back at its original 12000` 并逐项核了 9000 里那 500 字节的来历。（上游 R7 把它称作"四段叙事"，实测是两段约六句；R7 的指令"整段重写并保住四层意思"不受影响。）改数字会让 `:373-378` 变成假话，所以 R7 是整段重写而非补一句。
- `:379-380`：`const EXECUTE_PLAN_PACKED_MAX = 12000;` 与 `const EXECUTE_PLAN_BEHAVIOR_MAX = 9000;`
- 三个 xsk-execute-plan 内容契约块：`invocation and admission` 10 条、`gate, ledger, and dispatch` 8 条、`acceptance, recovery, and reporting` 11 条，共 29 条 `assert.ok`（文件全局 205 条）。
- `:459-462` 断言 `review material covers the paths a plain diff hides`，pattern 以 `telling it to read the untracked paths directly` 开头；R1 在 `telling it to ` 之后插入 `diff against \`base\` itself and `，原 pattern 不再连续，必然从绿转红。
- `:463-466` 断言 `fixes are bounded and fully revalidated`，pattern 为 `Allow at most one bounded fix as an ordinary serial task, then rerun the commands and the reviewer once; never loop`；R3b 把这句整体换掉，原 pattern 不再存在。
- 块顶注释明写 `One assertion per property, one pattern per assertion`，并说明链式 `&&` 与拆分 pattern 两种写法都试过且都是错的。这是 R5 与 R6 写法的既有约定来源。
- `:498` 起的 `stays inside its byte budget` 用 `Buffer.byteLength(..., 'utf8')` 量 packed、用 `readFileSync(...).length` 量 behavior，两者都是字节，与需求的字节账同单位。
- `test/skill-behavior.test.js` 自身 33,716 字节，且不在任何字节预算内：两个上限只约束 behavior fragment 与 packed skill。R7 的注释重写与 R5 的 19 条断言都不进 1,161 字节的账。

`CLAUDE.md` 的 generation pipeline 一节给出唯一合法的再生成路径：`buildSkill(get('xsk-execute-plan')).content` 写 `skills/execute-plan/SKILL.md`，`content.replace(sharedTrim, '<SHARED_MASKED>')` 写 `test/fixtures/golden/xsk-execute-plan.md`，其中 `sharedTrim` 是 `shared/skill-common.md` 的 `trim()` 结果。

**设计阶段实测（只读演算，工作区已还原，`git status --short` 除本 run 目录外为空）**：在 HEAD `4c1a081` 上把四处替换应用到内存副本后，逐项命中需求给出的每一个数：

| 项 | 需求给出 | 实测 |
|---|---|---|
| R1 增量 | 115 | 115 |
| R2 增量 | 411 | 411 |
| R3a 增量 | 26 | 26 |
| R3b 增量 | 609 | 609 |
| 合计 | 1,161 | 1,161 |
| behavior | 10,129 | 10,129 |
| packed | 13,155 | 13,155 |
| masked golden | 12,629 | 12,629 |

同一演算确认：编辑前四个锚点各命中一次；编辑后三个旧句归零、R2 锚点仍为一次、四段新文本各命中一次；生成内容中无 U+2014 与 U+2013。

## Requirements Coverage

| 来源 | 覆盖它的设计项 | 状态 |
|---|---|---|
| SCOPE-IN-001（R1 复审自取 diff） | DES-EDIT-001 | [ADDRESSED] |
| SCOPE-IN-002（R2 实施返回下界） | DES-EDIT-001, DES-STATE-001 | [ADDRESSED] |
| SCOPE-IN-003（R3 台账边界与 review/fix 协议） | DES-EDIT-001, DES-STATE-001, DES-STATE-002 | [ADDRESSED] |
| SCOPE-IN-004（R4 字节上限） | DES-TEST-001 | [ADDRESSED] |
| SCOPE-IN-005（R5 19 条断言） | DES-TEST-001 | [ADDRESSED] |
| SCOPE-IN-006（R6 就地换 2 条 pattern） | DES-TEST-001 | [ADDRESSED] |
| SCOPE-IN-007（R7 预算注释重写） | DES-TEST-001 | [ADDRESSED] |
| SCOPE-IN-008（R8 再生成） | DES-GEN-001 | [ADDRESSED] |
| SCOPE-IN-009（全量验证与对账） | DES-VERIFY-001 | [ADDRESSED] |
| RISK-IMPL-001 [ADDRESSED] | DES-EDIT-001 的前后计数与字节交叉校验 | [ADDRESSED] |
| RISK-IMPL-002 [ADDRESSED] | DES-VERIFY-001 把 10,129/13,155/12,629 定为停机指标 | [ADDRESSED] |
| RISK-STATE-001 [ADDRESSED] | DES-STATE-001 的四 token 映射与 `verdict` 零命中检查 | [ADDRESSED] |
| RISK-STATE-002 [ADDRESSED] | **部分闭合**：可辨识性由 DES-STATE-002 的台账标记与产物侧检查落地，两条独立断言由 DES-TEST-001 落地；强制查询未落地，残余路径见 DES-STATE-002，已路由为 DECISION-001 并由需求所有者裁决为 A（接受残余）。此行的 `[ADDRESSED]` 只覆盖可辨识性那一半 | [ADDRESSED] |
| RISK-TEST-001 [ADDRESSED] | DES-TEST-001 的块内条数 10 + 16 + 22 | [ADDRESSED] |
| RISK-TEST-002 [ADDRESSED] | DES-TEST-001 的逐条归属表 | [ADDRESSED] |
| RISK-GEN-001 [ADDRESSED] | DES-GEN-001 的两条分离比较 | [ADDRESSED] |
| RISK-DOC-001 [ADDRESSED] | DES-VERIFY-001 的交付对账项 | [ADDRESSED] |
| RISK-CONV-001 [ADDRESSED] | DES-VERIFY-001 的字符扫描 | [ADDRESSED] |

## Options Considered

**编辑方式**：(A) 按需求给出的逐字新旧文本做字面替换；(B) 理解语义后自行组织措辞。选 A。需求已把措辞、字节账、断言 pattern 三者绑死，B 会让三者同时失效，且断言 pattern 是字面匹配，措辞一动就红，红了之后最省事的修法是改断言，那就把契约改没了。

**上限取值**：(A) 13200 / 10200（下一个百位）；(B) 14000 / 11000（下一个千位）；(C) 精确的 13155 / 10129。选 A，需求已给定。B 留出 845 与 871 的空白额度，等于默许下一次增补不再需要论证；C 让任何一个字符的合法改动都要改上限，把上限从产品决策降格成随动值。A 留 45 与 71，够一次错字修正，不够一条新机制。

**断言归属**：(A) 按需求给定的表落位；(B) 实现者按语义就近判断。选 A。B 在语义上也说得通（`for step 5's bounded fix` 讲的是 step 5），但需求已经把它钉在 `gate, ledger, and dispatch` 块，理由是它改的是 step 4 的台账写入边界句。归属一旦临场决定，块内条数 10 + 16 + 22 就失去校验力。

**R6 的两条既有断言**：(A) 就地更换 pattern，保留断言；(B) 删除，理由是 R5 新增的断言已覆盖。选 A。B 是错的：R5 的 `/diff against \`base\` itself/` 断言"复审自己去取"，而 `:459-462` 断言的是"untracked 路径进入复审"；R5 分别断言 fix 的 envelope、输入、额度可辨识、台账继承与失败路由，而 `:463-466` 保留的是"至多一次且 done 后完整重验"。两条性质都没有替身。

**生成方式**：(A) `buildSkill()` 写入；(B) 手改 packed 与 golden 使其与预期一致。选 A，`CLAUDE.md` 明令禁止 B，且 B 会让产物与生成器脱钩，`test/golden.test.js` 的绿变成假绿。

**验证顺序**：(A) 先 fragment 前后计数，再生成，再测试；(B) 先全改完再一次跑 `npm test`。选 A。B 的失败信号只在测试层，分不清是替换落错位置、上限写错、还是断言归属错；A 让每一层各自有独立的停机条件。

## Chosen Design

### DES-EDIT-001 fragment 的四处逐字替换

对 `templates/fragments/execute-plan.behavior.md` 做四次一对一字面替换，顺序不敏感但每次必须先确认锚点唯一：

1. R1：`:60` 复审派发句整段替换。替换后 step 5 交给复审的是 `base` 而不是 diff 正文，并显式写明"把 tracked diff 或 untracked 正文经由本对话转手，正是这个技能要挡掉的东西"。
2. R2：在 `:54` 的锚点句 `Require a compact result and the paths it believes it wrote.` 之后同段接上返回下界段（以一个空格相连，不另起段落）。
3. R3a：`:52` 台账写入边界句整句替换为含 `for step 5's bounded fix` 的版本。
4. R3b：`:60` 的 fix 规则整句替换为 clean/concern 协议加 fix envelope、台账标记、诊断输入、失败路由与重验条件。

四段新文本逐字取自 requirement brief 的上游原文，实现时不做任何同义改写、不调整标点、不改大小写。R3b 必须是整句替换而不是旁边插入：旁边插入会让 fix 派发变成无条件的、命令失败但无 concern 时 fixer 没有诊断入口、fix 失败后仍无条件重跑 acceptance、fix 不进台账。

不触碰 `:58` 的 `Between tasks there is no code review and no acceptance run`，也不触碰 `:60` 里 `skipped` 的既有处置。

### DES-STATE-001 状态词汇与额度的落地约束

R2 的四个返回分支到台账状态的映射（不新增第五种状态）：

| 子代理返回 | 任务状态 |
|---|---|
| 最后一次写入后，每项 task-acceptance 检查的最终结果全部成功 | `done` |
| 上述任一最终结果失败 | `failed` |
| `not run` 加原因，或返回有效但漏报某项 check（记为 `not run: not reported`） | `done` |
| 返回缺失或畸形 | `failed` |

`For each task-acceptance check` 与 `after the task's last write` 两个限定不可删：前者排除拿 `git status` 退出 0 冒充 task-specific signal，后者排除最后一次改动之前的陈旧 pass。`In a valid result` 把"漏报 check"与"整份返回缺失或畸形"分开，后者不得伪装成 `done`。

两处需要与既有句子对齐，都不改动既有文本：

- **R2 的 `Otherwise write `done`` 与 `:56` 的 `Write `done` or `failed`` 是同一次写入的两个必要条件，不是两次写入。** R2（在 `:54` 段）给的是判定规则（哪些返回落 `done`、哪些落 `failed`），`:56` 给的是时机与另一道闸（子代理返回后重新检查 run-wide invariants，然后记录两个分别来源的事实，再写状态）。两者按合取读：R2 判出 `done` 且 `:56` 的 invariant 复查通过，才写 `done`；invariant 破了则按 `:58` 走 `status: interrupted`，`No later step may reach \`done\` past one` 仍然优先。实现时不要把 R2 读成"子代理一返回就可以落 `done`"。
- **R3b 的 `an ordinary serial task under every step 4 rule` 与 `:58` 的 `Between tasks there is no code review and no acceptance run` 不冲突。** `:58` 约束的是 envelope 里那批枚举任务之间不插入复审与验收；fix 不是 envelope 的枚举任务，而是 step 5 内唯一一次、位置终结的补救任务，所以"between tasks"够不着它。它之后由 `Only a \`done\` fix reruns all commands and the reviewer once` 触发的是**第二遍**验收（第一遍已经跑过并失败，这才有 fix），且被显式限额为一次，不是 step 5 那一遍的延续。`under every step 4 rule` 按本设计的读法指任务纪律（自包含 prompt、allowed paths、invariant 双检、两个分别来源的事实、`done`/`failed` 写法），不把 step 5 的重验吸收进 `:58` 的禁令；这是解释而非文本自明，字面张力在 fragment 里仍然存在。AC-3 禁止顺手改 `:58`，这里是最强的误改诱因，比 R2 那处更强。

R2 四分支的默认臂必须说清，不能当成完备划分：`Otherwise write \`done\`` 是兜底臂，两种情形会落进它而没有专门分支：一是报了 `not run` 却没给原因（既不满足"and why"，也不算 omitted、失败或畸形）；二是子代理报的最终结果实际早于最后一次写入，控制器无法核验。前者靠 step 7 的逐任务报告可见（`not run` 仍然不像 pass），后者靠"报告义务"本身而非控制器验证。这是本次接受的边界，不是遗漏。另有一处上游继承的措辞瑕疵：`In a valid result` 在字面上辖到整句，而句中又含 `missing or malformed task result makes the task \`failed\``；按字面读会自相矛盾（缺失的返回不是 valid result）。既定读法是：`In a valid result` 只辖前半句的"漏报 check 记为 `not run: not reported`"，后半句的"返回缺失或畸形"是独立的一支。措辞逐字冻结，此处只记读法。

R3a 的台账写入边界扩容只为容纳这一次 fix 的 `in-flight|done|failed` 记录，不是放宽任意 step 5 写台账。

实现后必须确认 `verdict` 一词在 fragment 中零命中：它与 `functional failure` 同义却没有取值定义，引入它等于给状态机开一个没有语义的分叉。

### DES-STATE-002 fix 额度的跨会话闭合程度与残余路径

`the run's one fix` 这个标记买到的，准确说是**额度在台账上可辨识**，不是**恢复端被强制去查**。两者的差别必须写在这里，否则实现者会把 RISK-STATE-002 读成已经关死。

已闭合的部分：fix 作为追加 ledger task 写入，其描述里带 `the run's one fix`；step 6 的既有流程本来就要读台账并把 goal 与 task list 摆给用户确认，因此该标记在恢复路径上是可见的；step 5 的"至多一次"以 run 为单位（`the run's one fix` 字面如此），不以会话为单位。加上 R3a 让 fix 的 `in-flight` 记录有合法落点后，"死在 fix 中途"的盘面不再被误当成无人派发过。

**残余路径**：`:49` 的台账任务行 schema 没有"这是本 run 唯一一次 fix"的字段，标记只活在任务描述文本里；step 6 与 step 5 都没有一句显式的"派 fix 前先扫台账里有没有 `the run's one fix`"。因此闭合依赖读文档的 agent 自己把"台账里可见的标记"与"每 run 至多一次"两条连起来。若它不连，需求 R3 描述的那条路径（全部 `done` → 命令失败 → 派 fix → fix 写 `done` → 会话死在重验完成前 → 新会话重跑验收再次失败 → 派第二次 fix）在原则上仍然可达。

**与上游断言的落差，必须显式记下而不是抹平**：`00-raw-requirement.md:129`（R3，已批准并冻结）的收尾是"加上这个标记后，恢复端从台账即可读出额度已用，**两条路径都收敛到 run `failed` 并进入 step 7**"。本设计的判断是：标记确实让额度"可读出"，但"收敛"还差一步强制查询，因此上游那句在 done-fix 这条路径上是断言过强。注意上游对**另一条**路径（fix 返回 `failed`、控制器写完任务行就死）确实做过明确的成本接受（`:131` 的"属于可接受的代价"），但对 done-fix 这条路径它主张的是闭合，不是接受。两者不能混为一谈。本设计不自行把上游的"闭合"改判成"接受"，而是把这个落差路由为 DECISION-001 交需求所有者裁决；裁决结果为 A（接受残余，冻结措辞与字节账一律不动），因此本节的表述即为最终口径。

为什么不在本次消除它：消除需要在 step 5 或 step 6 增写一句显式的查询指令，而 R1、R2、R3 的措辞与 1,161 字节的账已由上游逐字冻结，增写会打破字节账与 AC-2 的 10,129 硬指标。（不会打破按字面匹配的断言：19 条新 pattern 与 2 条 R6 pattern 要么是字面子串，要么是无界的 `[\s\S]*?` 跨段匹配，插入新句不影响它们。这条理由只有字节账那一条腿，写清楚以免用一条站不住的理由去支撑一个站得住的结论。）本设计能做的是把闭合程度写准，并向 SPEC 推一条可判定的契约：fix 的 ledger 任务描述必须包含字面串 `the run's one fix`，让"可辨识"这一半至少在产物上是可检查的。

因此 Requirements Coverage 里 RISK-STATE-002 记为部分闭合：可辨识性已落地，强制查询未落地，差额由 DECISION-001 承载。

**一条未列入 DECISION-001 选项集的动作，在此显式记下**：还存在第四种处置，即不动 fragment 一个字节，只把 `.xsk/requirements/execute-plan-return-bounds.md` 里 R3 那句"两条路径都收敛"改写成"额度在台账上可辨识"。它与选项 B 的性质不同（B 是往 fragment 里花字节，这条是纯文档订正，不碰任何字节账），但它改的是 `.xsk/requirements/` 下的需求原文，而本次 In-Scope 覆盖的是 fragment、`test/skill-behavior.test.js` 与两份生成产物。本 run 的处置是：最终交付按裁决 A 用"可辨识"口径表述，不复述上游那句；订正需求原文本身作为一条发现项交还需求所有者，由其自行处置。

### DES-TEST-001 测试契约的四处更新

1. `:379-380` 两个常量改为 `13200` 与 `10200`。
2. `:368-378` 预算注释整段重写，保住四层意思：50,757 字节的历史与"加载便宜"的职责；12000 曾是一次刻意复原而这次是有意离开；这 1,161 字节买到的是"tracked diff 与 untracked file contents 不经主会话、实施返回只认最后一次写入后的 task-acceptance 最终检查、reviewer 有 clean/concern 完整协议、fix 能自取命令诊断并连同一次性额度进入可恢复状态机"；改上限仍是产品决策，需要在交付里说清买到或让掉了什么。
3. 新增 19 条 `assert.ok`，归属由上游钉死：8 条进 `gate, ledger, and dispatch`，11 条进 `acceptance, recovery, and reporting`。其中 `/the diff against \`base\`/` 写成 `assert.ok(!pattern.test(c), ...)` 的负向断言，与 `/diff against \`base\` itself/` 合起来才证明"复审自取且控制器不再转手 diff 正文"。
4. 就地更换 2 条既有断言的 pattern：`:459-462` 去掉开头的 `telling it to `；`:463-466` 改为 `/Allow at most one bounded fix[\s\S]*?Only a \`done\` fix reruns all commands and the reviewer once; never loop/` 的单个非贪婪匹配（三个 xsk-execute-plan 内容契约块内已有 5 处同样写法，文件全局 11 行 12 处）。

块内条数从 10 + 8 + 11（29）变为 10 + 16 + 22（48）。测试用例数不变，`npm test` 仍是 247 条。文件全局 `assert.ok` 从 205 变为 224。

**两处有界的撰写余地，均已在此定死取法，不需要人工裁决**：

- 19 条新断言的第三个参数（性质说明串）。上游 R5 只给了 pattern，没给说明串，而文件里每条 `assert.ok` 都带一个说明串（如 `:450` 的 `'no per-task review'`）。取法：沿用文件既有的英文口吻自撰，一条断言一句、只描述该条断言的那一个性质，性质取自 R5 的"其余依次断言"一段。它不影响任何计数、任何字节预算，也不影响 pattern 本身。
- R7 重写后的注释正文。上游只钉了必须保住的四层意思，没钉逐字文本。取法：自撰，覆盖四层意思，并删掉 `The packed cap is back at its original 12000` 这句（保留它会与 13200 直接矛盾）。

两处都落在 `test/skill-behavior.test.js` 内，而该文件不在任何字节预算内，因此不进 1,161 字节的账。

**关于 U+2014 与 U+2013 的门禁范围（实测，与 `CLAUDE.md` 的概括不同）**：仓库里全部四条 dash 断言分别在 `test/generator.test.js:105-106` 与 `test/skill-behavior.test.js:194-195`，两处的被测对象都是 `xsk-write-req`；`test/generator.test.js` 的四个全技能循环（`:46`、`:64`、`:75`、`:116`）扫的是 placeholder、frontmatter、非空内容与 Waza 路径，都不扫 dash。因此 `xsk-execute-plan` 的生成内容**没有**任何 dash 测试门禁，测试文件本身更没有。本次新 fragment 文本、新注释、新说明串三处的 dash 约束全部来自仓库约定，唯一的实际检查是 DES-VERIFY-001 里那次显式扫描，实现时不得指望 `npm test` 兜住。

### DES-GEN-001 再生成与两条分离比较

只用 `CLAUDE.md` 的配方从仓库根生成：`const content = buildSkill(get('xsk-execute-plan')).content` 写 `skills/execute-plan/SKILL.md`，`content.replace(sharedTrim, '<SHARED_MASKED>')` 写 `test/fixtures/golden/xsk-execute-plan.md`。

核对必须是两条分离的比较，不得混用：packed 与原始 `content` 逐字节比较（期望 13,155 字节）；golden 与 `content.replace(sharedTrim, '<SHARED_MASKED>')` 逐字节比较（期望 12,629 字节）。把 masked golden 直接与原始 `content` 比较会得出"生成错了"的假结论，因为 golden 里的 shared body 已被 `<SHARED_MASKED>` 替换。

两份产物一律不手改。

### DES-VERIFY-001 分层验证与交付对账

每一层有独立的停机条件，任一层不符即停下核对需求，不得调参迁就：

- 编辑前：四个锚点各命中一次。
- 编辑后：三个旧句各零次，R2 锚点一次，四段新文本各一次；`verdict` 零命中；fragment 实测 10,129 字节。
- 生成后：packed 13,155、golden 12,629，两条分离比较各自逐字节相等。
- 测试层：`npm test` 247 条全绿；块内断言条数 10 + 16 + 22。
- 门禁层：`npm run syntaxcheck` 通过；用与 `test/self-conformance.test.js` 相同的临时 `npm_config_cache` 运行 `npm pack --dry-run --json` 通过。
- 约定层：**新增内容**中无 U+2014 与 U+2013，检查对象是本次改动引入的文本（新 fragment 文本、新注释、19 条新说明串、两条换掉的 pattern），不是整个文件。`test/skill-behavior.test.js` 当前已有 7 处 em-dash（`:8`、`:57`、`:120`、`:135`、`:155`、`:198`、`:238`，全在既有 test 标题与顶部注释里，en-dash 为 0），它们是本次改动既不产生也不接触的既有文本，所以整文件 grep 必然回 7 而不是 0；按整文件判定会得出一个假失败。正确做法是只扫 `git diff` 的新增行。本技能的生成内容无 dash 测试门禁，这次显式扫描是唯一一道。两份 README 标题行仍逐字节相同（本次不改 README，只做回归确认）。
- 交付层：逐条说明这 1,161 字节买到了什么；说明 R1 让掉的是"固定快照"而非"等价替换"，并写明零让步只在 exclusive-worktree 前提实际成立时才成立（现有 invariants 检不出 allowed-path 内的并发写）；按 DECISION-001 的裁决说明 fix 额度是"可辨识"而非"强制查询"，不复述上游 R3"两条路径都收敛"的措辞；确认工作区不含任何 commit。

## Decision Requests

### DECISION-001 fix 额度跨会话闭合：上游断言与实测读法之间的落差如何处置
Question: `00-raw-requirement.md:129`（R3，已批准冻结）断言"加上这个标记后，恢复端从台账即可读出额度已用，两条路径都收敛到 run `failed` 并进入 step 7"。本设计逐句核对冻结措辞后判断：标记确实让额度在台账上**可读出**，但 step 5 与 step 6 都没有一句强制"派 fix 前先查台账里有没有 `the run's one fix`"，所以 done-fix 那条路径的**收敛**依赖读文档的 agent 自行把两条规则连起来。上游对另一条路径（failed-fix）明确做过成本接受，对这一条主张的却是闭合。需求所有者要如何处置这个落差。
Options: A) 接受残余：冻结措辞、1,161 字节账、R4 的两个上限全部不动，把落差如实写进 DES-STATE-002 并在最终交付里说明"额度可辨识但未强制查询"。实现工作量与已定方案完全一致。 / B) 花字节关死：在 step 5 或 step 6 增写一句显式查询指令。这会打破 1,161 的字节账、AC-2 的 10,129 与 AC-4 的 13,155 / 12,629，以及 R4 给定的两个上限取值，因此需求要退回 raw_requirement 重开并重算 R4 与 R7 的字节叙述；R5 与 R6 的 21 条 pattern 本身不受影响（见 DES-STATE-002 对这一点的说明）。 / C) 判定本设计读法有误、上游断言成立：撤回 DES-STATE-002 整节，RISK-STATE-002 记为完全闭合。
Recommended: A
Selected: A
Rationale: 需求所有者于 2026-07-28 在本 run 内裁决为 A。冻结措辞、1,161 字节账与 R4 的两个上限一律不动；落差如实留在 DES-STATE-002，并进入最终交付的对账。B 的代价是整份需求退回 raw_requirement 重开，而换回的只是把一个已被写清的残余变成零残余；C 不成立，因为冻结措辞里确实没有任何一句要求恢复端去查这个标记，`00-raw-requirement.md:129` 的"收敛"比措辞实际保证的强。据此 R3 收尾那句在 done-fix 路径上的正确表述是"额度可辨识"，不是"两条路径都收敛"。
Status: selected

## Rollback

本次不产生任何 commit（SCOPE-OUT-010），因此回滚就是丢弃工作区改动，粒度到文件：

- `git checkout -- templates/fragments/execute-plan.behavior.md test/skill-behavior.test.js skills/execute-plan/SKILL.md test/fixtures/golden/xsk-execute-plan.md` 使四个文件回到 HEAD `4c1a081`。
- 只回滚 fragment 时，重新跑一次 DES-GEN-001 的配方即可让两份生成产物与之重新一致；生成产物没有独立状态，永远是 fragment 加 `lib/` 的函数结果。
- 回滚后的自证：`git status --short` 对这四个路径为空，且 `wc -c` 回到 8,968（fragment）/ 33,716（`test/skill-behavior.test.js`）/ 11,994（packed）/ 11,468（golden）。
- 无数据迁移、无外部状态、无配置变更，因此不存在部分回滚的中间态。

## Observability

纯指令技能没有运行时可观测性可加，本次也不引入任何日志或指标。可观测的是构建期信号，全部是确定性检查：

- 字节：`wc -c templates/fragments/execute-plan.behavior.md skills/execute-plan/SKILL.md test/fixtures/golden/xsk-execute-plan.md`，期望 10129 / 13155 / 12629。
- 锚点计数：对四个旧句与四段新文本各做一次精确子串计数，期望值见 DES-VERIFY-001。
- 禁用词：期望 `verdict` 在 fragment 中零命中。注意 `grep -c` 在零命中时退出码为 1，会打断 `set -e` 的校验脚本；用 `grep -c ... || true` 或 `grep -o ... | wc -l` 这类不把"零命中"当失败的写法。
- fix 标记可辨识性：新 fragment 中 `the run's one fix` 恰好命中一次（DES-STATE-002 推给 SPEC 的那条契约的产物侧检查）。
- 断言计数：三个 xsk-execute-plan 内容契约块的 `assert.ok` 条数，期望 10 / 16 / 22。
- 套件：`npm test` 的 247 条与全绿状态；`test/golden.test.js` 是生成产物与生成器一致性的背板。dash **没有**背板：仓库全部四条 dash 断言（`generator.test.js:105-106`、`skill-behavior.test.js:194-195`）都只测 `xsk-write-req`，`generator.test.js` 的全技能循环不扫 dash，所以约定层那次显式扫描是本技能唯一的一道。
- 打包：`npm pack --dry-run --json` 在隔离 cache 下的文件清单。

技能自身在运行时对使用者可见的新信号有两处，都由 step 7 的既有报告承载，不需要新增 output 契约：每项 task-acceptance 检查的最终结果（含 `not run: not reported`），以及 reviewer 的 clean/concern 结论与 fix 是否被派发。

## SPEC Handoff

SPEC 阶段需要把下面这些定成可判定的行为契约。1 到 9 的答案由上游逐字冻结或由本设计定死，没有留给实现者的选择；10 与 11 记录的是本设计对两处有界撰写余地的取法与一处残余风险的如实表述。DECISION-001 已由需求所有者裁决为 A（接受残余），因此 1 到 11 全部照本设计执行，无未决项；该裁决只固定了最终交付里对 fix 额度闭合程度的表述，不改变任何一条实现内容：

1. **fragment 文本契约**：四处替换的旧文本与新文本逐字给出，并规定"精确命中一次"是前置条件、"旧零新一"是后置条件。新文本禁止同义改写。
2. **状态映射契约**：R2 的四个返回分支到 `done`/`failed` 的映射；台账状态词汇仍是 `pending|in-flight|done|failed` 四个 token；`verdict` 为禁用词。
3. **fix 额度契约**：fix 以 `the run's one fix` 标记追加进台账，完整继承 step 4 的任务纪律；越出 confirmed envelope 时不派发并把 run 记为 `failed`；`failed` fix 直接进 step 7；只有 `done` fix 触发一次完整重验。
4. **reviewer 返回契约**：clean 精确返回 `no concerns`；否则每条 concern 一行，点名一条或多条 affected paths 或一条 acceptance criterion 与错误所在，不引用文件正文；空或畸形返回使 acceptance `failed` 且不派 fix。
5. **测试契约**：两个上限常量的值；19 条新断言的 pattern 与归属块；1 条负向断言的写法；2 条既有断言的新 pattern；块内条数 10 / 16 / 22；用例数仍为 247。
6. **注释契约**：预算注释必须覆盖的四层意思，以及"不得保留 `The packed cap is back at its original 12000` 这句"这一后置条件。
7. **生成契约**：packed 与 golden 的唯一生成路径，以及两条分离比较的期望字节数。
8. **验证矩阵**：分层停机条件、各层期望值，以及"不符时停下核对而非调参"的处置规则。
9. **交付对账契约**：必须出现在最终交付里的两组说明（1,161 字节买到了什么；R1 让掉的是固定快照而非等价替换，且零让步依赖 exclusive-worktree 前提），以及工作区不含 commit 的确认。
10. **fix 标记可辨识性契约**：fix 的 ledger 任务描述必须包含字面串 `the run's one fix`，产物侧以"新 fragment 中该串恰好命中一次"为检查；同时如实记下这只提供可辨识性，不提供强制查询（DES-STATE-002 的残余路径）。
11. **撰写余地的边界**：19 条断言说明串与 R7 注释正文是有界自撰，取法已由 DES-TEST-001 定死，且两者都在字节预算之外、在 U+2014/U+2013 测试门禁之外（仓库约定仍适用）。

## Trace
| This ID | Upstream | Status |
|---|---|---|
| DES-EDIT-001 | SCOPE-IN-001, SCOPE-IN-002, SCOPE-IN-003, RISK-IMPL-001 | [ADDRESSED] |
| DES-STATE-001 | SCOPE-IN-002, SCOPE-IN-003, RISK-STATE-001 | [ADDRESSED] |
| DES-STATE-002 | SCOPE-IN-003, RISK-STATE-002 | [ADDRESSED] |
| DES-TEST-001 | SCOPE-IN-004, SCOPE-IN-005, SCOPE-IN-006, SCOPE-IN-007, RISK-TEST-001, RISK-TEST-002, RISK-STATE-002 | [ADDRESSED] |
| DES-GEN-001 | SCOPE-IN-008, RISK-GEN-001 | [ADDRESSED] |
| DES-VERIFY-001 | SCOPE-IN-009, RISK-IMPL-002, RISK-DOC-001, RISK-CONV-001 | [ADDRESSED] |
| DECISION-001 | SCOPE-IN-003, RISK-STATE-002 | [CLOSED] |
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
