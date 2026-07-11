# Design Subagent Review (v2)

Reviewer: independent adversarial audit (design stage), 2026-07-11.
Target: `05-design.md` (r2p_version 2). Upstream: `00-raw-requirement.md` (R1-R11), `03-requirement-brief.md` (SCOPE-IN-001..010 / SCOPE-OUT-001..005 / AC-001..007), `04-risk-discovery.md` (RISK-* / Boundaries). All code evidence re-verified against the working tree at repo root `/Users/xubo/x-studio/xsk` (branch main, clean).

## Verdict

pass

无覆盖缺口、无证据失实、无内洽矛盾、无未决分叉。仅 3 条 LOW 级改进点（摘要压缩与 SPEC 前小含糊），均有既有纠偏路径（trace 指回全量上游条款 + DES-ARCH-002 的"无语义丢失"约束 + C4 人工对照），不构成 fail 条件。

## Findings

### F1 (LOW) DES-DATA-001 的续跑条件压缩掉了 R4 的一个限定
- 位置: `05-design.md:68`（DES-DATA-001 生命周期句"续跑仅对 `running` 询问，done/failed 直接覆写"）。
- 问题: 上游 R4 的续跑触发条件是双重的："发现同 slug 的 `status: running` 且有 pending/failed 任务时询问"。设计摘要只保留了 `running` 一个条件，丢掉"且有 pending/failed 任务"；同时 R4 的"台账可随时删除，不做归档"也未出现在 DES-DATA-001。若 SPEC 阶段照抄 DES-DATA-001 而非回溯 R4 落盘 fragment 措辞，会产生语义漂移（例如对一个 all-done 但未写 Result 的 running 台账的处理）。
- 证据: `00-raw-requirement.md:107`（R4 规则第 3 条）vs `05-design.md:68`。
- 缓解已在场: DES-ARCH-002（`05-design.md:61`）明确"边界条件逐条译自需求 R2-R7，无语义丢失"，且 Trace 将 DES-DATA-001 闭合到 SCOPE-IN-003（含全量 R4）。SPEC 须以 R4 原文为准，不以本摘要为准。

### F2 (LOW) README 技能表格新行的插入位置未定
- 位置: `05-design.md:77`（DES-DOC-001 "表格行"）与 `05-design.md:101`（SPEC Handoff 第 5 项）。
- 问题: R10 只说"表格各加 `xsk-execute-plan` 一行"，设计也未裁决新行插在表格何处（末尾追加 vs 其他位置），而 risk_discovery 的 Scope Overflow 明确禁止"重排技能表格顺序"。这是 SPEC 前唯一残留的小分叉。它是实现级细节、不需要用户裁决（追加到表末即满足"不重排既有行"），故不推翻 Decision Requests 的 none，但 SPEC 产出逐字表格行文本时必须同时定位置。
- 证据: `00-raw-requirement.md:152`、`04-risk-discovery.md:56`。

### F3 (LOW) README 计数措辞不受任何确定性测试保护，观测面表述略过头
- 位置: `05-design.md:89`（Observability "确定性测试即观测面（golden 字节比对、计数断言、README pinning、锚点断言）"）；同源问题在上游 `04-risk-discovery.md:65`（RISK-DOC-001 mitigation 称"readme-pinning/baseline 测试是确定性防线"）。
- 问题: 实测 `test/readme-pinning.test.js`、`test/baseline.test.js`、`test/self-conformance.test.js` 只断言标题行 parity、CLI token 与英文 literal，全仓 grep 无任何对 "Eight/Nine/八个/九个" 计数措辞或表格行的断言。漏改计数措辞不会让任何测试变红；AC-006 的计数部分只能靠 C4 的人工逐项对照兜底。设计正文的 Current Code Evidence（`05-design.md:21`）本身表述准确（只声称"标题字节一致由测试保障"），故此条是 Observability 一句的不完整 + 上游 mitigation 的轻微失实，非设计核心缺陷。实现者不应期待测试捕获计数措辞漏改。
- 证据: `grep -rn 'Eight|eight|八个' test/readme-pinning.test.js test/baseline.test.js test/self-conformance.test.js` 为空；`test/readme-pinning.test.js:31-34`（仅 heading parity）。

## Evidence Checks

逐条抽查设计 Current Code Evidence 及关键内洽点，与真实源码对照：

1. `lib/skills.js` 现有 8 条目、结构 `{name, description, platforms, fragmentBase}`、访问器 `skills`/`get`/`forPlatform`/`ALL_PLATFORMS`（`['claude','codex','opencode','gemini']`）: **match**（`lib/skills.js:3,5-62,64-72`）。
2. install 动态消费注册表 `lib/install.js:8`: **match**（`const { skills: ALL_SKILLS } = require('./skills');` 恰在第 8 行）。
3. `lib/generator.js` `buildSkill` 填 NAME/DESCRIPTION/SHARED + 四 section 大写键；`templates/skill.md.tmpl` 含全部 7 个占位符 `{{NAME}}/{{DESCRIPTION}}/{{PURPOSE}}/{{TRIGGERS}}/{{BEHAVIOR}}/{{OUTPUT}}/{{SHARED}}`: **match**（`lib/generator.js:19-37`、tmpl 第 2,3,6,8,12,16,20,22 行）。
4. `test/golden.test.js:15-18` `<SHARED_MASKED>` 掩蔽机制: **match**（SENTINEL 定义在 :13，`maskedShell` 恰为 :15-18；另有 :64-79 packed 同步测试，佐证"手改 packed 必崩"）。
5. `test/generator.test.js:69` 标题 "all eight skills are registered...": **match**。`:73` 排序名单 deepStrictEqual: **match**，且关键内洽点核实通过——`:70` 为 `skills.map((s) => s.name).sort()` 后再比较，因此 **DES-ARCH-001 的"注册表数组追加到末尾 + 测试名单有序插入"可行**；字典序 `xsk-consume-point` < `xsk-execute-plan` < `xsk-point` 成立，插入位置声明正确。现注册表本身非字母序（think 在首、check 在尾），追加末尾不破坏任何断言。
6. `test/generator.test.js:123-130` think 锚点（decision-complete plan / planning-only / explicit approval / Open Questions）: **match**（测试块恰为 123-130）。
7. `test/skill-behavior.test.js:55` think 断言块含否定断言 `!/Approved Design Summary/`（实际在 :61）: **match**；设计写 ":55-64"，实际块为 55-63，尾界差 1 行，无实质影响（上游 R5 只锚 :55，成立）。
8. `test/install.test.js:1296-1327` 计数 8/7/7/7 与标题: **match**（标题 :1296 "claude gets all 8 skills; codex/opencode/gemini get 7 (no bypass-claude)"；计数断言 :1323-1326）。9/8/8/8 的目标值与 bypass-claude 仅 claude 平台的事实一致。
9. `test/self-conformance.test.js:158-160` 打包必含 skills 路径: **match**（8 个 `skills/<base>/SKILL.md` 恰在 required 列表 :158-160；新增 `skills/execute-plan/SKILL.md` 落点正确）。
10. README 计数措辞行号 EN/CN 各 15/21/65: **match**（EN :15 "eight curated skills (two distilled from third parties, six original)"、:21 "**Eight curated skills**"、:65 "Eight skills, prefixed"；CN :15 "八个精选 skill（两个从第三方蒸馏而来，六个原创）"、:21 "**八个精选 skill**"、:65 "共八个 skill"）。EN :15 牵连 six->seven original 的声明成立。
11. `package.json` `files` 含 `skills/` 整目录: **match**（`["bin/","lib/","skills/","shared/","templates/","README.md","README.zh-CN.md","LICENSE"]`），新增技能确不需改 package.json。
12. `templates/fragments/point.behavior.md` gitignore append-only 原型: **match**（:33 "Create `.xsk/` and `.xsk/.gitignore` if absent; append the line only if it is missing; never overwrite an existing `.xsk/.gitignore`"，即设计声称的 create-if-absent / append-only / never-overwrite 三要素）。
13. DES-ARCH-003 可行性: **match**。R5 全部 7 组锚点在 think fragment 中定位——`think.purpose.md:1` decision-complete plan、`:3` planning-only、`think.triggers.md:3/5` 出方案 与 plan this、`think.behavior.md:15`（第 6 步）explicit approval、`think.behavior.md:13`+`think.output.md:7` Open Questions、`think.output.md:1` Proposed Design Summary、`think.output.md:9` "Then stop and wait for approval"。设计只在第 6 步与 output 各追加一句，不触碰任何锚点所在句。
14. 枚举面完备性（对抗性反查）: **match**。全测试目录 grep 数值断言与技能名单，除上述四处外无其他技能计数/枚举硬编码；`docs/`、`requirements/` 仅 archive 历史文档（不应改），`scripts/syntaxcheck.js` 无技能名单。设计"四处既有枚举/计数"清单完备。
15. 全仓无既有 `execute-plan` / `xsk-execute-plan` 引用: **match**（grep 为空），新技能无命名冲突。

Mismatch 计数: 0（第 7 条尾界差 1 行按 immaterial 记 match）。

## Ambiguity / Hedging Scan

- `05-design.md:68` DES-DATA-001 续跑条件的摘要压缩（见 F1）——非骑墙，但 SPEC 须回溯 R4 原文。
- `05-design.md:77,101` README 表格新行插入位置未定（见 F2）——SPEC 级细节，建议 SPEC 明确"追加到表末，不重排既有行"。
- Decision Requests 为 none 的验证: **成立**。上游 Open Questions 为空；设计 Options Considered 记录了全部 6 个已裁决分叉（执行位置/状态持久化/UI 验收级别/触发方式/拆解形状/think 衔接），本阶段抽查未发现任何需要用户（而非 SPEC 编写者）裁决的新分叉。F2 属实现细节，默认裁决（表末追加）不改变需求语义。
- 其余表述均为明确决定: "行号漂移以内容匹配为准"是已声明的确定性 fallback（Assumptions 承接），不算 hedging；SPEC Handoff 六项是合规的阶段边界延迟，每项都有明确产出物定义；全文无 TBD / "figure out later" / 未闭合的"或者"。
