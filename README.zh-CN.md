# xsk

Agent skill aggregator（智能体技能聚合器）。`xsk` 精选了一小组 agent skill，并以 manifest 记录作为安全保障，将它们安装到 Claude Code、Codex、opencode 与 Gemini 四个平台。

Package: `@xenonbyte/xsk` · Binary: `xsk` · Runtime: Node >= 20, CommonJS, 零第三方运行时依赖。

## Overview

跨多个 AI coding agent 工作时有两类反复出现的摩擦：第三方 skill 包要么全装要么不装（all-or-nothing），自写的 skill 又散落各处、缺少统一的安装 / manifest / 安全方案。`xsk` 同时解决这两点。它内置六个精选 skill（两个从第三方蒸馏而来，四个原创），并提供一个 CLI，把每个 skill 安装到所有受支持平台的 skill 目录，再精确记录它创建了哪些文件，使 uninstall 只移除这些文件。

`xsk` 本身就是一个 agent-skill 项目，并符合它自己的 scaffold skill 所执行的同一套标准。

## Installation

```sh
npm install -g @xenonbyte/xsk
```

要求 macOS 或 Linux 上的 Node >= 20。

## Usage

```sh
xsk install                 # 把所有 skill 安装到所有平台
xsk install --platform claude,codex
xsk status                  # 只读：查看每个平台已安装的内容
xsk status --json
xsk uninstall               # 只移除 xsk 创建的内容
xsk doctor                  # 探测环境与 manifest 健康状况
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

共六个 skill，统一前缀 `xsk-`：

| Skill | Purpose |
|---|---|
| `xsk-think` | 把一个粗略想法在写任何代码之前变成 decision-complete 的 plan。蒸馏自 Waza `/think`。 |
| `xsk-bypass-claude` | 通过写 `.claude/settings.local.json` 把当前项目设为 Claude Code bypass-permissions 模式。仅 Claude。 |
| `xsk-skill-scaffold` | 把一个 agent-skill 项目带到 `xsk` 标准；若不是这类项目则拒绝。 |
| `xsk-write-req` | 把白话需求转成 `requirements/` 下合规的需求文档，并扎根于当前项目。 |
| `xsk-archive-req` | 把当前 active 需求文档归档到 `requirements/archive/`。 |
| `xsk-check` | 在改动合入前评审：范围漂移、hard stops、证据门控的发现项，再验证后签收。蒸馏自 Waza `/check`。 |

`xsk-bypass-claude` 仅面向 Claude Code；`xsk install` 会在其余三个平台跳过它。

## Platforms

四个平台均为 full，并使用同一种 `<name>/SKILL.md` skill-directory 形态。

| Platform | Install location |
|---|---|
| Claude Code | `~/.claude/skills/<name>/SKILL.md` |
| Codex | `~/.agents/skills/<name>/SKILL.md` |
| opencode | `~/.config/opencode/skills/<name>/SKILL.md` |
| Gemini | `~/.gemini/skills/<name>/SKILL.md` |

平台行为依据源仓库 `docs/REQUIREMENTS.md` 中链接的官方文档，校验日期为 2026-06-25。

## Safety

向用户 home 配置目录写入若不小心具有破坏性。`xsk` 以 manifest 为后盾：

- Owned-only removal。uninstall 只移除 manifest 记录的路径。
- Ownership markers。每个已安装 skill 目录内有 `.xsk-owned` 标记，目录移除需先校验该标记。
- No symlink traversal or removal。`xsk` 遇到 symlink 会拒绝。
- Atomic writes。每个文件先写入临时同目录文件，再 rename 就位；写入失败时恢复原文件。
- User edits preserved。若生成的文件被用户修改，uninstall 会保留它、报告 partial，并收窄保留的 manifest，使后续可继续完成。

`xsk` 只在 `~/.xsk/` 与四个平台 skill 目录下写入。

## Development

```sh
npm test            # 完整 node:test 套件
npm run syntaxcheck # 对 bin/、lib/、test/ 下每个文件执行 node --check
npm pack --dry-run  # 校验 package 内容
```

完整需求规格见源仓库中的 `docs/REQUIREMENTS.md`。

## License

MIT
