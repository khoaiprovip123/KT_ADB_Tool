import { Component, ErrorInfo, ReactNode } from 'react'
import { AlertTriangle, RefreshCcw } from 'lucide-react'

interface Props {
  children?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo)
  }

  private handleReload = () => {
    this.setState({ hasError: false, error: null })
    window.location.reload()
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center p-8 bg-slate-50 h-full w-full relative z-50">
          <div className="bg-white p-8 rounded-3xl shadow-xl shadow-red-900/10 border border-red-100 max-w-md w-full text-center">
            <div className="w-16 h-16 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <AlertTriangle size={32} />
            </div>
            <h2 className="text-xl font-bold text-slate-800 mb-2">Đã xảy ra lỗi nghiêm trọng</h2>
            <p className="text-sm text-slate-500 mb-6 line-clamp-3">
              {this.state.error?.message || 'Không thể render Component này.'}
            </p>
            <button
              onClick={this.handleReload}
              className="flex items-center justify-center gap-2 w-full px-6 py-3 bg-red-600 text-white rounded-xl text-sm font-bold uppercase tracking-widest hover:bg-red-700 shadow-lg shadow-red-600/20 active:scale-95 transition-all"
            >
              <RefreshCcw size={18} />
              Tải lại trang
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
