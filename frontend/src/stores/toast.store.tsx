import { CheckCircle2, Info, TriangleAlert, X, XCircle } from "lucide-react";
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

type ToastKind = "success" | "error" | "info" | "warning";

type ToastInput = {
  title: string;
  description?: string;
  kind?: ToastKind;
  durationMs?: number;
};

type Toast = Required<Pick<ToastInput, "title" | "kind">> & {
  id: string;
  description?: string;
};

type ToastContextValue = {
  showToast: (toast: ToastInput) => void;
  dismissToast: (id: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const iconByKind = {
  success: CheckCircle2,
  error: XCircle,
  info: Info,
  warning: TriangleAlert
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback(
    ({ title, description, kind = "info", durationMs = 3200 }: ToastInput) => {
      const id = crypto.randomUUID();
      setToasts((current) => [{ id, title, description, kind }, ...current].slice(0, 4));
      window.setTimeout(() => dismissToast(id), durationMs);
    },
    [dismissToast]
  );

  const value = useMemo(() => ({ showToast, dismissToast }), [showToast, dismissToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-stack" role="region" aria-label="Notifications">
        {toasts.map((toast) => {
          const Icon = iconByKind[toast.kind];
          return (
            <div className={`toast toast-${toast.kind}`} key={toast.id} role="status">
              <Icon className="toast-icon" size={18} />
              <div className="min-w-0 flex-1">
                <p className="toast-title">{toast.title}</p>
                {toast.description ? <p className="toast-description">{toast.description}</p> : null}
              </div>
              <button className="toast-close" onClick={() => dismissToast(toast.id)} aria-label="Dismiss notification">
                <X size={15} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used inside ToastProvider");
  return context;
}
