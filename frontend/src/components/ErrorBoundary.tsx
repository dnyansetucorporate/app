import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('App Error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  reset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-red-50">
          <div className="text-center max-w-md mx-auto p-6">
            <AlertTriangle className="mx-auto h-16 w-16 text-red-600 mb-4" />
            <h1 className="text-2xl font-bold text-red-900 mb-2">Something went wrong</h1>
            <p className="text-red-700 mb-4 text-sm">{this.state.error?.message}</p>
            {import.meta.env.DEV && this.state.errorInfo && (
              <details className="mt-4 text-left">
                <summary className="cursor-pointer text-sm text-red-600 font-semibold">
                  Error Details (Dev Only)
                </summary>
                <pre className="mt-2 text-xs bg-red-100 p-2 rounded overflow-auto max-h-48 text-red-900">
                  {this.state.errorInfo.componentStack}
                </pre>
              </details>
            )}
            <button
              onClick={this.reset}
              className="mt-6 bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded font-semibold transition"
            >
              Return to Home
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
