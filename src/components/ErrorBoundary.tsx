import React, { Component, ErrorInfo, ReactNode } from "react";
import { Button } from "./ui/button";
import { AlertTriangle } from "lucide-react";

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null,
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("Uncaught error:", error, errorInfo);
    }

    public render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen flex items-center justify-center p-4 bg-muted/30">
                    <div className="max-w-md w-full bg-card p-8 rounded-2xl border shadow-xl text-center space-y-6">
                        <div className="w-16 h-16 bg-destructive/10 text-destructive rounded-full flex items-center justify-center mx-auto">
                            <AlertTriangle className="w-8 h-8" />
                        </div>
                        <div className="space-y-2">
                            <h1 className="text-xl font-heading font-bold">Something went wrong</h1>
                            <p className="text-sm text-muted-foreground">
                                The application encountered an unexpected error and couldn't continue.
                            </p>
                        </div>
                        {this.state.error && (
                            <div className="p-4 bg-muted rounded-lg text-left overflow-auto max-h-40">
                                <code className="text-[10px] text-destructive">
                                    {this.state.error.toString()}
                                </code>
                            </div>
                        )}
                        <Button
                            className="w-full"
                            onClick={() => {
                                localStorage.clear();
                                window.location.href = "/";
                            }}
                        >
                            Reset Session & Retry
                        </Button>
                        <p className="text-[10px] text-muted-foreground">
                            Tip: Resetting the session will clear your login data and try to reload the page fresh.
                        </p>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
