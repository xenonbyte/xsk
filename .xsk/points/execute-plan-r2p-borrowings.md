---
status: researching
slug: execute-plan-r2p-borrowings
created_at: 2026-07-27
---

# xsk-execute-plan 从 r2p-execute 借鉴什么，以及为什么大部分不借

## Aspect

xsk-execute-plan 现在已是纯编排器，r2p-execute 的哪些机制值得移植、哪些结构上不可移植，以及在只剩 6 字节预算的前提下该怎么付账。

## Research

> 本文经过一轮外部审查后原地修订。第一版采纳 A、B、C 三条，审查指出 C 的持久性与确认门两处硬缺陷、A/B 只闭合了一半、以及 D/E/F 的拒绝理由有事实错误。修订后收敛到 A + B，C 降级为已记录的延期项，理由见下。

### 前提先纠一处

问题问的是"参考 r2p-execute 但更轻量"，而实测两者体积是：

| 文件 | 字节 |
|---|---|
| `~/x-skills/req-to-plan/tools/workflow_cli/agent_templates/codex/skills/r2p-execute/SKILL.md` | 22,457 |
| `skills/execute-plan/SKILL.md`（本仓库，`bee3b02`） | 11,994 |

xsk-execute-plan 已经是 r2p-execute 的 0.53 倍，"更轻量"是既成事实而非待办目标。两者的加载摊销也不同：r2p-execute 只在装了 r2p 且 run 处于 `closed_at_plan_checkpoint` 时进入上下文，xsk-execute-plan 是任何项目显式调用即加载。所以真正的问题不是"怎么比它轻"，而是"它有哪些机制，值得花掉 xsk 仅剩的预算去换"。

`.xsk/points/archive/xsk-execute-plan.md`（2026-07-11）当时把边界定为"xsk-execute-plan 明确不是 r2p-execute"，那是定位判断，仍然成立。本次研究不推翻它，只在机制层面逐条核对。

### 结构性不可移植的部分（先划掉，省得反复权衡）

r2p-execute 的证据模型建在两根柱子上，xsk 两根都没有：

1. **每个任务自己 commit。** implementer 提交、记录 `commit_range`、fix wave 后 commit-then-diff 再复审、恢复时从 `Task N-1: complete (commits <base7>..<head7>)` 反推 BASE。xsk 把 `commit` 列为硬停（step 1），靠的是"HEAD 冻结在 `base` + 工作区入场干净"这套替代底座。凡是以 commit 边界为锚的机制（BASE 台账行、commit range 复审、per-task 提交范围）在 xsk 里没有对应物，不是取舍问题，是没有落脚点。
2. **一个 Python CLI 加 8 份编号产物。** `r2p-task-brief` 生成单任务 brief，`r2p-archive` 做归档门禁，Authoritative Context Set 指向 `02-project-context.md` 到 `06-spec.md`。xsk 的 `lib/` 从不读技能文档，技能是纯 prose，没有 CLI 也没有前置阶段产物。Authority Responsibility Matrix、Conflict Rule 的完整形态、fail-closed path preflight 都依附于此。

由此直接划掉：per-task commit / BASE / commit_range、task-brief 的 CLI 形态、权威产物矩阵、路径 preflight 五条校验、auto-archive 门禁。

### 逐条评估可移植的机制

**(A) 复审自取 diff，正文不经主会话 —— 采纳。**

r2p 写死了控制器可以留存的字段集（`status` / `report_path` / `review_report_path` / `commit_range` / `test_summary` / `concerns`），并明令"绝不把子代理返回的正文粘进后续派发"。

xsk 这边，purpose 承诺的是"主会话只留 compact results 而不是文件内容"，但 behavior 里唯一的约束是 `compact` 这个形容词。更要命的是 step 5（`execute-plan.behavior.md:60`）明写把 "the diff against `base`" 交给复审子代理 —— 一个多文件改动的 diff 从控制器手上过一遍，正是这个技能存在的意义要挡掉的东西。这是 purpose 与 behavior 的实打实缺口，不是措辞问题。

这里可以做得**比 r2p 轻**：r2p 要把 diff 落成 `logs/task-N-diff.md` 再传路径，是因为它的复审对着一段 commit range，需要一份定死的快照；xsk 的 HEAD 冻结在 `base`，复审子代理自己跑 `git diff <base>` 拿到的是同一段范围，不需要中间文件。

但**不能说"完全等价"**（第一版的原话，是超额断言）：两者都是某一时刻的快照，谁也拦不住期间有人写盘。exclusive worktree 只是用户在门前的声明，从来不在不变量清单里（`:16`、`:24` "never report it as verified"），而 allowed path 内部的并发写不破坏任何一条不变量，所以"中途被写会被抓到"是假的。诚实的表述是：两种取法暴露面相同，复审自取的时点更靠后、更贴近它要评的那个状态，且省掉一个产物 —— 这就够了，不需要等价性这个假前提撑。

顺带，step 5 本来就在用"让复审自己去读 untracked 路径"的写法，把 tracked diff 也改成自读，恰好消掉现有的不一致。

**(B) 返回契约的下界 —— 采纳，且必须两头都管。**

第一版只写了实施子代理的返回下界，漏了复审。审查指出这等于只闭合一半：step 5 的复审是另一次派发，返回没有任何约束，它吐一串带代码引用的长 findings，正文照样回主会话；"at most one bounded fix as an ordinary serial task" 也没说 findings 怎么传到 fix 任务。r2p 是靠 `review_report_path` 加四字段内联摘要解决的，xsk 不加产物的等价做法是把复审的返回也钉成"结论 + 每条一行、不回引正文"，fix 任务拿着那几行自己去读代码。

证据那一条第一版也没兑现。研究里引的是 r2p 的"没有新鲜命令输出不许报 DONE"，写出来却成了 `Where the task ran a check, one line of its fresh output is the result` —— 条件句，任务压根不跑检查照样 `done`；也没有 exit code，没有 r2p 那个逼选的 `not run: <reason>` 分支，而"一行新鲜输出"对静默成功的命令等于一行空白。改成逼选：要么给命令加它的退出结果，要么明写 `not run` 和原因，两样都没有就不算 done。这个形状和 step 7 已有的"each command and its exit result"也对得上。

**(C) 缺上下文 / 规则冲突不算失败 —— 不做，降级为延期项。**

痛点是真的：xsk 任务只有 `done` / `failed` 两个终态，而 `failed` 会置 `status: failed`、阻塞下游、台账变历史、重做要走完整 fresh run。子代理只是缺一个文件路径，和真把事做砸了后果一样。第一版据此提出"退回 `pending`，补齐后重派一次，同类第二次即 failed"，想的是复用现有状态、不动状态机。

审查打掉了这个便宜方案，两条都成立：

- **跨不了恢复。** 台账任务行只有四个 token（`:49`），step 6 又只说 "dispatch only the pending tasks whose dependencies are all `done`"（`:70`）。退回 `pending` 后它和从未派发过的任务在盘上完全同形，"一次"这个上限只活在会话里 —— 而台账存在的全部理由就是中途被压缩不丢东西。要做对就得持久化停因和已用次数，还得规定子代理已有部分写入时不许直接重派（它停下时可能已经写了一半）。
- **可能绕过唯一确认门。** step 1 把 "no new product decision" 列为入场硬停（`:11`），step 3 是全程唯一的门（`:24`）。"把冲突交给用户然后继续"没有任何限定，用户裁决完全可能改掉 task 文本、allowed paths 或验收项，那就是在门外重开了一次未申报的决策点，执行的已不是被确认过的 envelope。要做对就得切开：只有不改变 envelope 的补充事实可以原地重派，其余一律终止 run，重新入场 + 重新过门。

修好之后这条从约 291 字节涨到约 450-500，是三条里最贵的，而且它要动的正是前两轮 review 刚焊死的状态机。用最贵的字节去撑开刚收紧的东西，性价比最差 —— 所以砍掉，痛点记为已知代价。

**取的触发条件**：确实发生过一次 run 因为子代理缺一条上下文而整体作废、并且这件事值得用户抱怨时再取。取的时候上面两条修法是前置要求，不许再走"退回 pending"的便宜版本。

**(D) 按角色选模型 —— 不做，已记录延期。**

第一版说它"买的是成本"，这是漏读。r2p 那节（`SKILL.md:37-43`）同时设了能力**下限**：最终整支复审用最强模型，reviewer 和从散文描述干活的 implementer 有中档底线，理由写的是"turn count beats token price"。也就是说它买的是复审质量，不只是省钱 —— 而 step 5 是 xsk 整个 run 唯一的门，这个理由比第一版给的强。

仍然不做，理由换成预算竞争：A + B 已经要抬两次上限，同一次提交里再塞一个与"省上下文"这个立论无关的保证，会让"抬上限买到了什么"这句话说不清。触发条件：复审质量真的出过问题，或者一次 run 的费用成为实际抱怨点。

**(E) Pre-flight 计划自洽扫描 —— 不做。**

第一版的理由是"方案自洽由 xsk-think 负责"，半边落空：triggers 明写还接受 "a small plain-language request that needs no real design work first"，这条路径上根本没有 xsk-think。而"用户在门前扫一眼 envelope"也不是系统性的自洽扫描，审查这一点也对。

换成成立的理由：plain request 这条路上，任务拆分本来就是控制器自己在 step 2 写的，让它再扫一遍自己的产出找矛盾，是自审自己刚写的东西，信号很弱；真要有效就得换个新鲜子代理去扫，那是又一次派发。收益弱、成本明确，不做。

**(F) 任务简报走台账路径而非粘贴 —— 不做，但第一版的理由是错的。**

第一版说改成传路径"省的是派发 prompt 的体积（子代理侧成本），不是控制器上下文"。这写反了：派发 prompt 是 tool-call 参数，进的就是控制器自己的 transcript。所以传路径确实省控制器上下文，省的量是 N × 任务文本（控制器在 step 2 已经持有一份，每次派发是在复制）。

但仍然不做，理由是审查也指出的那个：任务全文本来就在台账里，传"台账路径 + 任务号"不需要 r2p 的 CLI —— 可代价是子代理会读到全部任务，边界变糊。r2p 用 CLI 出单任务 brief 正是为了规避这一点，xsk 不加产物就做不到。而收益量级只有 N × 任务文本，相对 diff / findings 正文是二阶项。省小钱换边界模糊，不划算。

### 预算这一关必须先过

`test/skill-behavior.test.js:379-380`：

```js
const EXECUTE_PLAN_PACKED_MAX = 12000;   // 实际 11994，余 6
const EXECUTE_PLAN_BEHAVIOR_MAX = 9000;  // 实际 8968，余 32
```

余量是 6 字节。任何采纳都必须要么删掉等量的现有保证，要么显式抬高上限 —— 而测试注释本身就写了改上限是一个产品决策、要在 commit 里说清它买到或让掉了什么。behavior fragment 已经被压过两轮（`bf4abd8` 那轮把三份 checkpoint 流程合成一份 writer protocol，只省了 0.4%），没有明显的肥肉可砍。结论是走"显式抬高"，并在 commit 里逐条对账。

按实际拟稿量（真实字节差，非估算）：

| 改动 | 字节 |
|---|---|
| (A) 复审自取 diff | +83 |
| (B1) 实施子代理返回下界 + 证据逼选 | +241 |
| (B2) 复审返回下界 + fix 传递 | +200 |
| 合计 | **+524** |

behavior 8,968 → 9,492；packed 11,994 → 12,518。

作为对照，第一版连 C 一起做是 +550，而 C 按审查修好后要 +450-500，全做的总量约 +1,000 到 +1,050（packed 约 13,000，约 8% 增长）。砍掉 C 把这次决策从"值不值 1,000 字节"压回"值不值 524 字节"，而且留下的两条都直接兑现 purpose 已经写下的承诺，抬上限的理由最好说。

## Landed plan

采纳 A、B（两个返回下界），拒绝 C、D、E、F，理由与触发条件如上。

### 1. `templates/fragments/execute-plan.behavior.md`

**step 5**，把交给复审的 diff 改成复审自取：

- 旧：`the command results, the diff against `base`, and the full observed path list, telling it to read the untracked paths directly, since a plain diff omits them and a whole new source file would otherwise never reach review; deletions are already in that diff.`
- 新：`the command results, `base`, and the full observed path list, telling it to diff against `base` itself and read the untracked paths directly, since a plain diff omits them and a whole new source file would otherwise never reach review; relaying either through this conversation would pull in the file contents this skill exists to keep out.`

**step 4**，在 `Require a compact result and the paths it believes it wrote.` 之后接：

`Require nothing else back: no diff, no file contents, no restatement of the task. Every result carries either a command with its exit result or the words `not run` and why; "should pass" is neither, and a task returning neither is not done.`

**step 5**，紧接上面改过的那句复审派发之后接：

`Bind the reviewer to the same return: a verdict, and one line per concern naming the path and what is wrong, quoting nothing back. A fix task is dispatched with those lines and reads the code itself.`

不改 purpose / triggers / output：三条都是 behavior 内部纪律，对外可见形状不变。

### 2. `test/skill-behavior.test.js`

- 上限改为 `EXECUTE_PLAN_PACKED_MAX = 12600`、`EXECUTE_PLAN_BEHAVIOR_MAX = 9500`（behavior 实际 9,492，余 8；packed 实际 12,518，余 82，与现有"余量不该是免费的"的写法一致）。此后按百位取整，不再按千位。
- **预算注释整段重写，不是补一句。** 现注释是四段叙事，明写 "The packed cap is back at its original 12000" 并逐项核了那 500 字节的来历；改成 12600/9500 会让这段变成假话。重写后要保住的意思：50757 那段历史和"这个技能的职责就是加载便宜"；12000 曾是一次复原，这次是有意离开它；这 524 字节买到的是"复审的 diff 与 findings 都不经主会话 + 任务返回有证据下界"；改上限仍是产品决策。
- 四条内容契约断言，一条一个性质、一条一个 pattern（沿用当前 29 条的写法，落到 33 条）：
  - `/diff against `base` itself/` —— 复审自取 diff
  - `/Require nothing else back: no diff, no file contents/` —— 实施返回有下界
  - `/either a command with its exit result or the words `not run`/` —— 证据是逼选，不是条件句
  - `/quoting nothing back/` —— 复审返回同样有下界
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

`npm test` 仍是 **247 条**（新增的是现有 test 块里的 `assert.ok`，断言数 29 → 33，测试数不变），须全绿；再跑 `npm run syntaxcheck`、`npm pack --dry-run`。确认 packed / golden 与 `buildSkill()` 逐字节一致、无 U+2014 / U+2013、两份 README 标题行仍逐字节相同（本次不动 README，只做回归确认）。

### 5. 不做的事，以及各自的取用条件

`lib/skills.js` 的 description 不动（仍是编排器，没有新增对外能力）；两份 README 不动；`AGENTS.md` 不动（技能数不变）。

| 项 | 取用条件 | 前置要求 |
|---|---|---|
| C 缺上下文不算失败 | 真出现过一次 run 因子代理缺一条上下文整体作废 | 停因与已用次数必须落台账、恢复端要读；部分写入不得直接重派；裁决若改动 envelope 一律终止并重新入场 + 重新过门 |
| D 按角色选模型 | 复审质量出过问题，或一次 run 的费用成为实际抱怨点 | 措辞平台中立；重点是复审的能力下限，不是省钱 |
| E Pre-flight 自洽扫描 | plain request 路径上真的出现过拆分自相矛盾 | 要有效就得换新鲜子代理去扫，按一次额外派发计成本 |
| F 任务简报走台账路径 | diff / findings 正文已经不再是上下文大头 | 需要同时解决"子代理读到全部任务导致边界变糊" |
