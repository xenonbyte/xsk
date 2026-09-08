<div align="center">

# xsk

*精选一小组 agent skill，以 manifest 记录作为安全保障，安装到 Claude Code、Codex、opencode 与 Gemini*

[![npm version](https://img.shields.io/npm/v/@xenonbyte/xsk?style=flat-square)](https://www.npmjs.com/package/@xenonbyte/xsk)
[![Node](https://img.shields.io/badge/node->=20-3c873a?style=flat-square)](https://nodejs.org/)
[![Runtime deps](https://img.shields.io/badge/runtime%20deps-0-brightgreen?style=flat-square)](package.json)
[![License](https://img.shields.io/badge/License-MIT-blue?style=flat-square)](LICENSE)

[Features](#features) • [Installation](#installation) • [Usage](#usage) • [Skills](#skills) • [How it works](#how-it-works) • [Safety](#safety)

[English](README.md) | **简体中文**

</div>

跨多个 AI coding agent 工作时有两类反复出现的摩擦：第三方 skill 包要么全装要么不装（all-or-nothing），自写的 skill 又散落各处，缺少统一的安装、manifest 与安全方案。

`xsk`（`@xenonbyte/xsk`）同时解决这两点。它内置九个精选 skill（两个从第三方蒸馏而来，七个原创），以及一个零依赖 CLI，把每个 skill 安装到所有受支持平台的 skill 目录，并精确记录它创建了哪些文件，使 `uninstall` 只移除这些文件，绝不多删。

`xsk` 本身就是一个 agent-skill 项目，并符合它自己的 scaffold skill 所执行的同一套标准。

## Features

- **九个精选 skill**，不是全装或不装的整包，可全部安装，也可按平台挑选。
- **四个平台，同一形态。** Claude Code、Codex、opencode 与 Gemini 共用 `<name>/SKILL.md` 布局；opencode 还额外获得可直接调用的 `/xsk-<name>` 命令。
- **manifest 为后盾的安全。** owned-only removal、ownership markers、atomic writes、symlink refusal，以及 content-hash 漂移检测。
- **uninstall-first 安装。** 重装会先重置此前 owned 的文件（清理已不再安装的 skill）再生成，无需手动 `uninstall`。
- **绝不覆盖用户改动。** 被改过的 owned 文件会被拒绝并回滚，而不会被覆盖。
- **零运行时依赖。** 纯 Node.js（>= 20），CommonJS，无构建步骤。

## Installation

```sh
npm install -g @xenonbyte/xsk
```

> [!IMPORTANT]
> 要求 macOS 或 Linux 上的 Node >= 20。

## Usage

```sh
xsk install                       # 把所有 skill 安装到所有平台
xsk install --platform claude,codex
xsk status                        # 只读：查看每个平台已安装的内容
xsk status --json
xsk uninstall                     # 只移除 xsk 创建的内容
xsk doctor                        # 探测环境与 manifest 健康状况
xsk version
xsk help
```

执行 `xsk install` 后，`xsk status` 会按平台分别报告：

```
claude: ok (9 skills) v0.3.0
codex: ok (8 skills) v0.3.0
opencode: ok (8 skills) v0.3.0
gemini: ok (8 skills) v0.3.0
```

非 Claude 平台显示 8 个，是因为 `xsk-bypass-claude` 仅面向 Claude，在其余平台会被跳过。

`xsk doctor` 检查的是环境而非安装结果，每项探测一行：

```
[PASS] Node >= 20 - running Node 24.8.0
[PASS] ~/.xsk writable - writable or creatable
[PASS] claude skill dir writable - writable or creatable
[PASS] manifests valid - 4 manifest(s) valid
doctor: all checks passed
```

装好的 skill 归 agent 所有，而不归 `xsk`：没有 `xsk run` 这样的命令。在 Claude Code 与 opencode 中，每个 skill 都可直接作为 `/xsk-<name>` 调用；每个 skill 同时声明了自己的 triggers，因此 agent 也可以按意图自行采用。

## Commands

| Command | Purpose |
|---|---|
| `version`（亦作 `--version` / `-v`） | 打印 package version。 |
| `help`（亦作 `--help` / `-h`，无参数时同样触发） | 打印用户命令清单。 |
| `install [--platform <list>]` | 生成并安装 skill，默认 uninstall-first：重装会先重置此前 owned 的文件（清理已不再安装的 skill）再生成，无需手动 `uninstall`；用户改过的 owned 文件仍会被拒绝并回滚。`--platform` 以逗号分隔，缺省为全部四个平台；未知或重复的值会被拒绝。 |
| `uninstall [--platform <list>]` | 仅移除 manifest 记录的生成文件。 |
| `status [--json]` | 每个平台的只读报告：`ok`、`drift` 或 `invalid`。校验 manifest 形状，而非仅判断能否解析。 |
| `doctor [--json]` | 对 Node 版本、目标目录可写性、manifest 有效性做只读探测；逐项给出 pass/fail，不声明任何能力。 |

未知选项会 fail loud 并以非零码退出。

## Skills

共九个 skill，统一前缀 `xsk-`：

| Skill | Purpose |
|---|---|
| `xsk-think` | 把粗略想法变成深度适当、decision-complete 的 plan，附验收方式和具体的下一步选项。蒸馏自 Waza `/think`。 |
| `xsk-bypass-claude` | 通过写 `.claude/settings.local.json` 把当前项目设为 Claude Code bypass-permissions 模式。仅 Claude。 |
| `xsk-skill-scaffold` | 把一个 agent-skill 项目带到 `xsk` 标准；若不是这类项目则拒绝。 |
| `xsk-write-req` | 把白话需求转成 `.xsk/requirements/` 下合规的需求文档，并扎根于当前项目。 |
| `xsk-execute-req` | 实施 active requirement 或明确选择交给本技能的 think 方案，完成验证和审查后自动归档。think 的内联执行仍在正常对话中进行。 |
| `xsk-archive-req` | 把当前 active 需求文档归档到 `.xsk/requirements/archive/`。 |
| `xsk-check` | 在改动合入前评审：范围漂移、共同根因、有证据支持的发现项，以及对当前审查状态的验证。蒸馏自 Waza `/check`。 |
| `xsk-point` | 把当前项目某一方面研究到 decision-complete 的落地方案，并作为 point 文档持久化到 `.xsk/points/`。 |
| `xsk-consume-point` | 通过 `xsk-write-req` 把选定的 `.xsk/points/` 文档折叠进一份 `.xsk/requirements/` 文档，以 write-before-remove 方式归档已消费的 point。 |

> [!NOTE]
> `xsk-bypass-claude` 仅面向 Claude Code；`xsk install` 会在其余三个平台跳过它。

### Choosing a skill

- 方案或重要决策尚未确定时使用 `xsk-think`。就绪后提供执行或调整选项，可用编号或自然语言选择。简单修改在正常对话中实施，不强制建文档；完整复杂需求直接推荐 `xsk-execute-req`，执行选项明确包含保存需求、实现、验证和成功后自动归档。think 在选择前保持 planning-only；未决问题和无需修改的判断不展示执行入口。
- 只想保存需求、暂不实施时使用 `xsk-write-req`。所有形态都包含 Goal、Scope、Acceptance；允许按依赖分批实现，但不删减用户要求的范围。独立生成完成后提供执行或调整选项。
- `xsk-execute-req` 接受 active requirement 或明确选择了需求执行路线的 think 方案。选择 inline/direct 的小任务仍在正常对话中实施，即使已有 active requirement 也不改道。需求执行路线的方案由内部 writer 保存，随后实现、验证、交给 `xsk-check` 审查，并在成功后自动归档。一份需求包含精简的 `Execution` 段，默认没有独立 PLAN 或运行台账；复用已有决策和有效验证。已有未提交修改、非 Git 项目和没有子代理均不阻止进入执行。
- 持久化研究使用 `xsk-point` 保存证据和已确认的 ready 结论，再选择 `xsk-consume-point` 通过 writer 整合。consume 先预检整个批次，每次修改 point 前重新核对 source 和 archive target，新归档不得覆盖已有目标。检测到变化时保留已保存的需求，停止消费并协调差异；完成 point 归档后才交接执行。部分采纳保留剩余内容，稳定的 requirement slug 保证归档后来源关系仍可解析。
- `xsk-check` 审查已有代码、配置、生成物和影响行为的技能指令。独立审查保持只读；明确的实现或修复请求覆盖范围内已确认问题。依据实际 Git diff 或非 Git 文件及验收证据审查，复用有效结果，避免重复检查。
- 当前必要验收和审查都通过才算执行完成。未完成工作保持 active 并记录剩余项；实现已验证而归档失败时保留证据，核对当前状态后只补做未完成的归档。`xsk-archive-req` 也支持显式手动归档取消或被替代的需求，archived 状态本身不是实现完成的证明。
- 内部 writer、checker、archiver 完成后返回调用者，不插入额外审批菜单、递归执行或提交询问。选择执行授权的是已说明的流程，不包含 Git 提交、真实安装、推送或发布。`.xsk/requirements/archive/` 和 `.xsk/points/archive/` 默认为本机忽略记录，已跟踪文件除外；归档不会自动提交，也不保证新 clone 能恢复。

## How it works

skill 是生成出来的，不是复制来的。每个 skill 由一条注册表条目加四份散文片段（purpose、triggers、behavior、output）构成，生成器把它们连同一份共享正文渲染成单一的、平台中立的 `SKILL.md`。同一份来源产出四个平台完全相同的 skill，因此它们不会各自漂移。

安装时，这份 `SKILL.md` 被写入每个所选平台的 skill 目录，旁边放置一个 `.xsk-owned` 标记，并把创建的每个路径连同各文件的 content hash 记录进 `~/.xsk/` 下按平台划分的 manifest。

其余的安全性都建立在这份 manifest 之上。`uninstall` 只移除记录在案且标记仍有效的路径。`status` 会重新计算各文件的哈希，一旦与 `xsk` 写入时不符就报告 `drift`：用户改动正是这样被识别并保留，而不是被覆盖。

## Platforms

四个平台均为 full，并使用同一种 `<name>/SKILL.md` skill-directory 形态。

| Platform | Install location |
|---|---|
| Claude Code | `~/.claude/skills/<name>/SKILL.md` |
| Codex | `~/.agents/skills/<name>/SKILL.md` |
| opencode | `~/.config/opencode/skills/<name>/SKILL.md`（skill）和 `~/.config/opencode/commands/xsk-<name>.md`（command） |
| Gemini | `~/.gemini/skills/<name>/SKILL.md` |

对于 opencode，`xsk install` 会为每个已安装的 skill 同时写入 skill 目录条目和平坦的 `commands/xsk-<name>.md` 命令文件，使每个 skill 都可作为 opencode `/xsk-<name>` 命令直接调用。skill 与命令文件均由 manifest 跟踪，卸载时一并移除。

平台行为依据各平台官方文档校验，校验日期为 2026-06-25。

## Discovery aliases and duplicate skills

opencode 除了自己的 `~/.config/opencode/skills/<name>/SKILL.md`，也会读取 `~/.claude/skills/<name>/SKILL.md` 与 `~/.agents/skills/<name>/SKILL.md`。Gemini 也会把 `~/.agents/skills/<name>/SKILL.md` 当作 `~/.gemini/skills/<name>/SKILL.md` 的 alias 一并发现。

因为这些 alias 具有 cross-platform visibility，一个放进可读 alias 目录的 skill 也可能被另一个 agent 发现。`xsk` 仍然会按所选平台各写入一份由 manifest 跟踪的 owned 副本，因此即使别的平台也能看见 alias 副本，每个平台自己的副本依然可以 independently uninstallable。

`xsk-bypass-claude` 仍然是 Claude Code-only。若别的 agent 通过 alias 发现它，skill body 会在 Claude Code 之外直接 refuse，或 inertly stop，而不会执行 Claude 专属行为。

## Safety

> [!WARNING]
> 向用户 home 配置目录写入若不小心具有破坏性。`xsk` 以 manifest 为后盾，使每次写入都是 owned 且可逆的。

- **Owned-only removal。** uninstall 只移除 manifest 记录的路径。
- **Ownership markers。** 每个已安装 skill 目录内有 `.xsk-owned` 标记，目录移除需先校验该标记。
- **No symlink traversal or removal。** `xsk` 遇到 symlink 会拒绝。
- **Atomic writes。** 每个文件先写入临时同目录文件，再 rename 就位；写入失败时恢复原文件。
- **User edits preserved。** 若生成的文件被用户修改，uninstall 会保留它、报告 partial，并收窄保留的 manifest，使后续可继续完成。

`xsk` 只在 `~/.xsk/`、四个平台 skill 目录，以及 opencode 的 `~/.config/opencode/commands/` command 目录下写入。

## Development

```sh
npm test            # 完整 node:test 套件
npm run syntaxcheck # 对 bin/、lib/、test/ 下每个文件执行 node --check
npm pack --dry-run  # 校验 package 内容
```

没有构建步骤，也没有 linter：测试套件就是门禁。`skills/` 下的 skill 与其 golden fixture 都是生成产物，请修改 `templates/fragments/` 中的片段后重新生成，而不要直接编辑它们。

---

基于 MIT 许可证发布。见 [LICENSE](LICENSE)。
