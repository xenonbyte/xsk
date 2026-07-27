---
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

当前实测：behavior fragment 8,968 字节（上限 9,000，余 32），packed `skills/execute-plan/SKILL.md` 11,994 字节（上限 12,000，余 6）。任何采纳都必须显式抬高上限并在 commit 里对账。

## Goal

在 `templates/fragments/execute-plan.behavior.md` 内落三条 behavior 内部纪律：复审自己去取 diff（A）、实施子代理的返回下界（B1）、复审的返回下界与 fix 传递（B2）。配套改 `test/skill-behavior.test.js` 的字节上限、预算注释与内容契约断言，并重新生成 packed skill 与 golden fixture。

对外可见形状不变：purpose、triggers、output 三份 fragment 不动，`lib/skills.js` 的 description 不动，两份 README 与 `AGENTS.md` 不动（技能数与对外能力都没变）。

## Scope

### In

- `templates/fragments/execute-plan.behavior.md`：step 5 的 diff 交接改为复审自取；step 4 追加实施返回下界；改写 step 5 既有的那句 fix 规则。
- `test/skill-behavior.test.js`：两个字节上限抬高；预算注释整段重写；新增 6 条内容契约断言；修复 2 条会被新措辞打断的既有断言。
- 重新生成 `skills/execute-plan/SKILL.md` 与 `test/fixtures/golden/xsk-execute-plan.md`。
- 全量验证（见 Checkpoints）。

### Out（真实非目标，均为本次明确拒绝而非推迟到本需求的后续阶段）

- 不改 `lib/` 任何运行时代码：这是纯指令技能，`lib/` 从不读 `.xsk/` 与技能文档。
- 不改 `execute-plan.{purpose,triggers,output}.md`：三条都是 behavior 内部纪律。
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
the command results, `base`, and the full observed path list, telling it to diff against `base` itself and read the untracked paths directly, since a plain diff omits them and a whole new source file would otherwise never reach review; relaying either through this conversation would pull in the file contents this skill exists to keep out.
```

这里的取舍要在实现时记清楚，别在 commit 里说成"等价替换"：r2p 的 `git diff -U10 <base> HEAD` 是 commit 到 commit，落成文件后就定死；这里的 `git diff <base>` 是 base 对活工作区，读的那一刻才求值。相对"控制器自己跑 diff 再贴过去"，让步是零（两者都是活视图，只差时点）；相对 r2p 的固定快照才是净让步，换回来的是那份 diff 完全不经主会话。step 5 本来就在用"让复审自己去读 untracked 路径"的写法，改完恰好消掉现有的不一致。

### R2. step 4：实施子代理的返回下界

在 `Require a compact result and the paths it believes it wrote.`（当前 `:54`）之后，同段接上：

```
Require nothing else back: no diff, no file contents, no restatement of the task. Every result names the check the task ran and that run's exit result, or says `not run` and why; an unreported check is recorded as `not run`, and a check the task ran and failed is a `failed` task.
```

三个分支必须都落在现有状态机上，不得引入台账四个 token（`:49`）之外的第五种状态：

| 返回 | 任务状态 | 依据 |
|---|---|---|
| 任务自己跑的检查失败 | `failed` | 是子代理在判自己点名的那条检查，不是控制器另开门禁 |
| `not run` 加原因 | `done` | 对齐 step 5 的 `skipped` 语义：不失败，但在 step 7 明确报出来，绝不看起来像 pass |
| 漏报 | `done`，记为 `not run` | 不失败但可见；一个每条任务都写着未报、验收又 skipped 的 run，本来就该看起来没被验证过 |

"the check the task ran" 里的限定不能删：只写"报一条命令加退出结果"，报个 `git status` 退出 0 就字面合规，是零信号。

这条与 `:58` 的 "Between tasks there is no code review and no acceptance run" 不冲突，实现时不要顺手"修"掉其中一句：R2 是子代理对自己已经跑过的检查的**报告义务**，不是控制器在任务之间新开门禁。

### R3. step 5：复审的返回下界与 fix 传递，写法是改写不是插入

把这句（当前 `:60`）：

```
A reviewer objection or a command failure is a functional failure. Allow at most one bounded fix as an ordinary serial task, then rerun the commands and the reviewer once; never loop.
```

整句替换为：

```
Bind the reviewer to the same return: one line per concern naming the path and what is wrong, quoting nothing back. A reviewer objection or a command failure is a functional failure. Allow at most one bounded fix as an ordinary serial task, dispatched with those concern lines and any failing command with its exit result, and left to re-read the code itself; then rerun the commands and the reviewer once; never loop.
```

必须是改写整句，不是在旁边插入新句。在旁边插入会造出三个缺陷：fix 派发变成无条件的，和"只有 reviewer objection 或 command failure 才算 functional failure、且至多一次"打架；命令失败但复审没有 concern 时 fixer 一条诊断也拿不到；以及引入 `verdict` 这类与 "functional failure" 同义、却没有取值定义的新词。实现时不得引入 `verdict` 一词。

配套的事实认定：**concern 行就是 findings，它们确实经控制器传给 fixer**，所以不许在任何地方写成"findings 不经主会话"。这是有意选的一边：复审不回引任何正文，每条 concern 一行写清路径和哪里不对，fixer 拿着这几行自己去读代码。代价是 fixer 会重读一遍复审刚读过的东西，换主会话不落任何文件正文。

### R4. 字节上限抬高

`test/skill-behavior.test.js:379-380` 改为：

```js
const EXECUTE_PLAN_PACKED_MAX = 12600;
const EXECUTE_PLAN_BEHAVIOR_MAX = 9600;
```

实测字节差（非估算，已在本仓库当前 HEAD 上验证）：

| 改动 | 字节 |
|---|---|
| R1 复审自取 diff | +83 |
| R2 返回下界 + 证据三分支 | +281 |
| R3 改写 fix 规则 + 复审返回下界 | +235 |
| 合计 | **+599** |

behavior 8,968 → 9,567；packed 11,994 → 12,593。上限按百位取整，此后不再按千位。

### R5. 6 条新的内容契约断言

沿用文件现有写法（一条断言一个性质、一条断言一个 pattern），加在对应的 test 块里：

```
/diff against `base` itself/
/Require nothing else back: no diff, no file contents/
/or says `not run` and why/
/a check the task ran and failed is a `failed` task/
/one line per concern naming the path and what is wrong, quoting nothing back/
/dispatched with those concern lines and any failing command with its exit result/
```

依次断言：复审自取 diff；实施返回排除正文；证据是逼选而非条件句；逼选落到状态机上的那一支；复审返回同样有下界；fix 两路输入都覆盖，包括复审无 concern 的那一路。

三个 xsk-execute-plan 内容契约块当前共 29 条 `assert.ok`（10 + 8 + 11），加这 6 条后为 35 条。测试用例数不变，仍是 247。

### R6. 修复 2 条被新措辞打断的既有断言（调研点未覆盖的缺口）

这一条不在原调研点里，是折叠时对着 `test/skill-behavior.test.js` 实测发现的：新措辞会让两条既有断言从"通过"变成"失败"，只加 R5 的 6 条不够。

- `:459-462`，性质 "review material covers the paths a plain diff hides"。R1 在 "telling it to " 之后插入了 "diff against `base` itself and "，原 pattern 不再连续。pattern 改为去掉开头的 `telling it to `：

  ```
  /read the untracked paths directly, since a plain diff omits them and a whole new source file would otherwise never reach review/
  ```

- `:463-466`，性质 "fixes are bounded and fully revalidated"。R3 在 "serial task," 与 "then rerun" 之间插入了 fix 输入描述，原 pattern 不再连续。pattern 改为跨过中间内容的单个非贪婪匹配（文件里已有 5 处同样写法）：

  ```
  /Allow at most one bounded fix as an ordinary serial task[\s\S]*?then rerun the commands and the reviewer once; never loop/
  ```

两条都是**就地修复**，不是删除：它们断言的性质与 R5 新增的任何一条都不重复（R5 的 `/diff against `base` itself/` 断言的是"复审自己去取"，不是"untracked 路径进入复审"；`/dispatched with those concern lines .../` 断言的是 fix 的输入，不是 fix 的界与重验），而文件顶部的注释明写"一条断言一个性质"。所以断言总数是 29 条（其中 2 条换了 pattern）加新增 6 条，等于 35 条。

### R7. 预算注释整段重写

`test/skill-behavior.test.js:368-378` 现在是四段叙事，明写 "The packed cap is back at its original 12000" 并逐项核了那 500 字节的来历。改成 12600/9600 会让这段变成假话，所以是整段重写而不是补一句。重写后必须保住四层意思：

1. 这个技能曾达到 50,757 字节的 forensic protocol，而它的职责就是加载便宜；
2. 12000 曾是一次刻意的复原，这次是有意离开它；
3. 这 599 字节买到的是"复审的 diff 不经主会话，复审与实施的返回都有下界"；
4. 改上限仍然是产品决策，属于要在 commit 里说清买到或让掉了什么的那一类，不是顺手改的便利值。

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

无。三条采纳项的最终措辞、字节账、断言清单在上面都已定死；R6 是折叠时补上的既有断言修复，处置方式已写明；C、D、E、F 是已决的拒绝项，取用条件见 Scope-out 表，不是待决问题。

## Checkpoints

实现必须在这些点停下来对着需求确认，不得跳过：

1. **fragment 编辑后**：三处 anchor 字符串精确命中（R1 的旧句、R2 的锚点句 `Require a compact result and the paths it believes it wrote.`、R3 的旧句），且 `templates/fragments/execute-plan.behavior.md` 实测为 9,567 字节。对不上就是改错了位置或改动了措辞，停下来查，不要抬高上限去迁就。
2. **重新生成后**：`skills/execute-plan/SKILL.md` 实测 12,593 字节；packed 与 golden 与 `buildSkill()` 的输出逐字节一致。
3. **测试全绿**：`npm test` 仍是 **247 条**且全部通过（新增的是既有 test 块里的 `assert.ok`，测试用例数不变）。若出现失败断言数超过 R6 列出的 2 条，说明还有本需求未识别的既有断言被打断，先补齐再继续。
4. **其余门禁**：`npm run syntaxcheck` 与 `npm pack --dry-run` 通过。
5. **仓库约定回归**：生成内容中无 U+2014 与 U+2013；两份 README 的标题行仍逐字节相同（本次不改 README，只做回归确认）。
6. **提交前对账**：commit message 要逐条说明抬高上限买到了什么（R7 的第 3 条），以及 R1 让掉的是"固定快照"而非"等价替换"。
