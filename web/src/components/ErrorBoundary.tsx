import { Component, ReactNode, ErrorInfo } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[TIKEXO ErrorBoundary]', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="min-h-screen bg-tikexo-primary flex items-center justify-center p-8">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full text-center shadow-xl">
            <div className="text-4xl mb-4">⚠️</div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Une erreur est survenue</h2>
            <p className="text-gray-500 text-sm mb-6">
              {this.state.error?.message || 'Erreur inattendue. Veuillez recharger la page.'}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="bg-tikexo-primary text-white px-6 py-2 rounded-lg font-medium hover:opacity-90 transition"
            >
              Recharger
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
