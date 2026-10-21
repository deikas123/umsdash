import { Component, ReactNode } from "react";

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Catches lazy-loaded chunk import failures (typical after a fresh deploy
 * when the browser still holds a stale index.html referencing old chunk
 * hashes). On the first occurrence we hard-reload once so the browser picks
 * up the new index.html. On subsequent failures we render a friendly retry
 * screen instead of a blank page.
 */
export default class ChunkErrorBoundary extends Component<
  { children: ReactNode },
  State
> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error) {
    console.error('[ChunkErrorBoundary] caught:', error);
    const message = error?.message || "";
    const isChunkError =
      /Loading chunk [\d]+ failed/i.test(message) ||
      /Failed to fetch dynamically imported module/i.test(message) ||
      /Importing a module script failed/i.test(message) ||
      error?.name === "ChunkLoadError";

    if (isChunkError && typeof window !== "undefined") {
      const key = "__chunk_reload_attempted__";
      if (!sessionStorage.getItem(key)) {
        sessionStorage.setItem(key, "1");
        window.location.reload();
      }
    }
  }

  handleReload = () => {
    sessionStorage.removeItem("__chunk_reload_attempted__");
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-background p-6 text-center">
          <h1 className="text-lg font-medium text-foreground">
            This page couldn't load
          </h1>
          <p className="mt-2 max-w-sm text-sm text-muted-foreground">
            A newer version of the app is available. Please reload to
            continue.
          </p>
          {this.state.error && (
            <pre className="mt-4 max-w-xl rounded bg-muted p-3 text-left text-xs text-destructive overflow-auto">
              {this.state.error.name}: {this.state.error.message}
              {'\n'}{this.state.error.stack}
            </pre>
          )}
          <button
            onClick={this.handleReload}
            className="mt-5 rounded-[4px] bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
