import { CheckCircle2, Info, TriangleAlert, X, XCircle } from "lucide-react";
import { createContext, use, useCallback, useMemo, useState, type ReactNode } from "react";

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
      <section className="toast-stack" aria-label="Notifications">
        {toasts.map((toast) => {
          const Icon = iconByKind[toast.kind];
          return (
            <output className={`toast toast-${toast.kind}`} key={toast.id}>
              <Icon className="toast-icon" size={18} />
              <span className="min-w-0 flex-1">
                <span className="toast-title">{toast.title}</span>
                {toast.description ? <span className="toast-description">{toast.description}</span> : null}
              </span>
              <button className="toast-close" onClick={() => dismissToast(toast.id)} aria-label="Dismiss notification" type="button">
                <X size={15} />
              </button>
            </output>
          );
        })}
      </section>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = use(ToastContext);
  if (!context) throw new Error("useToast must be used inside ToastProvider");
  return context;
}
