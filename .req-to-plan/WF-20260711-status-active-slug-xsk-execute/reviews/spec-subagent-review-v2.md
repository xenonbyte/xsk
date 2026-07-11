# Spec Subagent Review (v2)

评审对象: `06-spec.md` (r2p_version: 2, ready)。逐字级对抗审计，全部证据取自仓库当前文件与 SPEC 原文字节。

## Verdict

**fail**

fail 依据: F1 (HIGH)。06-spec.md 自身的代码围栏嵌套在 SPEC-BEHAVIOR-003/004 处结构性损坏: 按 CommonMark 解析，BEHAVIOR-003 的"逐字定稿"块在 ledger schema 的收尾围栏处提前闭合，步骤 5 后半/6/7 被排出块外，随后 BEHAVIOR-004 的标题与正文被吞进一个游离代码块。对一个以"可逐字落盘"为唯一使命的工件，两个 fragment 的逐字边界形式上不可恢复；按围栏机械提取落盘会直接在 C2 崩掉 6 条以上断言。内容本身完备正确，修复是纯机械的重新围栏(外层升 4 反引号)，不涉及任何语义改动。除 F1 外无 fail 级缺陷。

## Findings

### F1 (HIGH) 06-spec.md:40-89 — SPEC-BEHAVIOR-003/004 围栏嵌套损坏，逐字边界失效

- 实测围栏(awk 逐行取反引号数): 全文所有围栏均为 3 反引号。行 40 `​```markdown` 开 BEHAVIOR-003 块; 行 51 `​```markdown`(ledger schema 内层开栏，带 info string，按 CommonMark 不能作闭栏，是块内内容); **行 69 `​```(schema 收尾) 成为行 40 块的实际闭栏**。
- 后果 1: 行 71-82(step 5 的 `source: plan` 段与派发段、step 6 全部、step 7 全部)落在代码块外，按普通 markdown 渲染，不再属于"逐字定稿文本"块。
- 后果 2: 行 83 的 `​```(作者意图的闭栏) 反而新开一个游离块，把行 85 `### SPEC-BEHAVIOR-004 execute-plan.output.md（新建，全文）` 标题和行 88 的 output 全文吞进代码块(行 89 闭合)。这正是"把后续内容吞进代码块"的典型错误。
- 失败链: SPEC 自述"skill-behavior 断言正则直接取自这些文本"; 若实现者按围栏机械提取 BEHAVIOR-003，落盘的 fragment 缺失 step 6/7 与 step 5 后半，C2 的 `/warning-level, never a gate/`、`/at most 2 rounds/`、`/never fails the run/`、`/functional acceptance not run/`、`/UI acceptance skipped/`、`/Do not commit, push/` 等断言全部失败; 且内层 schema 围栏未闭合，落盘文件本身损坏。
- 修复(机械): BEHAVIOR-003 外层围栏改为 4 反引号 `​````markdown ... ````​`(内层 schema 保持 3 反引号)。BEHAVIOR-004 块随之自然配对。修复后应重新渲染核对全文围栏配对。
- 旁证(嵌套先例本身无问题): `templates/fragments/point.behavior.md:11-31` 内嵌 3 反引号 `​```markdown` schema，packed `skills/point/SKILL.md:33-53` 落盘正常——fragment 文件与生成管线不受影响，缺陷只在 SPEC 文档自身的转录层。

### F2 (MED) SPEC-CONFIG-001 description 含 ": "，经模板落入 frontmatter 后不是合法严格 YAML

- `templates/skill.md.tmpl:3` 为 `description: {{DESCRIPTION}}`(不加引号)。新 description 含 `a .xsk/runs/ ledger: one confirmation gate`(冒号+空格)。
- 确定性复现(本机 PyYAML): 对生成后的 frontmatter 两行解析 -> `ScannerError: mapping values are not allowed here`(line 2, column 103，正落在 `ledger:` 处)。现有 8 条 description 无一含 ": "，本条是注册表首例。
- 影响: 任何用严格 YAML 解析 SKILL.md frontmatter 的平台(claude/codex/opencode/gemini 各自的 loader 严格程度 UNCONFIRMED)会解析失败，技能可能加载不出来。仓库测试不设防(`skill-behavior` 只有 `/^description: .+/m` 正则，C1-C4 全绿也不会暴露)。
- 归责: description 逐字继承自 00-raw R1(已批准定稿)，非 spec 阶段漂移; 但 spec 是落盘前最后一道逐字门，应显式裁决(改模板为带引号输出、或上游改措辞去掉 ": ")而非静默继承。不计入 fail 判据(不会导致本仓实现或测试失败)，需向上游路由或在 SPEC 补一条处置。

### F3 (LOW) SPEC-BEHAVIOR-003 step 5 未显式写出台账初始 `status: running`

R4 原文"确认门通过、开始执行时才落盘 `status: running`"。SPEC 只说"Only after the gate passes, write the run ledger"，初始状态靠 schema 枚举首值与 step 1 续跑逻辑(查 `status: running`)间接蕴含。建议 step 5 补半句(如 "write the run ledger ... with `status: running`")。不影响断言与测试。

### F4 (LOW) R7.1 的"不要求用户处理"未落入 UI 跳过语义

SPEC 对不可渲染场景写了 "which is not a failure and blocks nothing"，覆盖"不算失败、不阻断"，但 R7.1 还有第三要素"不要求用户处理"(跳过行不产生用户待办)未显式出现。语义损失轻微，无断言依赖。

### F5 (LOW) R4 schema 注释 "request 指小需求输入，非 .xsk/requirements 文档" 的排他澄清被丢弃

SPEC 保留了正向定义("`source: request` means a small plain-language request")，丢了"非 .xsk/requirements 文档"的负向澄清。歧义风险低(triggers 已限定两类输入)，信息级。

其余专项核验(语义漂移第 6 项)全部通过，无发现: resume 仅对 `running`+pending/failed 询问且 done/failed 静默覆写(step 1 逐字对应 R4)、确认门唯一性含"续跑询问属异常恢复不计第二门"(step 4)、UI 残差永不 gate 且不改 done/failed(step 6 双重表述)、功能验收缺失显著标注+"零门禁不得像被验证过"(step 6)、gitignore 三要素 create-if-absent/append-only-if-missing/never-overwrite 逐字复用 point.behavior:33 句式、"台账可随时删除不归档"由 "stale ledgers may be deleted freely"+"not a deliverable" 覆盖、"不做 commit offer" 由 "never offer to commit it" 覆盖。未决歧义扫描(第 7 项): 无 TBD/hedging/未裁决分叉，Decision Requests 为 none; "实现期若微调措辞必须同步调整断言"是带约束的不变式而非摇摆。triggers 中 "the shared intent-matching convention below" 的 "below" 与模板顺序一致(`{{SHARED}}` 在 `{{OUTPUT}}` 之后，`shared/skill-common.md:3` 即意图匹配约定)。

## Regex Match Table

断言载体为 `body(skill)` = 完整生成技能文本(四 fragment + shared)，逐条对 SPEC-BEHAVIOR-001..004 定稿文本核验:

| # | 断言正则 | 命中定稿文本(位置) | 结果 |
|---|---|---|---|
| 1 | `/explicitly invoked only/` | triggers: "This skill is explicitly invoked only:" | match |
| 2 | `/never self-triggers/` | triggers: "it never self-triggers on execution intent" | match |
| 3 | `/simple to decide but heavy to execute/` | purpose: "tasks that are simple to decide but heavy to execute" | match |
| 4 | `/cheaper done inline/` | purpose: "is cheaper done inline" | match |
| 5a | `/ordered task list/` | behavior step 3: "Produce an ordered task list" | match |
| 5b | `/acceptance criteria before anything executes/` | step 3: "Define the acceptance criteria before anything executes." | match |
| 6 | `/\.xsk\/runs\//` | purpose "`.xsk/runs/`"; step 5 "`.xsk/runs/<slug>.md`" | match |
| 7 | ``/never overwrite an existing `\.xsk\/\.gitignore`/`` | step 5: "never overwrite an existing \`.xsk/.gitignore\`"(反引号逐字在位，元字符转义正确) | match |
| 8 | `/self-contained prompt/` | step 5: "one subagent with a self-contained prompt" | match |
| 9 | `/self-contained enough to re-dispatch/` | schema Tasks 行: "self-contained enough to re-dispatch" | match |
| 10 | `/file sets do not overlap/` | step 5: "their expected file sets do not overlap" | match |
| 11 | `/no review and no acceptance run/` | step 5: "there is no review and no acceptance run" | match |
| 12a | `/only the unfinished tasks/` | step 1: "re-dispatch only the unfinished tasks" | match |
| 12b | `/pending or failed/` | step 1: "and pending or failed tasks" | match |
| 13 | `/functional acceptance not run/` | step 6: 'state "functional acceptance not run" prominently' | match |
| 14 | `/warning-level, never a gate/` | step 6: "is warning-level, never a gate." | match |
| 15 | `/UI acceptance skipped/` | step 6: '"UI acceptance skipped: cannot render or screenshot here"' | match |
| 16 | `/at most 2 rounds/` | step 6: "at most 2 rounds by default" | match |
| 17 | `/never fails the run/` | step 6: "it never fails the run and never gates anything" | match |
| 18 | `/Do not commit, push/` | step 7: "Do not commit, push, or publish" | match |
| T1 | `/xsk-execute-plan/` (think 块) | SPEC-BEHAVIOR-005 新句 "offer \`xsk-execute-plan\` as the executor"; 006 新句同 | match |
| T2 | `/never an automatic invocation/` (think 块) | SPEC-BEHAVIOR-005 新句 "never an automatic invocation"(注意 006 的 "never invoke it automatically" 不命中，命中点仅在 behavior 新句，仍在同一技能 body 内) | match |

20/20 match，无 mismatch。注意事项: 断言 13-17 的命中文本全部位于 F1 被排出围栏的区间(SPEC 行 71-82)——正则本身与定稿文本逐字一致，但以围栏机械提取则全部踩空，佐证 F1 的失败链。

## Anchor Preservation

对照真实文件 `templates/fragments/think.behavior.md`(step 6 在 :15)与 `think.output.md`(末行 :9):

- SPEC-BEHAVIOR-005 旧段与 think.behavior.md:15 逐字一致; 新段 = 旧段原文 + 追加两句，旧文零改动。
- SPEC-BEHAVIOR-006 旧行与 think.output.md:9 逐字一致; 新文 = 旧行原样 + 空行 + 新段。

| 锚点 | 位置 | 结果 |
|---|---|---|
| `decision-complete plan` | think.purpose.md:1，未触碰 | 保全 |
| `planning-only` | think.purpose.md:3，未触碰 | 保全 |
| `explicit approval` | BEHAVIOR-005 新段内原样保留 | 保全 |
| `Open Questions` | think.output.md:7 未触碰(新句 "no Open Questions remain" 另增一处); think.behavior.md:13 未触碰 | 保全 |
| `Proposed Design Summary` | think.output.md:1，未触碰 | 保全 |
| `出方案` + `plan this` | think.triggers.md:3 与 :5，未触碰 | 保全 |
| `stop`(i) + `wait for approval` | "Then stop and wait for approval." 为 BEHAVIOR-006 新文首句原样保留 | 保全 |

否定锚点: 两处新文均不含 `Approved Design Summary`。新文亦不触发 `skill-behavior` think 块其余断言与 generator.test.js:123-130 四断言。7/7 保全 + 否定锚点通过。

## Prohibited Content Scan

- em-dash(U+2014)/en-dash(U+2013): 对 SPEC 行 13-140(全部 fragment 定稿与注册表条目区间)grep 实测零命中。SPEC-TEST-004 的测试标题(行 176)含 em-dash，属 JS 测试文件标题，与既有 `test/skill-behavior.test.js:55` 标题风格一致，禁令(生成技能内容)不适用，非违规。
- `{{`: 全文唯一命中在行 259(read-only Upstream Summary 引述模板占位符的叙述文字)，fragment 定稿零命中。
- `check-update.sh` / `../../` / 平台绝对路径(`~/.claude`、`~/.config/opencode` 等，即 generator 的 `/~\/\.(claude|agents|config\/opencode|gemini)/`): 零命中。
- 非 ASCII 扫描(行 19-139): 命中行全部为块外中文叙述行(标题/注解)，六个 fragment 定稿块与 JS 注册表块内容为纯 ASCII(含直引号，无弯引号)。
- FILLER_PHRASES 实际列表(test/skill-behavior.test.js:20-34，共 13 条，`includes` 小写子串匹配): `in today` / `it's important to note` / `it is important to note` / `let's dive` / `in conclusion` / `leveraging` / `robust and scalable` / `delve into` / `tapestry` / `navigate the` / `realm of` / `in the world of` / `game-changer`。对 06-spec.md 全文做大小写不敏感扫描(其中 delve/important to note 按放宽子串扫): **13/13 零命中**。
- 例外记录: 注册表 description 含 ": "(见 F2，YAML 层面问题，非本节禁令项)。

## Line Anchor Checks

| SPEC 引用 | 真实文件当前内容 | 结果 |
|---|---|---|
| generator.test.js:69 旧标题 `'generator: all eight skills are registered with name + description frontmatter'` | :69 逐字一致 | pass |
| generator.test.js:73 旧数组(8 名，sort 后 deepStrictEqual) | :73 逐字一致: `['xsk-archive-req','xsk-bypass-claude','xsk-check','xsk-consume-point','xsk-point','xsk-skill-scaffold','xsk-think','xsk-write-req']` | pass |
| 插入位 `'xsk-execute-plan'` 于 consume-point 与 point 之间 | 字典序实证: `xsk-c` < `xsk-e` < `xsk-p`，位置正确 | pass |
| install.test.js:1296 旧标题 `'install: claude gets all 8 skills; codex/opencode/gemini get 7 (no bypass-claude)'` | :1296 逐字一致 | pass |
| install.test.js:1323-1326 四行断言 8/7/7/7 与消息 `'claude has 8 skills'` 等 | :1323-1326 逐字一致，SPEC 的 9/8/8/8 新消息与之同构 | pass |
| self-conformance.test.js:158-160 必含路径数组，追加于 `'skills/consume-point/SKILL.md'` 之后 | consume-point 恰为 :160 行末元素; :162-164 为 `files.includes(r)` 循环，顺序无关成立 | pass |
| skill-behavior.test.js think 块 `:55 起` | :55 为该 test 头，:56 定义 `const c`，追加两行断言可直接落位 | pass |
| SPEC-CONFIG-001 与 lib/skills.js 条目同构 | 字段序 name/description/platforms/fragmentBase、description 独立缩进行、`ALL_PLATFORMS.slice()`、尾逗号，与既有 8 条(:6-61)逐字段同构; 插入数组末尾(xsk-check 之后)与 DES-ARCH-001 一致; description 与 R1 逐字一致 | pass |
| SPEC-GEN-001 四产物路径 | 与 CLAUDE.md node -e 管线一致(golden 用 skill.name `xsk-execute-plan.md`，目录/fragment 用 base `execute-plan`) | pass |

---

结论: 内容层(断言正则、锚点、行号、语义边界、禁令)全部通过或仅轻微漂移(3 LOW)，但工件转录层存在 1 处 HIGH(围栏嵌套损坏，逐字边界失效)与 1 处 MED(description 严格 YAML 不合法，继承自 R1，测试不设防)。HIGH 修复为纯机械重围栏，修复后本评审其余结论无需重跑。
