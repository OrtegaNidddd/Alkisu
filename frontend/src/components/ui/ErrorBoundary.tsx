import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from './Button';

interface Props {
  children: ReactNode;
  fallbackMessage?: string;
  resetKey?: any;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary capturó un error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  public componentDidUpdate(prevProps: Props) {
    if (this.state.hasError && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ hasError: false, error: null, errorInfo: null });
    }
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 max-w-lg mx-auto my-12 bg-white rounded-2xl border border-[#f9c5c0] shadow-sm text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-[#FDECEA] text-[#B42318] mx-auto flex items-center justify-center">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-serif text-lg font-bold text-[#17201D]">
              Ocurrió un problema en esta vista
            </h3>
            <p className="text-xs text-[#66736D] mt-1 font-mono break-words">
              {this.state.error?.name}: {this.state.error?.message ||
                this.props.fallbackMessage ||
                'Hubo un error inesperado al renderizar el componente.'}
            </p>
            {this.state.error?.stack && (
              <pre className="text-left text-[10px] bg-red-50 text-red-800 p-2 mt-2 rounded border border-red-200 overflow-auto max-h-40 font-mono whitespace-pre-wrap">
                {this.state.error.stack}
              </pre>
            )}
          </div>
          <div className="pt-2 flex justify-center space-x-2">
            <Button size="sm" variant="outline" onClick={() => window.location.reload()}>
              <RefreshCw className="w-3.5 h-3.5 mr-1" />
              Recargar Página
            </Button>
            <Button size="sm" variant="primary" onClick={this.handleReset}>
              Reintentar
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

