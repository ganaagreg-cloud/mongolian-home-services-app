'use client'

import { Component, type ErrorInfo, type ReactNode } from 'react'
import { AlertTriangle } from 'lucide-react'

interface Props { children: ReactNode }
interface State { hasError: boolean }

export class AppErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[AppErrorBoundary]', error, info.componentStack)
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="mx-auto max-w-[390px] flex min-h-screen flex-col items-center justify-center bg-background px-6">
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive/10">
              <AlertTriangle className="h-8 w-8 text-destructive" />
            </div>
            <h1 className="text-xl font-bold text-foreground">Алдаа гарлаа</h1>
            <p className="text-sm text-muted-foreground">
              Аппликейшн ачааллахад алдаа гарлаа. Дахин оролдоно уу.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="mt-2 h-14 w-full rounded-2xl bg-primary text-base font-semibold text-primary-foreground shadow-md active:scale-95 transition-all"
            >
              Дахин ачаалах
            </button>
          </div>
        </main>
      )
    }
    return this.props.children
  }
}
