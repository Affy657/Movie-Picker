import { Component, type ErrorInfo, type ReactNode } from 'react';
import ServerErrorPage from '@/shared/components/ServerErrorPage';
import { captureException } from '@/shared/observability/sentry';
import { isChunkLoadError, reloadForFreshBuild } from '@/shared/pwa/staleBuildReload';

type Props = {
  children: ReactNode;
};

type State = {
  hasError: boolean;
  error: Error | null;
};

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[ErrorBoundary]', error, info.componentStack);
    captureException(error, info.componentStack ?? undefined);
  }

  private readonly retry = (): void => {
    if (isChunkLoadError(this.state.error)) {
      reloadForFreshBuild();
      return;
    }
    this.setState({ hasError: false, error: null });
  };

  render(): ReactNode {
    if (this.state.hasError && this.state.error) {
      return <ServerErrorPage error={this.state.error} onRetry={this.retry} />;
    }

    return this.props.children;
  }
}
