#!/usr/bin/env bash
# 局域网启动/停止/查看 CARFLEET 开发服务
# 用法：
#   ./scripts/dev-lan.sh start    # 后台启动（0.0.0.0:5173）
#   ./scripts/dev-lan.sh stop     # 停止
#   ./scripts/dev-lan.sh status   # 看状态 + 访问地址
#   ./scripts/dev-lan.sh log      # 跟随日志
#   ./scripts/dev-lan.sh restart
set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT" || exit 1

PORT=5173
LOG_DIR="$ROOT/.runtime"
LOG="$LOG_DIR/dev.log"
PID_FILE="$LOG_DIR/dev.pid"
mkdir -p "$LOG_DIR"

lan_ip() {
  ip -4 addr show 2>/dev/null | awk '/inet /{print $2}' | cut -d/ -f1 \
    | grep -vE '^(127\.|172\.1[7-9]\.|172\.2|172\.3|192\.168\.(19|99)\.)' | head -1
}

is_running() {
  [[ -f "$PID_FILE" ]] || return 1
  local pid
  pid="$(cat "$PID_FILE" 2>/dev/null)"
  [[ -n "${pid}" ]] && kill -0 "$pid" 2>/dev/null
}

port_busy() {
  ss -ltn 2>/dev/null | grep -q ":$PORT "
}

start() {
  if is_running; then
    echo "已在运行（pid $(cat "$PID_FILE")）：http://$(lan_ip):$PORT/"
    return 0
  fi
  if port_busy; then
    echo "端口 $PORT 被占用，但 pid 文件不匹配。先执行：./scripts/dev-lan.sh stop" >&2
    ss -ltnp 2>/dev/null | grep ":$PORT " >&2
    return 1
  fi
  echo "启动中…"
  nohup npx vite --host 0.0.0.0 --port "$PORT" --strictPort >>"$LOG" 2>&1 &
  echo $! >"$PID_FILE"
  for _ in $(seq 1 60); do
    if port_busy; then
      echo "已启动：本机 http://127.0.0.1:$PORT/  局域网 http://$(lan_ip):$PORT/"
      echo "日志：$LOG"
      return 0
    fi
    sleep 0.5
  done
  echo "启动超时，看日志：$LOG" >&2
  tail -n 20 "$LOG" >&2
  return 1
}

stop() {
  if [[ -f "$PID_FILE" ]]; then
    local pid
    pid="$(cat "$PID_FILE")"
    kill "$pid" 2>/dev/null
    for _ in $(seq 1 20); do
      kill -0 "$pid" 2>/dev/null || break
      sleep 0.3
    done
    kill -9 "$pid" 2>/dev/null
    rm -f "$PID_FILE"
  fi
  if port_busy; then
    echo "端口 $PORT 仍被占用：" >&2
    ss -ltnp 2>/dev/null | grep ":$PORT " >&2
    echo "如果进不到进程，重启电脑或换端口（./scripts/dev-lan.sh start 前改 PORT）。" >&2
    return 1
  fi
  echo "已停止"
}

http_ok() {
  curl -s -o /dev/null --max-time 2 "http://127.0.0.1:$PORT/" 2>/dev/null
}

status() {
  if is_running; then
    echo "运行中（pid $(cat "$PID_FILE")）"
    echo "  本机    http://127.0.0.1:$PORT/"
    echo "  局域网  http://$(lan_ip):$PORT/"
    curl -s -o /dev/null -w "  HTTP %{http_code}（%{time_total}s）\n" "http://127.0.0.1:$PORT/" || true
  elif http_ok; then
    echo "运行中（非本脚本启动的进程，pid 文件缺失）"
    echo "  本机    http://127.0.0.1:$PORT/"
    echo "  局域网  http://$(lan_ip):$PORT/"
    ss -ltnp 2>/dev/null | grep ":$PORT " || true
  else
    echo "未运行"
    port_busy && echo "注意：端口 $PORT 有监听但没有响应，先 stop 或换端口"
    return 1
  fi
}

case "${1:-status}" in
  start) start ;;
  stop) stop ;;
  restart) stop; start ;;
  status) status ;;
  log) tail -f "$LOG" ;;
  *) echo "用法: $0 {start|stop|restart|status|log}" >&2; exit 1 ;;
esac
