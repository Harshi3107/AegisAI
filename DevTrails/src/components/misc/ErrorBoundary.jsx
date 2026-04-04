import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    console.error('ErrorBoundary caught an error', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen p-8 bg-red-50 text-red-900">
          <h1 className="text-3xl font-bold mb-4">Something broke</h1>
          <p className="mb-2">An error occurred while rendering the app.</p>
          <pre className="whitespace-pre-wrap bg-white p-4 rounded-lg border border-red-200">{this.state.error?.toString()}</pre>
          <pre className="whitespace-pre-wrap bg-white p-4 rounded-lg border border-red-200 mt-4">{this.state.errorInfo?.componentStack}</pre>
        </div>
      );
    }

    return this.props.children;
  }
}
