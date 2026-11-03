#!/usr/bin/env bash
# 安装「开机/登录后自动启动 CARFLEET」的守护（systemd user unit 优先，其次 XDG autostart）
# 必须在**你自己的终端**里运行（DSH 沙箱里 ~/.config 是只读的，装不进去）。
#
#   ./scripts/install-autostart.sh                 # 安装，默认用 preview 模式（服务 dist/，更轻更稳）
#   ./scripts/install-autostart.sh --dev           # 用 dev 模式（带热更新，改代码即生效）
#   ./scripts/install-autostart.sh --dry-run       # 只打印要做什么，不落盘
#   ./scripts/install-autostart.sh --uninstall     # 卸载
set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT" || exit 1

PORT="${PORT:-5173}"
MODE="preview"
ACTION="install"
DRY=0
for arg in "$@"; do
  case "$arg" in
    --dev) MODE="dev" ;;
    --preview) MODE="preview" ;;
    --dry-run) DRY=1 ;;
    --uninstall) ACTION="uninstall" ;;
    -h|--help) sed -n '2,10p' "$0"; exit 0 ;;
    *) echo "未知参数：$arg" >&2; exit 1 ;;
  esac
done

if [[ "$ACTION" == "uninstall" && "$MODE" == "dev" ]]; then :; fi
SERVICE="carfleet-${MODE}"
UNIT_DIR="${XDG_CONFIG_HOME:-$HOME/.config}/systemd/user"
AUTOSTART_DIR="${XDG_CONFIG_HOME:-$HOME/.config}/autostart"
NPM="$(command -v npm || echo /usr/bin/npm)"
NODE_BIN_DIR="$(dirname "$(command -v node || echo /usr/bin/node)")"
LOG_DIR="$ROOT/.runtime"
mkdir -p "$LOG_DIR" 2>/dev/null
UNIT="$UNIT_DIR/${SERVICE}.service"
DESKTOP="$AUTOSTART_DIR/${SERVICE}.desktop"

if [[ "$MODE" == "dev" ]]; then
  CMD="$NPM run dev -- --host 0.0.0.0 --port $PORT"
else
  CMD="$NPM run preview -- --host 0.0.0.0 --port $PORT"
fi

if [[ $DRY -eq 1 ]]; then
  UNIT="$LOG_DIR/_dryrun-${SERVICE}.service"
  DESKTOP="$LOG_DIR/_dryrun-${SERVICE}.desktop"
fi

echo "项目：$ROOT"
echo "模式：$MODE（$CMD）"
echo "端口：$PORT"
echo

has_systemd_user() {
  command -v systemctl >/dev/null 2>&1 && systemctl --user show-environment >/dev/null 2>&1
}

write_unit() {
  cat >"$UNIT" <<EOF
[Unit]
Description=CARFLEET 选车工作台（$MODE 模式，端口 $PORT）
After=network-online.target

[Service]
Type=simple
WorkingDirectory=$ROOT
Environment=PATH=$NODE_BIN_DIR:/usr/local/bin:/usr/bin:/bin
ExecStart=$CMD
Restart=always
RestartSec=3
StandardOutput=append:$LOG_DIR/autostart.log
StandardError=append:$LOG_DIR/autostart.log

[Install]
WantedBy=default.target
EOF
}

write_desktop() {
  cat >"$DESKTOP" <<EOF
[Desktop Entry]
Type=Application
Name=CARFLEET 选车工作台
Comment=端口 $PORT 的本地服务
Exec=bash -lc 'cd $ROOT && $CMD >> $LOG_DIR/autostart.log 2>&1'
Terminal=false
X-GNOME-Autostart-enabled=true
EOF
}

if [[ "$ACTION" == "uninstall" ]]; then
  if has_systemd_user; then
    echo "→ systemctl --user disable --now $SERVICE"
    [[ $DRY -eq 1 ]] || systemctl --user disable --now "$SERVICE" 2>/dev/null
  fi
  echo "→ 删除 $UNIT"
  [[ $DRY -eq 1 ]] || rm -f "$UNIT"
  echo "→ 删除 $DESKTOP"
  [[ $DRY -eq 1 ]] || rm -f "$DESKTOP"
  echo "完成。"
  exit 0
fi

if has_systemd_user; then
  echo "检测到 systemd --user，用 user unit 守护（推荐）"
  echo "→ 写入 $UNIT"
  if [[ $DRY -eq 1 ]]; then
    echo "----- unit 内容 -----"; write_unit; cat "$UNIT" 2>/dev/null; echo "---------------------"
  else
    mkdir -p "$UNIT_DIR" && write_unit
    systemctl --user daemon-reload
    systemctl --user enable --now "$SERVICE"
    loginctl enable-linger "$USER" 2>/dev/null || echo "  （if 提示无权限，开机自启需要：sudo loginctl enable-linger $USER）"
    sleep 2
    systemctl --user --no-pager status "$SERVICE" | head -12
  fi
  echo
  echo "访问：http://$(ip -4 addr show 2>/dev/null | awk '/inet /{print $2}' | cut -d/ -f1 | grep -vE '^(127\.|172\.1[7-9]\.|172\.2)' | head -1):$PORT/"
  echo "日志：$LOG_DIR/autostart.log"
  exit 0
fi

echo "没用 systemd --user，退到 XDG autostart（登录桌面后启动）"
echo "→ 写入 $DESKTOP"
if [[ $DRY -eq 1 ]]; then
  echo "----- desktop 内容 -----"; write_desktop; cat "$DESKTOP" 2>/dev/null; echo "------------------------"
else
  mkdir -p "$AUTOSTART_DIR" && write_desktop
  echo "已写入。下次登录桌面会自动启动；现在先手动跑一次："
  echo "  cd $ROOT && $CMD >> $LOG_DIR/autostart.log 2>&1 &"
fi
if [[ "$MODE" == "preview" ]]; then
  echo
  echo "提示：preview 模式服务的是 dist/，改完代码要先 npm run build 才生效。"
fi
