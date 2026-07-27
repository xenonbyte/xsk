# Intake Brief

work_id: WF-20260728-status-active-slug-execute-plan
requirement: ---
status: active
slug: execute-plan-return-bounds
created_at: 2026-07-28
---

# 需求：xsk-execute-plan 的复审自取 diff 与子代理返回下界

## Background

`xsk-execute-plan` 的 purpose 承诺"主会话只保留紧凑结果而不是文件内容"，但 `templates/fragments/execute-plan.behavior.md:60`（step 5）明写把 "the diff against `base`" 交给复审子代理：一个多文件改动的 diff 要从控制器手上过一遍，正是这个技能存在的意义要挡掉的东西。这是 purpose 与 behavior 的实打实缺口。同时 step 4（`:54`）对实施子代理的返回只有 `compact` 一个形容词，step 5 对复审的返回没有任何下界，fix 派发也没写清输入。

本需求由调研点 `.xsk/points/execute-plan-r2p-borrowings.md`（status: ready，经两轮外部审查后原地修订）折叠而来。该点逐条核对了 `r2p-execute` 的机制，采纳 A、B1、B2 三条，拒绝 C、D、E、F 四条。两条结构性前提在此复述，因为它们决定了哪些机制根本没有落脚点：

1. r2p 的证据模型建在 per-task commit 上（`commit_range`、commit-then-diff 复审、从台账反推 BASE），而 xsk 把 `commit` 列为入场硬停（`:11`），靠"HEAD 冻结在 `base` + 工作区入场干净"替代。凡以 commit 边界为锚的机制在 xsk 里没有对应物。
2. r2p 依赖一个 Python CLI 加 8 份编号产物，xsk 的 `lib/` 从不读技能文档，技能是纯 prose。权威产物矩阵、路径 preflight、auto-archive 门禁都依附于此。

当前实测：behavior fragment 8,968 字节（上限 9,000，余 32），packed `skills/execute-plan/SKILL.md` 11,994 字节（上限 12,000，余 6）。任何采纳都必须显式抬高上限并在最终交付中对账；只有用户另行明确要求 commit 时，才把同一份对账写进 commit message。

## Goal

在 `templates/fragments/execute-plan.behavior.md` 内落三组 behavior 内部纪律：复审自己去取 diff（A）、实施子代理在最后一次写入后的 task-acceptance 检查返回与状态下界（B1）、复审的 clean/concern 返回协议以及 fix 的诊断、台账、额度与状态传递（B2）。配套改 `test/skill-behavior.test.js` 的字节上限、预算注释与内容契约断言，并重新生成 packed skill 与 golden fixture。

对外可见形状不变：purpose、triggers、output 三份 fragment 不动，`lib/skills.js` 的 description 不动，两份 README 与 `AGENTS.md` 不动（技能数与对外能力都没变）。

## Scope

### In

- `templates/fragments/execute-plan.behavior.md`：step 5 的 diff 交接改为复审自取；step 4 追加实施返回与任务状态下界；step 4 的台账写入边界容纳 step 5 的 bounded fix；改写 step 5 既有的 fix 规则，补齐 clean review、无效 review、fix 诊断、fix 额度的台账可见性和 fix 状态迁移。
- `test/skill-behavior.test.js`：两个字节上限抬高；预算注释整段重写；新增 19 条内容契约断言；修复 2 条会被新措辞打断的既有断言。
- 重新生成 `skills/execute-plan/SKILL.md` 与 `test/fixtures/golden/xsk-execute-plan.md`。
- 全量验证（见 Checkpoints）。

### Out（真实非目标，均为本次明确拒绝而非推迟到本需求的后续阶段）

- 不改 `lib/` 任何运行时代码：这是纯指令技能，`lib/` 从不读 `.xsk/` 与技能文档。
- 不改 `execute-plan.{purpose,triggers,output}.md`：三组都是 behavior 内部纪律；task-local check 状态属于既有 compact result，并由 step 7 的既有逐任务报告承载。
- 不改 `lib/skills.js` 的 description、两份 README、`AGENTS.md`。
- 不动 `test/skill-behavior.test.js` 里的退役机制黑名单。
- 不引入 per-task commit / BASE / commit_range、权威产物矩阵、路径 preflight 五条校验、auto-archive 门禁：见 Background 的两条结构性前提，这不是取舍问题。

下面四项是调研中评估过并明确拒绝的机制。取用条件记在这里，因为 `.xsk/points/archive/` 与 `.xsk/requirements/archive/` 都被 gitignore，归档后原始论证不再进版本库。将来任一条件成立时，它是一份新的需求，不是本需求的续集。

| 项 | 拒绝理由 | 取用条件 | 取用时的前置要求 |
|---|---|---|---|
| C 缺上下文 / 规则冲突不算失败 | 修好之后约 450 到 500 字节，是候选里最贵的，而且要动的正是刚焊死的状态机 | 真出现过一次 run 因子代理缺一条上下文而整体作废 | 停因与已用次数必须落台账且恢复端要读；子代理已有部分写入时不得直接重派；用户裁决若改动 envelope（task 文本、allowed paths、验收项）一律终止 run 并重新入场加重新过门 |
| D 按角色选模型 | 与"省上下文"这个立论无关，同一次提交里塞进来会让"抬上限买到了什么"说不清 | 复审质量真的出过问题，或一次 run 的费用成为实际抱怨点 | 措辞平台中立；重点是复审的能力下限，不是省钱 |
| E Pre-flight 计划自洽扫描 | plain request 路径上任务拆分本来就是控制器自己在 step 2 写的，让它再扫一遍是自审，信号弱；成本落在最紧的字节预算上 | plain request 路径上真的出现过拆分自相矛盾 | 需要先回答"控制器自审自己刚写的拆分"信号为何足够 |
| F 任务简报走台账路径而非粘贴 | 收益是 N × 任务文本的二阶收益，却要引入一个靠子代理自觉遵守的定向读取协议，并把恢复日志变成输入产物 | 任务条数多且每条描述长到与 diff 同量级 | 需要同时给出"台账对子代理只读"这句话的归属 |

## Requirements

### R1. step 5：复审自己去取 diff

`templates/fragments/execute-plan.behavior.md` 中，把这段（当前 `:60`）：

```
the command results, the diff against `base`, and the full observed path list, telling it to read the untracked paths directly, since a plain diff omits them and a whole new source file would otherwise never reach review; deletions are already in that diff.
```

替换为：

```
the command results, `base`, and the full observed path list, telling it to diff against `base` itself and read the untracked paths directly, since a plain diff omits them and a whole new source file would otherwise never reach review; relaying the tracked diff or untracked file contents through this conversation would pull in the material this skill exists to keep out.
```

这里的取舍要在实现时记清楚，别在交付说明里说成"等价替换"：r2p 的 `git diff -U10 <base> HEAD` 是 commit 到 commit，落成文件后就定死；这里的 `git diff <base>` 是 base 对活工作区，读的那一刻才求值。相对"控制器自己跑 diff 再贴过去"，让步为零只在现有 exclusive-worktree 前提实际成立时成立：最终验证结束到 reviewer 自取 diff 之间，不能有人改 allowed paths；现有 invariants 检不出 allowed-path 内的并发写。相对 r2p 的固定快照才是净让步，换回来的是 tracked diff 与 untracked file contents 都不经主会话。step 5 本来就在用"让复审自己去读 untracked 路径"的写法，改完恰好消掉现有的不一致。

### R2. step 4：实施子代理的返回下界

在 `Require a compact result and the paths it believes it wrote.`（当前 `:54`）之后，同段接上：

```
Require nothing else back: no diff, no file contents, no task restatement. For each task-acceptance check, report its final run after the task's last write and exit result, or `not run` and why. In a valid result, an omitted check becomes `not run: not reported`; any failed final check or missing or malformed task result makes the task `failed`. Otherwise write `done` and keep the check evidence for step 7.
```

四个分支必须都落在现有状态机上，不得引入台账四个 token（`:49`）之外的第五种状态：

| 返回 | 任务状态 | 依据 |
|---|---|---|
| 最后一次写入后，每项 task acceptance 相关检查的最终结果全部成功 | `done` | 只认最终代码状态上的检查；早期失败、修好并重跑成功不把任务永久判死 |
| 上述任一最终结果失败 | `failed` | 是子代理对本任务 acceptance 的自检结果，不是控制器在任务之间另开门禁 |
| `not run` 加原因，或已有其他有效返回但漏报 check | `done` | 前者原样记录；后者记为 `not run: not reported`。两者都不失败，但在 step 7 的 compact result 里可见，绝不看起来像 pass |
| 子代理返回缺失或畸形 | `failed` | 无返回、工具失败或畸形返回不是"漏报 check"，不能伪装成完成 |

`For each task-acceptance check` 与 `after the task's last write` 两个限定不能删：前者排除拿 `git status` 退出 0 冒充 task-specific signal，后者排除最后一次改动之前的陈旧 pass。`final run ... and exit result` 同时定死了多检查与先失败后修复的语义：每项相关检查报告最终一次，任一最终失败才使任务失败。`In a valid result` 把漏报 check 与整份任务返回缺失或畸形分开，后者不得伪装成 `done`。

这条与 `:58` 的 "Between tasks there is no code review and no acceptance run" 不冲突，实现时不要顺手"修"掉其中一句：R2 是子代理对自己已经跑过的检查的**报告义务**，不是控制器在任务之间新开门禁。

### R3. step 5：复审返回、fix 诊断与 fix 状态传递

先把 step 4 台账写入边界里的这句（当前 `:52`）：

```
Write it here, at step 7's terminal write, and in step 6, nowhere else.
```

替换为：

```
Write it here, for step 5's bounded fix, at step 7's terminal write, and in step 6, nowhere else.
```

这不是放宽任意 step 5 写台账；它只容纳下面唯一一次 bounded fix 的 `in-flight|done|failed` 记录，承担两件事：session 若死在 fix 中途，step 6 能按既有 in-flight 规则停住，而不是把部分写入误当成无人派发过；以及让"至多一次"这个额度本身落盘，恢复端读得出来（见下面对 `the run's one fix` 的说明）。

再把 step 5 这句（当前 `:60`）：

```
A reviewer objection or a command failure is a functional failure. Allow at most one bounded fix as an ordinary serial task, then rerun the commands and the reviewer once; never loop.
```

整句替换为：

```
Require exactly `no concerns` when clean; otherwise one line per concern, each naming what is wrong and identifying one or more affected paths or an acceptance criterion, without quoting file contents. Empty or malformed review makes acceptance `failed`; dispatch no fix. A valid concern or command failure is a functional failure. Allow at most one bounded fix only inside the confirmed envelope; otherwise set the run to `failed` without dispatch. Append it to the ledger as the run's one fix, an ordinary serial task under every step 4 rule. Give it the concern lines and each failing command with its exit result, but no command output; it re-reads code and reruns them for diagnostics. A failed fix goes to step 7. Only a `done` fix reruns all commands and the reviewer once; never loop.
```

必须是改写整句，不是在旁边插入新句。在旁边插入会造出这些缺陷：fix 派发变成无条件的，和"只有 valid concern 或 command failure 才算 functional failure、且至多一次"打架；命令失败但复审没有 concern 时 fixer 没有诊断入口；fix 失败后仍无条件重跑 acceptance；fix 没进台账，恢复时看不见 in-flight 写入；以及引入 `verdict` 这类与 "functional failure" 同义、却没有取值定义的新词。实现时不得引入 `verdict` 一词。

`the run's one fix` 这个限定不能省成 `an ordinary serial task`，否则 "never loop" 跨不了会话边界。台账上 fix 与普通任务同形时，额度只活在会话里，而下面这条路径是可达的：全部任务 `done` → 命令失败 → 派 fix → fix 写 `done` → session 死在"重跑 commands 与 reviewer"完成之前。此时盘上是 `status: running`、全部任务 `done`、无 `in-flight` 也无 `pending`，step 6 判定可恢复并按 `:70` "always re-run full acceptance" 重跑；验收再次失败时，新会话没有任何依据认为额度已用，于是派出第二次 fix，原则上可无限重复。这正是调研点当初否掉 C 的那条理由（"'一次'这个上限只活在会话里，而台账存在的全部理由就是中途被压缩不丢东西"），不能从 fix 这一侧再放进来。加上这个标记后，恢复端从台账即可读出额度已用，两条路径都收敛到 run `failed` 并进入 step 7。

同一标记也覆盖第二条路径：fix 返回 `failed`、控制器写完任务行但还没写 `status: failed` 就死，盘上同样是 `running` 加一条 `failed` 任务，step 6 会去重跑完整验收，而不是按 "A failed fix goes to step 7" 直接收尾。额度可读之后这只剩一次多余的验收重跑，不再是"第二次 fix"，属于可接受的代价，不为它再花字节。

返回协议只有两种合法形状：clean review 精确返回 `no concerns`；否则每条 concern 一行，点名一条或多条 affected paths，或 acceptance criterion 与错误所在，不引用文件正文。空返回、工具没有返回、或不符合这两种形状的返回都使 acceptance `failed`，且不派 fix，因为没有可行动诊断。

配套的事实认定：**concern 行就是 findings，它们确实经控制器传给 fixer**，所以不许在任何地方写成"findings 不经主会话"。命令失败的另一路只传 command 与 exit result，fixer 自己重跑命令读取输出；不把失败日志复制进发给 fixer 的 prompt。fix 必须完全落在已确认 envelope 内；需要新路径、新产品决策或其他 envelope 扩张时，不派发并把 run 记为 `failed`。合法 fix 作为追加 ledger task 标记为 `the run's one fix` 并完整继承 step 4，fix 自身失败直接进 step 7，只有 `done` 才触发一次完整重验。代价是 fixer 会重读代码并重跑命令，换主会话不落任何文件正文或失败日志。

### R4. 字节上限抬高

`test/skill-behavior.test.js:379-380` 改为：

```js
const EXECUTE_PLAN_PACKED_MAX = 13200;
const EXECUTE_PLAN_BEHAVIOR_MAX = 10200;
```

实测字节差（非估算，已在本仓库当前 HEAD 上验证）：

| 改动 | 字节 |
|---|---|
| R1 复审自取 diff + 明确不传 tracked/untracked 正文 | +115 |
| R2 task-acceptance 最终检查返回与四分支状态 | +411 |
| R3 台账写入边界 | +26 |
| R3 clean/concern 返回 + fix 诊断、额度标记、台账和状态迁移 | +609 |
| 合计 | **+1,161** |

behavior 8,968 → 10,129；packed 11,994 → 13,155；masked golden 11,468 → 12,629。behavior 与 packed 上限分别按下一个百位取整为 10,200 与 13,200，余量 71 与 45，此后不再按千位。

### R5. 19 条新的内容契约断言

沿用文件现有写法（一条断言一个性质、一条断言一个 pattern）。加在哪个块由下面的归属定死，不由实现者临场决定，否则同一份需求两个人实现会落到不同块。

加进 `gate, ledger, and dispatch` 块（step 4 的返回下界与台账写入边界）：

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

加进 `acceptance, recovery, and reporting` 块（step 5 的 diff 交接、reviewer 返回与 fix）：

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

第二块的 `/the diff against `base`/` 是负向断言，必须写成 `assert.ok(!pattern.test(c), ...)`；它与 `/diff against `base` itself/` 合起来才证明 reviewer 自取 diff 且控制器不再交接 diff 正文。

其余依次断言：实施返回排除正文；只认最后一次写入后的 task-acceptance 最终检查；`not run` 逼选；最终失败、`done` 两支、漏报标记与无效任务返回都落到既有状态机；step 5 的 fix 写台账不与既有写入边界冲突；reviewer 的 clean/concern 两种合法形状与无正文边界；空或畸形 review 不触发 fix；fix 不扩 envelope；**fix 在台账上可辨识，额度因此跨得过恢复**；fix 完整继承 step 4；命令失败一路由 fixer 自取诊断；failed fix 直接结束。

`/Append it to the ledger as the run's one fix/` 与 `/an ordinary serial task under every step 4 rule/` 拆成两条而不是一条长 pattern，是因为它们断言的是两个性质：前者是额度可辨识（缺了它 "never loop" 跨不了会话），后者是 fix 完整继承 step 4 的任务纪律。合成一条会让其中一半被删掉时仍然绿。

三个 xsk-execute-plan 内容契约块当前共 29 条 `assert.ok`（10 + 8 + 11），加这 19 条后为 48 条（10 + 16 + 22）。测试用例数不变，仍是 247。

### R6. 修复 2 条被新措辞打断的既有断言（调研点未覆盖的缺口）

这一条不在原调研点里，是折叠时对着 `test/skill-behavior.test.js` 实测发现的：新措辞会让两条既有断言从"通过"变成"失败"，只加 R5 的 19 条不够。两条都在 `acceptance, recovery, and reporting` 块内就地换 pattern，不改变该块的断言条数。

- `:459-462`，性质 "review material covers the paths a plain diff hides"。R1 在 "telling it to " 之后插入了 "diff against `base` itself and "，原 pattern 不再连续。pattern 改为去掉开头的 `telling it to `：

  ```
  /read the untracked paths directly, since a plain diff omits them and a whole new source file would otherwise never reach review/
  ```

- `:463-466`，性质 "fixes are bounded and fully revalidated"。R3 改了 bounded fix 的锚点并把重验限定在 fix `done` 之后，原 pattern 不再存在。pattern 改为跨过中间状态规则的单个非贪婪匹配（文件里已有 5 处同样写法）：

  ```
  /Allow at most one bounded fix[\s\S]*?Only a `done` fix reruns all commands and the reviewer once; never loop/
  ```

两条都是**就地修复**，不是删除：它们断言的性质与 R5 新增的任何一条都不重复（R5 的 `/diff against `base` itself/` 断言的是"复审自己去取"，不是"untracked 路径进入复审"；R5 分别断言 fix 的 envelope、输入、额度可辨识、台账继承与失败路由，这条既有断言保留的是"至多一次且 done 后完整重验"），而文件顶部的注释明写"一条断言一个性质"。所以断言总数是 29 条（其中 2 条换了 pattern）加新增 19 条，等于 48 条。

### R7. 预算注释整段重写

`test/skill-behavior.test.js:368-378` 现在是四段叙事，明写 "The packed cap is back at its original 12000" 并逐项核了那 500 字节的来历。改成 13200/10200 会让这段变成假话，所以是整段重写而不是补一句。重写后必须保住四层意思：

1. 这个技能曾达到 50,757 字节的 forensic protocol，而它的职责就是加载便宜；
2. 12000 曾是一次刻意的复原，这次是有意离开它；
3. 这 1,161 字节买到的是"tracked diff 与 untracked file contents 不经主会话；实施返回只认最后一次写入后的 task-acceptance 最终检查；reviewer 有 clean/concern 完整协议；fix 能自取命令诊断，并连同它的一次性额度一起进入可恢复状态机"；
4. 改上限仍然是产品决策，属于要在最终交付里说清买到或让掉了什么的那一类，不是顺手改的便利值；只有用户另行要求 commit 时，才在 commit message 里复述。

### R8. 重新生成 packed skill 与 golden

按 `CLAUDE.md` 的配方从仓库根跑（`buildSkill` 吃的是技能对象，不是名字字符串）：

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

`skills/execute-plan/SKILL.md` 与 `test/fixtures/golden/xsk-execute-plan.md` 绝不手改。

## Open Questions

无。用户已于 2026-07-28 接受以下最终选择：

- task 状态只认最后一次写入后、每项 task acceptance 相关检查的最终结果；
- clean review 固定返回 `no concerns`；空、缺失或畸形 review 使 acceptance `failed` 且不派 fix；
- fixer 自己重跑失败命令读取诊断；fix 追加为 ledger task 并标记为 `the run's one fix`，完整继承 step 4，只有 `done` 后才重验，越出 confirmed envelope 则不派发并把 run 记为 `failed`。

三组采纳项的最终措辞、字节账、断言清单在上面都已定死；R6 是折叠时补上的既有断言修复，处置方式已写明；C、D、E、F 是已决的拒绝项，取用条件见 Scope-out 表，不是待决问题。

## Checkpoints

实现必须在这些点停下来对着需求确认，不得跳过：

1. **fragment 编辑前与编辑后**：编辑前，R1 旧句、R2 锚点句 `Require a compact result and the paths it believes it wrote.`、R3 台账旧句、R3 fix 旧句各精确命中一次。编辑后，R1 与 R3 的三个旧句各为零，R2 锚点仍为一次；R1 新句、R2 新返回段、R3 新台账句、R3 新 review/fix 段各精确命中一次；`templates/fragments/execute-plan.behavior.md` 实测为 10,129 字节。对不上就是改错了位置或改动了措辞，停下来查，不要抬高上限去迁就。
2. **重新生成后**：`skills/execute-plan/SKILL.md` 实测 13,155 字节，逐字节等于 `buildSkill()` 的原始 `content`；`test/fixtures/golden/xsk-execute-plan.md` 实测 12,629 字节，逐字节等于 `content.replace(sharedTrim, '<SHARED_MASKED>')`。不得把 masked golden 直接与原始 `content` 比较。
3. **测试全绿**：`npm test` 仍是 **247 条**且全部通过（新增的是既有 test 块里的 `assert.ok`，测试用例数不变）。R6 点名的两条是实现时就地换 pattern，不是预期失败数；任何测试失败都先停下来核对需求，不得顺手删除、放宽或补写需求未授权的断言。
4. **其余门禁**：`npm run syntaxcheck` 通过；package 检查使用与 `test/self-conformance.test.js` 相同的临时 `npm_config_cache` 运行 `npm pack --dry-run --json`，避免依赖用户级 npm cache。
5. **仓库约定回归**：生成内容中无 U+2014 与 U+2013；两份 README 的标题行仍逐字节相同（本次不改 README，只做回归确认）。
6. **交付对账**：最终交付逐条说明抬高上限买到了什么（R7 的第 3 条），以及 R1 让掉的是"固定快照"而非"等价替换"。本需求不授权 commit；只有用户另行明确要求时，才把同一份对账写进 commit message。


## Tier Estimate
base: standard
modifiers: cross_project, dependency, migration, safety, scope_expanding

## Evidence Block
keywords_hit: ['重写', '改写', '改成', '迁移', '替代', '替换', 'python', 'c', '仓库', '删除', '删掉', '角色', 'token', 'token', '依赖', '全部', 'whole', 'full']
repo_baseline_summary: loc=6826, modules=5, monorepo=False, languages=['JavaScript']
linked_context: none
scope_signals: ['全部', 'whole', 'full']
escalation_candidates: ['migration', 'cross_project', 'safety', 'dependency']
confirm_status: pending