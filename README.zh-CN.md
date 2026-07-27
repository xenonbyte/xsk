# xsk

[English](README.md) | **简体中文**

> 精选一小组 agent skill，以 manifest 记录作为安全保障，安装到 Claude Code、Codex、opencode 与 Gemini。

[![Node](https://img.shields.io/badge/node-%3E%3D20-3c873a)](https://nodejs.org/)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue)](LICENSE)
[![Runtime deps](https://img.shields.io/badge/runtime%20deps-0-brightgreen)](package.json)

`xsk`（`@xenonbyte/xsk`）是一个零依赖 CLI，把一组精选的 agent skill 安装到每个受支持的 AI coding agent，并精确记录它创建了哪些文件，使 uninstall 只移除这些文件。

## Overview

跨多个 AI coding agent 工作时有两类反复出现的摩擦：第三方 skill 包要么全装要么不装（all-or-nothing），自写的 skill 又散落各处、缺少统一的安装 / manifest / 安全方案。`xsk` 同时解决这两点。它内置九个精选 skill（两个从第三方蒸馏而来，七个原创），并提供一个 CLI，把每个 skill 安装到所有受支持平台的 skill 目录，再精确记录它创建了哪些文件，使 uninstall 只移除这些文件。

`xsk` 本身就是一个 agent-skill 项目，并符合它自己的 scaffold skill 所执行的同一套标准。

## Features

- **九个精选 skill**，不是全装或不装的整包，可全部安装，也可按平台挑选。
- **四个平台，同一形态。** Claude Code、Codex、opencode 与 Gemini 共用 `<name>/SKILL.md` 布局；opencode 还额外获得可直接调用的 `/xsk-<name>` 命令。
- **manifest 为后盾的安全。** owned-only removal、ownership markers、atomic writes、symlink refusal，以及 content-hash 漂移检测。
- **uninstall-first 安装。** 重装会先重置此前 owned 的文件（清理已不再安装的 skill）再生成，无需手动 `uninstall`。
- **绝不覆盖用户改动。** 被改过的 owned 文件会被拒绝并回滚，而不会被覆盖。
- **零运行时依赖。** 纯 Node.js（>= 20），CommonJS。

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
| `xsk-think` | 把一个粗略想法在写任何代码之前变成 decision-complete 的 plan。蒸馏自 Waza `/think`。 |
| `xsk-bypass-claude` | 通过写 `.claude/settings.local.json` 把当前项目设为 Claude Code bypass-permissions 模式。仅 Claude。 |
| `xsk-skill-scaffold` | 把一个 agent-skill 项目带到 `xsk` 标准；若不是这类项目则拒绝。 |
| `xsk-write-req` | 把白话需求转成 `.xsk/requirements/` 下合规的需求文档，并扎根于当前项目。 |
| `xsk-archive-req` | 把当前 active 需求文档归档到 `.xsk/requirements/archive/`。 |
| `xsk-check` | 在改动合入前评审：范围漂移、hard stops、证据门控的发现项，再验证后签收。蒸馏自 Waza `/check`。 |
| `xsk-point` | 把当前项目某一方面研究到 decision-complete 的落地方案，并作为 point 文档持久化到 `.xsk/points/`。 |
| `xsk-consume-point` | 通过 `xsk-write-req` 把选定的 `.xsk/points/` 文档折叠进一份 `.xsk/requirements/` 文档，以 write-before-remove 方式归档已消费的 point。 |
| `xsk-execute-plan` | 在干净的 Git worktree 中，把一个小型 plan 或需求编排成串行的 context-isolated subagent 任务，记录进精简的 `.xsk/runs/` ledger；只设一个确认门，全部完成后统一验收。仅限显式调用。 |

> [!NOTE]
> `xsk-bypass-claude` 仅面向 Claude Code；`xsk install` 会在其余三个平台跳过它。

### Choosing a skill

- 当方案或重要决策尚未确定时使用 `xsk-think`。plan 达到 decision-complete 后，显式选择：小型、可逆工作直接执行；适合的任务用 `xsk-execute-plan`；或继续调整 plan。`xsk-think` 不会自动调用 executor。
- 仅对 decision-light、context-heavy，且涉及多文件或多步骤、能从 context-isolated subagent 和 run ledger 获益的工作显式调用 `xsk-execute-plan`。它要求 Git worktree 干净，不满足时直接拒绝而不去猜测，因此请先 commit 或 stash。凡是小到可以直接核对的改动（包括单条命令或单文件改动）都应直接执行。
- 大型、高风险或跨会话工作应先用 `xsk-write-req` 建立 durable requirement，再进入项目的 full workflow 后实施。
- 需要持久化研究时，显式采用 `xsk-point` -> `xsk-consume-point` -> `xsk-write-req` 路径。每次转换都由用户选择，skill 不会自动串联。
- 用 `xsk-check` 评审已有 change 或 diff，再合入。implementation 验收通过后，显式调用 `xsk-archive-req` 归档 active requirement。

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

---

基于 MIT 许可证发布。见 [LICENSE](LICENSE)。
