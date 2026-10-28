import { Component, type ErrorInfo, type ReactNode } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  message: string
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: '' }

  static getDerivedStateFromError(error: unknown): State {
    return {
      hasError: true,
      message: error instanceof Error ? error.message : '未知错误',
    }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('CARFLEET render error', error, info)
  }

  render() {
    if (!this.state.hasError) return this.props.children
    return (
      <div className="flex min-h-screen items-center justify-center bg-ink-950 px-6">
        <div className="panel w-full max-w-lg p-6 text-center">
          <div className="mx-auto flex size-12 items-center justify-center rounded-2xl border border-danger/30 bg-danger/10 text-danger">
            <AlertTriangle className="size-5" />
          </div>
          <h1 className="mt-4 text-lg font-semibold text-mist-100">页面渲染出现异常</h1>
          <p className="mt-2 text-xs leading-5 text-mist-400">
            数据仍保存在浏览器本地。可以先刷新页面；如果问题持续，请到数据管理导出备份后清除本地数据恢复。
          </p>
          <pre className="mt-3 max-h-24 overflow-auto rounded-lg border border-line/70 bg-ink-900 p-2 text-left text-[10px] text-mist-500">
            {this.state.message}
          </pre>
          <div className="mt-5 flex justify-center gap-2">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-accent/40 bg-accent px-4 text-xs font-medium text-ink-950"
            >
              <RefreshCw className="size-3.5" /> 刷新页面
            </button>
            <button
              type="button"
              onClick={() => {
                window.location.href = '/'
              }}
              className="inline-flex h-9 items-center rounded-lg border border-line-strong px-4 text-xs text-mist-200"
            >
              返回首页
            </button>
          </div>
        </div>
      </div>
    )
  }
}
