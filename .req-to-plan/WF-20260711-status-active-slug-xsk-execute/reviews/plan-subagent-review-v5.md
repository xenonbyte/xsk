# Plan Subagent Review (v5)

评审对象: `07-plan.md` (version 5, r2p_status: ready)
评审人: plan 阶段独立评审 subagent
日期: 2026-07-11
方法: 对照 06-spec.md (approved v3)、04-risk-discovery.md、03-requirement-brief.md 逐条核验, 并对仓库源码 (test/golden.test.js、lib/skills.js、test/generator.test.js、test/install.test.js、test/self-conformance.test.js、test/skill-behavior.test.js、test/baseline.test.js、test/readme-pinning.test.js、templates/fragments/think.{behavior,output}.md、README 双份、CLAUDE.md、package.json) 逐锚点验证。

## Verdict

**pass**

无 HIGH/MED 缺陷。两条 LOW 均不影响执行可行性与覆盖完整性。

## Findings

### LOW-1 PLAN-TASK-007 的 "逐字修改" 超出 spec 实际提供的精度
- 位置: 07-plan.md PLAN-TASK-007 Steps 第 2 条 ("按 spec 六处计数 + 两行表格行 + CLAUDE.md 段落逐字修改")
- 问题: spec v3 只对六处计数措辞给出精确旧文/新文 (W6 + SPEC-TEST 上下文), 但对两行 README 表格行 (EN/CN 的 Purpose 列文案) 与 CLAUDE.md "Skill runtime stores" 段的新文本没有逐字定稿 (design 阶段 SPEC Handoff 第 5 条要求 "逐字新文本", spec 未完全兑现, 属上游继承缺口而非 plan 引入)。实现 subagent 需自行组织这两处措辞。
- 证据: 06-spec.md W6 仅写 "表末追加" 与 "加 `xsk-execute-plan` 与 `.xsk/runs/`", 无围栏块定稿; 全 spec 无 README 表格行/CLAUDE.md 段的 verbatim 文本。
- 缓解已在计划内: 表格行不受任何测试字面保护 (baseline/readme-pinning 仅查 heading 与 token, 已核 test/baseline.test.js、test/readme-pinning.test.js 全文), TASK-007 自查 + TASK-008 人工对照 AC-006 兜底; 措辞可从 SPEC-CONFIG-001 description 派生。不会导致执行失败, 判 LOW。

### LOW-2 PLAN-TASK-003 未显式声明依赖
- 位置: 07-plan.md PLAN-TASK-003 Steps
- 问题: 计划头部宣称 001->008 严格链式依赖, 002/004/005/006/007/008 均在 Steps 中显式写 "依赖 PLAN-TASK-xxx", 唯独 003 缺失该声明。技术上 003 (think fragment 编辑) 不依赖 002 的产物, 顺序由头部链保证, 语义无歧义, 仅为文档不一致。判 LOW。

其余维度未发现缺陷。

## Coverage Check

| SPEC id | PLAN-TASK | 核验结论 |
|---|---|---|
| SPEC-BEHAVIOR-001 (purpose 全文) | 002 | 覆盖; Files 含 execute-plan.purpose.md, Skeleton 指向 spec 围栏块逐字落盘 |
| SPEC-BEHAVIOR-002 (triggers 全文) | 002 | 覆盖; 验证 grep 'explicitly invoked only' 与定稿文本一致 |
| SPEC-BEHAVIOR-003 (behavior 七步) | 002 | 覆盖; 验证 grep 'at most 2 rounds' 与定稿文本一致 |
| SPEC-BEHAVIOR-004 (output 全文) | 002 | 覆盖 |
| SPEC-BEHAVIOR-005 (think.behavior 第 6 步 diff) | 003 | 覆盖; 旧文与 templates/fragments/think.behavior.md:15 逐字一致 (已核源码) |
| SPEC-BEHAVIOR-006 (think.output diff) | 003 | 覆盖; 旧末行与 templates/fragments/think.output.md:9 逐字一致 (已核源码) |
| SPEC-CONFIG-001 (注册表条目) | 001 (条目) + 007 (计数文档面) | 覆盖; 条目逐字复制自 spec, 插入位置 (xsk-check 后) 与 lib/skills.js 现状 (8 条目, 末条 xsk-check) 一致 |
| SPEC-DATA-001 (ledger 契约) | 002 | 覆盖; 内嵌于 BEHAVIOR-003 围栏块, 无独立文件 |
| SPEC-GEN-001 (再生成 4 文件) | 004 (execute-plan 2 文件) + 005 (think 2 文件) + 008 (终门复核) | 覆盖; 拆分与 golden.test 全量比对语义匹配 (见 Ordering Check) |
| SPEC-TEST-001 (generator :69/:73) | 006 | 覆盖; 源码核验: :69 标题 "all eight skills"、:73 八名排序名单, 插入位 (consume-point 与 point 之间) 正确 |
| SPEC-TEST-002 (install :1296/:1323-1326) | 006 | 覆盖; 源码核验: :1296 标题、:1323-1326 计数 8/7/7/7 与消息, 且全文件仅此一处计数硬编码 (grep 全文件确认) |
| SPEC-TEST-003 (self-conformance 必含数组) | 006 | 覆盖; 必含数组实际在 :150-161, 'skills/consume-point/SKILL.md' 在 :160, 与 "行号漂移以内容匹配为准" 约定兼容 |
| SPEC-TEST-004 (skill-behavior 新块 + think 两断言) | 006 | 覆盖; think 块 :55-63 已核, 新块 18 条断言正则均能在 SPEC-BEHAVIOR-001..004 定稿文本中逐字命中 (抽核 explicitly invoked only / never self-triggers / at most 2 rounds / never overwrite an existing \`.xsk/.gitignore\` / Do not commit, push 等) |
| W6 文档同步 | 007 | 覆盖; README 双份 15/21/65 行锚点与 EN "six original" 均已对源码核验; CLAUDE.md "Skill runtime stores" 段在 :69-71 |
| 过程门 C1/C2/C3/C4 | 005/006/007/008 | 覆盖; 与 spec 过程门表命令逐字一致, 006 额外补跑 install+self-conformance (超出 spec C2, 属加强) |
| AC-001..007 | 008 | 覆盖; AC-006 无测试保护已如实声明并安排人工核对 |
| SCOPE-IN-001..010 | 001/002/003/004+005/006/007/008 | 十条全部有归属任务且逐条标注关闭 |

无 spec 内容失落。Trace 表与各任务 Spec References 一致。

## Ordering Check

依赖链 001->002->003->004->005->006->007->008 成立:

- (a) **C1 位置正确, golden.test 源码依据充分。** test/golden.test.js 五个测试全部 `for (const skill of skills)` 遍历注册表:
  - `:40-47` "masked shell matches the committed golden fixture per skill": `assert.ok(fs.existsSync(fixturePath))` — 001 落地注册表条目后, xsk-execute-plan 的 fixture 缺失即红, 直到 004。
  - `:64-79` "committed skills/<base>/SKILL.md matches buildSkill output": `assert.strictEqual(onDisk, buildSkill(skill).content)` — 003 改动 think 两 fragment 后, `skills/think/SKILL.md` 与 `test/fixtures/golden/xsk-think.md` 即刻过期 (报 "xsk-think: skills/think/SKILL.md is stale"), 直到 005 再生成。
  - 因此 004 完成时跑 C1 必红 (think 未再生成), C1 只能落在 005 之后。计划把 C1 放在 005 的 Verification 且在 004 中显式说明原因, 正确。
  - 005 依赖 004 也是必要的: C1 遍历含 xsk-execute-plan, 其 packed+golden (004 产物) 必须先存在。
- (b) **006 断言跑在再生成产物上, 成立。** 006 依赖 005; 此时 C1 已锁定 fragment 与 packed/golden 字节同步, generator/skill-behavior 断言 (基于 buildSkill 实时构建) 与已提交产物等价; install.test 走注册表动态安装 (9 条目), self-conformance 的 pack 测试需要 `skills/execute-plan/SKILL.md` 已提交 (004 产物) 且必含数组已更新 (006 本任务)。006 在 004/005 之后是硬性前置, 计划满足。
- 006 在 007 之前可全绿: self-conformance/baseline/readme-pinning 对 README 只查 heading 行与 token (已核三文件全文), 007 的计数与表格行改动不在其保护面内, 故 006 的两条 node --test 命令不受 README 未更新影响。
- spec 顺序约束逐条满足: W2 先于 W4/W5 (002->004->...->006); W3 先于 W4 的 think 再生成 (003->005); W4 先于 W5 的 C2 (005->006)。
- 附注 (非缺陷): 中间态声明 "到 006 完成前全量 npm test 预期红" 偏保守 — 006 完成后全量即可能已绿 (README 计数无测试), 007 的 C3 实为确认门。保守声明不构成诚实性问题。

## Boundary Check

八任务 Files 并集 (17 文件) 与 04-risk-discovery.md Boundaries 允许全集逐一对照:

| Boundaries 条目 | 归属任务 |
|---|---|
| lib/skills.js | 001 |
| templates/fragments/execute-plan.{purpose,triggers,behavior,output}.md (4) | 002 |
| templates/fragments/think.behavior.md、think.output.md | 003 |
| skills/execute-plan/SKILL.md、test/fixtures/golden/xsk-execute-plan.md | 004 |
| skills/think/SKILL.md、test/fixtures/golden/xsk-think.md | 005 |
| test/generator.test.js、test/install.test.js、test/self-conformance.test.js、test/skill-behavior.test.js | 006 |
| README.md、README.zh-CN.md、CLAUDE.md | 007 |

结论: **不多不少, 恰好等于 Boundaries 全集**; 008 为 n/a (只读)。禁触文件 (`bin/`、`lib/` 其余、`shared/skill-common.md`、`templates/skill.md.tmpl`、其他技能 fragment/packed/golden、`package.json`) 未出现在任何任务 Files 中。任务间文件集两两不相交 (逐对核验)。

## Verification Executability

逐任务核验 (仓库根为 cwd):

- **001**: `npm run syntaxcheck` 存在 (package.json scripts 已由 self-conformance 断言); node -e get 片段语法正确, 001 落地后输出恰为 `claude,codex,opencode,gemini execute-plan`。可执行, 判据客观。
- **002**: node -e buildSkill 片段所需依赖 (lib/generator、templates/skill.md.tmpl、shared/skill-common.md、注册表条目、四 fragment) 在 001+002 后齐备; 双引号内正则与单引号错误消息无 shell 转义问题。两条 grep -l 的目标短语均逐字存在于 spec 定稿文本 ("is explicitly invoked only"、"at most 2 rounds by default")。可执行。
- **003**: 三段 grep 链 (`&&` 接 `! grep -rn`) 在 zsh/bash 下合法; 两个正向短语逐字在 SPEC-BEHAVIOR-005/006 新文中; `Approved Design Summary` 现存 fragments 无命中 (退出码 1 经 `!` 反转为成功)。可执行。
- **004**: `test -s` x2 + `grep -c '<SHARED_MASKED>'` 输出 1, 与 golden 掩蔽格式 (SENTINEL 恰一次, golden.test:49-62 同语义) 一致。可执行。
- **005**: `node --test test/golden.test.js` 此刻九技能全部同步, 预期全绿 (推理见 Ordering Check)。可执行。
- **006**: 两条 `node --test` 多文件用法合法 (node:test 支持多文件参数); self-conformance 内部 `npm pack --dry-run --json` 离线可跑 (自带临时 npm cache)。四文件在此刻全绿的前置条件 (fragment 齐备、产物同步、计数 9/8/8/8、必含路径存在) 均满足。可执行。
- **007**: `npm test` 即 package.json test script, C3 判据客观 (pass 计数 + 零失败)。可执行。
- **008**: 三命令均为仓库既有命令; `npm pack --dry-run` 文件列表含 skills/ 整目录 (package.json files 已核: `["bin/","lib/","skills/",...]`), `skills/execute-plan/SKILL.md` 必在列表。可执行。AC-006 人工核对已显式声明为主观项并给出六处 + 表格行清单, 无伪装成自动验证。

无占位命令; 001-005 各自声明全量 suite 预期红且不以全绿为判据, 与计划头部中间态声明一致, 无任务谎称全绿。无 TBD/未决歧义/hedging 措辞 (TASK-002 的 "若确需微调措辞必须同步改断言并记录" 是受控逃生门, 与 spec Test Matrix 不变式一致, 不属 hedging)。
