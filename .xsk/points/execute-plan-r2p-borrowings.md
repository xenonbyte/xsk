---
status: researching
slug: execute-plan-r2p-borrowings
created_at: 2026-07-27
---

# xsk-execute-plan 从 r2p-execute 借鉴什么，以及为什么大部分不借

## Aspect

xsk-execute-plan 现在已是纯编排器，r2p-execute 的哪些机制值得移植、哪些结构上不可移植，以及在只剩 6 字节预算的前提下该怎么付账。

## Research

> 本文经两轮外部审查后原地修订。第一版采纳 A、B、C 三条；第一轮审查打掉 C（持久性与确认门两处硬缺陷），并指出 A/B 只闭合一半、D/E/F 的拒绝理由有事实错误。第二轮审查指出 B1/B2 与既有状态机和既有 fix 规则没有咬合、F 的拒绝前提仍然是错的、A 的范围描述仍不准。本版是第二轮修订的结果。
>
> 第二轮暴露的根因值得单独记一笔：B1、B2 不是可以"追加一句"的东西，它们要和 `behavior.md:49`/`:56` 的状态机、`:60` 的 fix 规则咬合。前两版都在挨着旧规则加新句子而不是改旧句子，于是造出了无条件的 fix 派发和一个在状态机里没有落点的 "not done"。本版把 B2 写成对 `:60` 的改写。

### 前提先纠一处

问题问的是"参考 r2p-execute 但更轻量"，而实测两者体积是：

| 文件 | 字节 |
|---|---|
| `~/x-skills/req-to-plan/tools/workflow_cli/agent_templates/codex/skills/r2p-execute/SKILL.md` | 22,457 |
| `skills/execute-plan/SKILL.md`（本仓库，`bee3b02`） | 11,994 |

xsk-execute-plan 已经是 r2p-execute 的 0.53 倍，"更轻量"是既成事实而非待办目标。加载摊销的差别比第一版说的小：r2p-execute 也是先加载技能、再跑 CLI 按 `closed_at_plan_checkpoint` / `executing` / 其他分流（`r2p SKILL.md:14`），并不是"只在 closed 状态才进上下文"；真实差别只是它要求装了 r2p 且存在一个 run。所以真正的问题不是"怎么比它轻"，而是"它有哪些机制，值得花掉 xsk 仅剩的预算去换"。

`.xsk/points/archive/xsk-execute-plan.md`（2026-07-11）当时把边界定为"xsk-execute-plan 明确不是 r2p-execute"，那是定位判断，仍然成立。本次研究不推翻它，只在机制层面逐条核对。

### 结构性不可移植的部分（先划掉，省得反复权衡）

r2p-execute 的证据模型建在两根柱子上，xsk 两根都没有：

1. **每个任务自己 commit。** implementer 提交、记录 `commit_range`、fix wave 后 commit-then-diff 再复审、恢复时从 `Task N-1: complete (commits <base7>..<head7>)` 反推 BASE。xsk 把 `commit` 列为硬停（step 1），靠的是"HEAD 冻结在 `base` + 工作区入场干净"这套替代底座。凡是以 commit 边界为锚的机制（BASE 台账行、commit range 复审、per-task 提交范围）在 xsk 里没有对应物，不是取舍问题，是没有落脚点。
2. **一个 Python CLI 加 8 份编号产物。** `r2p-task-brief` 生成单任务 brief，`r2p-archive` 做归档门禁，Authoritative Context Set 指向 `02-project-context.md` 到 `06-spec.md`。xsk 的 `lib/` 从不读技能文档，技能是纯 prose，没有 CLI 也没有前置阶段产物。Authority Responsibility Matrix、Conflict Rule 的完整形态、fail-closed path preflight 都依附于此。

由此直接划掉：per-task commit / BASE / commit_range、权威产物矩阵、路径 preflight 五条校验、auto-archive 门禁。

### 逐条评估可移植的机制

**(A) 复审自取 diff：采纳。**

r2p 写死了控制器可以留存的字段集（`status` / `report_path` / `review_report_path` / `commit_range` / `test_summary` / `concerns`），并明令"绝不把子代理返回的正文粘进后续派发"。

xsk 这边，purpose 承诺的是"主会话只留 compact results 而不是文件内容"，但 behavior 里唯一的约束是 `compact` 这个形容词。更要命的是 step 5（`behavior.md:60`）明写把 "the diff against `base`" 交给复审子代理。一个多文件改动的 diff 从控制器手上过一遍，正是这个技能存在的意义要挡掉的东西。这是 purpose 与 behavior 的实打实缺口，不是措辞问题。

前两版对两种取法的描述都不准，这里说清楚。r2p 的 `git diff -U10 <base> HEAD` 是 commit 到 commit，落成文件后就定死；本方案的 `git diff <base>` 是 base 对工作区，读的那一刻才求值。它们不是同一段范围，也谈不上"暴露面相同"。真实取舍是：

- 拿到的：更新鲜（时点更贴近它要评的那个状态），且不需要中间产物。
- 让掉的：交接物不再固定。复审读到的是活工作区，allowed path 内部的并发写会被它吸收，而 exclusive worktree 只是用户在门前的声明，从来不在不变量清单里（`:16`、`:24` "never report it as verified"），allowed path 内的写也不破坏任何一条不变量，所以这类写既拦不住也查不出。

在"控制器自己跑 diff 再贴过去"和"复审自己跑"之间，这个让步是零（两者都是活视图，只差时点）；相对 r2p 的固定快照才是净让步。而 xsk 换回来的是那份 diff 完全不经主会话，这正是本技能的立论。够了，不需要"等价"这个假前提撑。

顺带，step 5 本来就在用"让复审自己去读 untracked 路径"的写法，把 tracked diff 也改成自读，恰好消掉现有的不一致。

**(B1) 实施子代理的返回下界：采纳，三个分支必须定死。**

第一版写成 `Where the task ran a check, one line of its fresh output is the result`，是条件句，任务压根不跑检查照样 `done`；第二版改成逼选，却留了一句 "a task returning neither is not done"。审查指出 `not done` 在状态机里没有落点：台账只有四个 token（`:49`），子代理返回后必须写 `done` 或 `failed`（`:56`），照字面只能落 `failed`，于是一个活干对了、只是漏报命令的任务会拖垮整个 run。那正是我用来否掉 C 的那种不成比例的惩罚，从后门又放进来了。

三个分支这么定，逼选就从"新增失败模式"退回成"报告义务"，与 xsk"任务之间没有门禁"的设计不冲突：

| 返回 | 任务状态 | 依据 |
|---|---|---|
| 任务自己跑的检查失败 | `failed` | 是子代理在判自己点名的那条检查，不是控制器另开门禁 |
| `not run` 加原因 | `done` | 对齐 step 5 的 `skipped` 语义：不失败，但在 step 7 明确报出来，绝不看起来像 pass |
| 漏报 | `done`，记为 `not run: not reported` | 不失败但可见；一个每条任务都写着未报、验收又 skipped 的 run，本来就该看起来没被验证过 |

另外补上"这条检查是本次任务跑的"这个限定。只写 "a command with its exit result"，报个 `git status` 退出 0 就字面合规，是零信号。

**(B2) 复审的返回下界与 fix 传递：采纳，写法必须是改写 `:60` 而不是插入。**

第二版在 `:60` 旁边插了一句 "A fix task is dispatched with those lines and reads the code itself"，三处出问题：它是无条件的，和 `:60` 已有的"只有 reviewer objection 或 command failure 才算 functional failure、且至多一次 bounded fix"打架；命令失败但复审没有 concern 时，"those lines" 是空的，fixer 一条诊断也拿不到；`a verdict` 这个词被引入却没定义取值，也没说它跟 concern、跟最终 status 的关系。

对应处理：把这句并进 `:60` 那句里改写，让 fix 的触发条件仍由 `:60` 原有的语义控制；`verdict` 这个词直接删掉，`:60` 已经写了"reviewer objection 或 command failure 即 functional failure"，再造一个同义词只会多一层要定义的东西；fix 的输入同时带 concern 行**和**失败命令及其退出结果，覆盖只有命令失败那一路。

**"findings 不经主会话"这句话必须撤回。** concern 行就是 findings，它们确实经控制器传给 fixer。r2p 没有这个矛盾，是因为详细 findings 落在 `review_report_path`，fixer 拿路径，内联 `concerns` 只是摘要（`r2p SKILL.md:167`、`:182`）。xsk 不加产物，就必须在两种取舍里明选一种，这里选前者并写明代价：

- **选：只传有损摘要，fixer 自行重新定位。** 复审不回引任何正文，每条 concern 一行，写清路径和哪里不对；fixer 拿着这几行自己去读代码。代价是 fixer 会重读一遍复审刚读过的东西，多花一次子代理的读盘，换主会话不落任何文件正文。
- 不选：传足够细节，那就得承认失败路径上的上下文不再严格有界。

**(C) 缺上下文 / 规则冲突不算失败：不做，降级为延期项。**

痛点是真的：xsk 任务只有 `done` / `failed` 两个终态，而 `failed` 会置 `status: failed`、阻塞下游、台账变历史、重做要走完整 fresh run。子代理只是缺一个文件路径，和真把事做砸了后果一样。第一版据此提出"退回 `pending`，补齐后重派一次，同类第二次即 failed"，想的是复用现有状态、不动状态机。

第一轮审查打掉了这个便宜方案，两条都成立：

- **跨不了恢复。** 台账任务行只有四个 token（`:49`），step 6 又只说 "dispatch only the pending tasks whose dependencies are all `done`"（`:70`）。退回 `pending` 后它和从未派发过的任务在盘上完全同形，"一次"这个上限只活在会话里，而台账存在的全部理由就是中途被压缩不丢东西。要做对就得持久化停因和已用次数，还得规定子代理已有部分写入时不许直接重派（它停下时可能已经写了一半）。
- **可能绕过唯一确认门。** step 1 把 "no new product decision" 列为入场硬停（`:11`），step 3 是全程唯一的门（`:24`）。"把冲突交给用户然后继续"没有任何限定，用户裁决完全可能改掉 task 文本、allowed paths 或验收项，那就是在门外重开了一次未申报的决策点，执行的已不是被确认过的 envelope。要做对就得切开：只有不改变 envelope 的补充事实可以原地重派，其余一律终止 run，重新入场加重新过门。

修好之后这条从约 291 字节涨到约 450 到 500，是候选里最贵的，而且它要动的正是前两轮 review 刚焊死的状态机。用最贵的字节去撑开刚收紧的东西，性价比最差，所以砍掉，痛点记为已知代价。

**取用条件**：确实发生过一次 run 因为子代理缺一条上下文而整体作废、并且这件事值得用户抱怨时再取。取的时候上面两条修法是前置要求，不许再走"退回 pending"的便宜版本。

**(D) 按角色选模型：不做，已记录延期。**

第一版说它"买的是成本"，这是漏读。r2p 那节（`r2p SKILL.md:37-43`）同时设了能力**下限**：最终整支复审用最强模型，reviewer 和从散文描述干活的 implementer 有中档底线，理由写的是 "turn count beats token price"。也就是说它买的是复审质量，不只是省钱，而 step 5 是 xsk 整个 run 唯一的门，这个理由比第一版给的强。

仍然不做，理由换成预算竞争：A + B 已经要抬两次上限，同一次提交里再塞一个与"省上下文"这个立论无关的保证，会让"抬上限买到了什么"这句话说不清。触发条件：复审质量真的出过问题，或者一次 run 的费用成为实际抱怨点。

**(E) Pre-flight 计划自洽扫描：不做。**

两版理由都不成立，这里第三次改。第一版说"方案自洽由 xsk-think 负责"，漏了 triggers 明写还接受 "a small plain-language request that needs no real design work first"，那条路径上根本没有 xsk-think。第二版说"要有效就得换新鲜子代理去扫，按一次额外派发计成本"，也错：r2p 的 pre-flight 是 controller 自己读一遍 `07-plan.md` 扫（`r2p SKILL.md:28-32`），没有额外派发。

成立的理由只剩两条，够了：plain request 这条路上，任务拆分本来就是控制器自己在 step 2 写的，让它再扫一遍自己刚写的东西找矛盾，是自审，信号弱；而 r2p 扫的是一份经过 5 个阶段、由别的角色写定的 `07-plan.md`，两者不是一回事。成本这边它只花散文字节，但那正是眼下最紧的资源。收益弱、成本落在最紧的地方，不做。

**(F) 任务简报走台账路径而非粘贴：不做，但前两版的理由都是错的。**

第一版说改成传路径"省的是派发 prompt 的体积（子代理侧成本），不是控制器上下文"。这写反了：派发 prompt 是 tool-call 参数，进的就是控制器自己的 transcript，所以传路径确实省控制器上下文，省的量是 N × 任务文本（控制器在 step 2 已经持有一份，每次派发都是在复制）。

第二版说"传路径会让子代理读到全部任务，边界变糊"，也不成立：路径只是给访问能力，prompt 完全可以要求只定位第 N 条。更要命的是我把 xsk 的优势说成了劣势：xsk 台账存的是 `<full task description with dependencies and acceptance items>`，而 r2p 的 `execution/progress.md` 只是 "task ID + title list"（`r2p SKILL.md:60`）。r2p 需要 CLI 出单任务 brief 恰恰是因为它的台账没有正文，xsk 反而不需要 CLI。第二版给的取用条件"diff / findings 正文已经不再是上下文大头"更是自燃：A/B 一落地就立刻满足。

按"定向读取协议的成本与可靠性"重新权衡后，结论仍是不做，但换成能站住的理由：

- **可靠性**：粘贴是确定的，"打开这个文件、只用第 N 条"要靠子代理遵守。为一个二阶收益引入一个靠自觉的协议，不划算。
- **概念成本**：台账现在是控制器独占的恢复日志。让子代理读它，等于把恢复日志同时变成输入产物，还得补一句"对子代理只读"（r2p 就有这句，`r2p SKILL.md:82`）。这几十字节买的是同一个二阶收益。
- **量级**：收益是 N × 任务文本，而任务文本本来就该是短的（这个技能只接小的、决策轻的活）；diff 与 findings 正文才是大头，那两块由 A 和 B2 解决。

**取用条件**（不会自燃的版本）：任务文本本身成为上下文大头，也就是任务条数多且每条描述长到与 diff 同量级时。届时同时要解决"对子代理只读"这句话的归属。

### 预算这一关必须先过

`test/skill-behavior.test.js:379-380`：

```js
const EXECUTE_PLAN_PACKED_MAX = 12000;   // 实际 11994，余 6
const EXECUTE_PLAN_BEHAVIOR_MAX = 9000;  // 实际 8968，余 32
```

余量是 6 字节。任何采纳都必须要么删掉等量的现有保证，要么显式抬高上限，而测试注释本身就写了改上限是一个产品决策、要在 commit 里说清它买到或让掉了什么。behavior fragment 已经被压过两轮（`bf4abd8` 那轮把三份 checkpoint 流程合成一份 writer protocol，只省了 0.4%），没有明显的肥肉可砍。结论是走"显式抬高"，并在 commit 里逐条对账。

按最终拟稿实测（真实字节差，非估算）：

| 改动 | 字节 |
|---|---|
| (A) 复审自取 diff | +83 |
| (B1) 返回下界 + 证据三分支 | +281 |
| (B2) 改写 `:60`，复审返回下界 + fix 传递 | +235 |
| 合计 | **+599** |

behavior 8,968 → 9,567；packed 11,994 → 12,593。

作为对照：第一版（含未修好的 C）是 +524，C 按第一轮审查修好后单独就要 +450 到 500。这次多花的 75 字节买掉的是三个高危未决分支（`not done` 无落点、fix 无条件派发、命令失败无诊断），值。

## Landed plan

采纳 A、B1、B2，拒绝 C、D、E、F，理由与取用条件如上。

### 1. `templates/fragments/execute-plan.behavior.md`

**step 5**，把交给复审的 diff 改成复审自取：

- 旧：`the command results, the diff against `base`, and the full observed path list, telling it to read the untracked paths directly, since a plain diff omits them and a whole new source file would otherwise never reach review; deletions are already in that diff.`
- 新：`the command results, `base`, and the full observed path list, telling it to diff against `base` itself and read the untracked paths directly, since a plain diff omits them and a whole new source file would otherwise never reach review; relaying either through this conversation would pull in the file contents this skill exists to keep out.`

**step 4**，在 `Require a compact result and the paths it believes it wrote.` 之后接：

`Require nothing else back: no diff, no file contents, no restatement of the task. Every result names the check the task ran and that run's exit result, or says `not run` and why; an unreported check is recorded as `not run`, and a check the task ran and failed is a `failed` task.`

**step 5**，改写既有的那句 fix 规则（是改写，不是在旁边插入）：

- 旧：`A reviewer objection or a command failure is a functional failure. Allow at most one bounded fix as an ordinary serial task, then rerun the commands and the reviewer once; never loop.`
- 新：`Bind the reviewer to the same return: one line per concern naming the path and what is wrong, quoting nothing back. A reviewer objection or a command failure is a functional failure. Allow at most one bounded fix as an ordinary serial task, dispatched with those concern lines and any failing command with its exit result, and left to re-read the code itself; then rerun the commands and the reviewer once; never loop.`

不改 purpose / triggers / output：三条都是 behavior 内部纪律，对外可见形状不变。

### 2. `test/skill-behavior.test.js`

- 上限改为 `EXECUTE_PLAN_PACKED_MAX = 12600`、`EXECUTE_PLAN_BEHAVIOR_MAX = 9600`（behavior 实际 9,567，packed 实际 12,593）。此后按百位取整，不再按千位。
- **预算注释整段重写，不是补一句。** 现注释是四段叙事，明写 "The packed cap is back at its original 12000" 并逐项核了那 500 字节的来历；改成 12600/9600 会让这段变成假话。重写后要保住的意思：50757 那段历史和"这个技能的职责就是加载便宜"；12000 曾是一次复原，这次是有意离开它；这 599 字节买到的是"复审的 diff 不经主会话、复审与实施的返回都有下界"；改上限仍是产品决策。
- 六条内容契约断言，一条一个性质、一条一个 pattern（沿用当前 29 条的写法，落到 35 条）：
  - `/diff against `base` itself/` 复审自取 diff
  - `/Require nothing else back: no diff, no file contents/` 实施返回排除正文
  - `/or says `not run` and why/` 证据是逼选，不是条件句
  - `/a check the task ran and failed is a `failed` task/` 逼选落到状态机上的那一支
  - `/one line per concern naming the path and what is wrong, quoting nothing back/` 复审返回同样有下界
  - `/dispatched with those concern lines and any failing command with its exit result/` fix 两路输入都覆盖，包括复审无 concern 的那路
- 退役机制黑名单不动。

### 3. 重新生成

按 `CLAUDE.md` 的配方，从仓库根跑（`buildSkill` 吃的是技能对象，不是名字字符串）：

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

绝不手改这两个文件。

### 4. 验证

`npm test` 仍是 **247 条**（新增的是现有 test 块里的 `assert.ok`，断言数 29 → 35，测试数不变），须全绿；再跑 `npm run syntaxcheck`、`npm pack --dry-run`。确认 packed / golden 与 `buildSkill()` 逐字节一致、无 U+2014 与 U+2013、两份 README 标题行仍逐字节相同（本次不动 README，只做回归确认）。

### 5. 不做的事，以及各自的取用条件

`lib/skills.js` 的 description 不动（仍是编排器，没有新增对外能力）；两份 README 不动；`AGENTS.md` 不动（技能数不变）。

| 项 | 取用条件 | 前置要求 |
|---|---|---|
| C 缺上下文不算失败 | 真出现过一次 run 因子代理缺一条上下文整体作废 | 停因与已用次数必须落台账、恢复端要读；部分写入不得直接重派；裁决若改动 envelope 一律终止并重新入场加重新过门 |
| D 按角色选模型 | 复审质量出过问题，或一次 run 的费用成为实际抱怨点 | 措辞平台中立；重点是复审的能力下限，不是省钱 |
| E Pre-flight 自洽扫描 | plain request 路径上真的出现过拆分自相矛盾 | 需要先回答"控制器自审自己刚写的拆分"信号为何足够 |
| F 任务简报走台账路径 | 任务条数多且每条描述长到与 diff 同量级 | 需要同时给出"台账对子代理只读"这句话的归属 |
