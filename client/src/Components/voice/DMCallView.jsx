import React, { useEffect } from "react";
import { Check, PhoneOff } from "lucide-react";
import Avatar from "@/Components/Avatar";

function DMCallView({
  state = "idle",
  callerName,
  onAnswer,
  onDecline,
  children,
}) {
  useEffect(() => {
    if (state !== "ringing") return undefined;
    const timeout = setTimeout(() => {
      onDecline?.();
    }, 30_000);
    return () => clearTimeout(timeout);
  }, [onDecline, state]);

  if (state !== "ringing") {
    return (
      <div className="pointer-events-none fixed bottom-4 right-4 z-50">
        {children}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-sm rounded-xl border border-theme bg-theme-surface p-5 text-center">
        <div className="mb-3 flex justify-center">
          <Avatar name={callerName || "Caller"} size="xl" />
        </div>
        <h3 className="text-lg font-semibold text-theme">{callerName || "Incoming call"}</h3>
        <p className="mt-1 text-sm text-theme-muted">Incoming direct call</p>
        <div className="mt-4 flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={onAnswer}
            className="inline-flex items-center gap-2 rounded-md bg-[color:var(--gruv-bright-green)] px-4 py-2 text-sm font-semibold text-[color:var(--gruv-bg_hard)]"
          >
            <Check size={16} />
            Answer
          </button>
          <button
            type="button"
            onClick={onDecline}
            className="inline-flex items-center gap-2 rounded-md bg-[color:var(--gruv-red)] px-4 py-2 text-sm font-semibold text-white"
          >
            <PhoneOff size={16} />
            Decline
          </button>
        </div>
      </div>
    </div>
  );
}

export default DMCallView;
