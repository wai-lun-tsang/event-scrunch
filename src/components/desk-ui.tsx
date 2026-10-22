import { Link, useRouterState } from "@tanstack/react-router";
import { Check, Minus } from "lucide-react";
import { useEffect, type ReactNode } from "react";
import {
  APPROVAL_KEYS,
  DIGEST_MINUTES,
  LEAD_MINUTES,
  type Approval,
  approvedCount,
  hoursLabel,
  leadMinutes,
  savedMinutes,
} from "@/lib/domain";
import { hydrateDesk, useDesk } from "@/lib/store";

export function londonToday(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/London",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function isPastEvent(date: string): boolean {
  return Boolean(date) && date < londonToday();
}

export function Shell({ children }: { children: ReactNode }) {
  const hydrated = useDesk((s) => s.hydrated);
  const events = useDesk((s) => s.events);
  const digest = useDesk((s) => s.digest);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const hash = useRouterState({ select: (s) => s.location.hash });

  useEffect(() => {
    void hydrateDesk();
  }, []);

  const archiveHash = hash === "archive" || hash === "#archive";
  const openId = pathname.startsWith("/events/") ? decodeURIComponent(pathname.split("/")[2] ?? "") : "";
  const open = events.find((event) => event.id === openId);
  const viewingPast = Boolean(open && isPastEvent(open.date));
  const onArchive = archiveHash || viewingPast;
  const onNew = pathname === "/" && !archiveHash;
  const upcoming = events
    .filter((event) => !isPastEvent(event.date))
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date) || a.title.localeCompare(b.title));
  const writing =
    events.reduce((sum, event) => sum + savedMinutes(event), 0) + (digest ? DIGEST_MINUTES : 0);
  const lead =
    events.reduce((sum, event) => sum + leadMinutes(event), 0) +
    (digest && digest.approval === "draft" ? LEAD_MINUTES : 0);
  const openApprovals =
    events.reduce((sum, event) => sum + (APPROVAL_KEYS.length - approvedCount(event)), 0) +
    (digest && digest.approval === "draft" ? 1 : 0);

  return (
    <div className="min-h-screen bg-paper text-ink">
      <a
        href="#desk"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:border-2 focus:border-ink focus:bg-surface focus:px-3 focus:py-2"
      >
        Skip to the desk
      </a>
      <header className="border-b-2 border-ink bg-surface">
        <div className="mx-auto flex max-w-6xl flex-wrap items-end justify-between gap-3 px-4 py-4">
          <div>
            <p className="text-xs font-semibold tracking-[0.16em] text-muted uppercase">Community desk</p>
            <Link to="/" hash="" className="font-display text-3xl leading-none text-ink">
              EventScrunch
            </Link>
          </div>
          <p className="max-w-sm text-sm leading-snug text-muted">
            One line in. Run sheet, money, rota, poster and posts out. Nothing leaves until you approve it.
          </p>
        </div>
      </header>
      <main id="desk" className="mx-auto max-w-6xl px-4 py-5">
        <p className="mb-4 rounded-lg border-2 border-ink bg-surface px-3 py-2 text-sm">
          {hydrated ? (
            <>
              <span className="font-semibold tabular-nums">{hoursLabel(writing)}</span> of writing replaced.{" "}
              <span className="font-semibold tabular-nums">{hoursLabel(lead)}</span> still on you
              {openApprovals > 0 ? ` (${openApprovals} still draft).` : "."}
            </>
          ) : (
            "Opening the desk…"
          )}
        </p>
        <div role="tablist" aria-label="Desk folders" className="-mb-[2px] flex items-end gap-1 overflow-x-auto">
          <FolderTab to="/" hash="" active={onNew}>
            New social
          </FolderTab>
          {upcoming.map((event) => (
            <FolderTab
              key={event.id}
              to="/events/$eventId"
              params={{ eventId: event.id }}
              active={!onArchive && openId === event.id}
            >
              {event.title || "Untitled social"}
            </FolderTab>
          ))}
          <FolderTab to="/" hash="archive" active={onArchive}>
            Archive
          </FolderTab>
        </div>
        <div className="rounded-lg border-2 border-ink bg-surface p-4 sm:p-5">{children}</div>
      </main>
    </div>
  );
}

function FolderTab({
  active,
  children,
  to,
  hash,
  params,
}: {
  active: boolean;
  children: ReactNode;
  to: "/" | "/events/$eventId";
  hash?: string;
  params?: { eventId: string };
}) {
  return (
    <Link
      to={to}
      params={params}
      hash={hash}
      role="tab"
      aria-selected={active}
      className={
        active
          ? "relative z-10 w-max shrink-0 rounded-t-lg border-2 border-b-[#f6f7f9] bg-surface px-4 py-2 text-sm font-semibold whitespace-nowrap text-ink underline decoration-2 underline-offset-4"
          : "w-max shrink-0 rounded-t-lg border-2 border-ink bg-chip px-4 py-2 text-sm font-semibold whitespace-nowrap text-ink"
      }
    >
      {children}
    </Link>
  );
}

export function StatusMark({ approval }: { approval: Approval }) {
  const approved = approval === "approved";
  return (
    <span
      className={
        approved
          ? "inline-flex min-h-8 items-center gap-1.5 rounded-full border-2 border-ink bg-teal-soft px-2.5 text-sm font-semibold text-ink"
          : "draft-stripe inline-flex min-h-8 items-center gap-1.5 rounded-full border-2 border-dashed border-ink px-2.5 text-sm font-semibold text-ink"
      }
    >
      {approved ? <Check className="size-3.5" aria-hidden="true" /> : <Minus className="size-3.5" aria-hidden="true" />}
      {approved ? "Approved" : "Draft"}
    </span>
  );
}

export function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5 text-sm font-semibold text-ink">
      {label}
      {children}
    </label>
  );
}

export const controlClass =
  "min-h-11 w-full rounded-lg border-2 border-ink bg-surface px-3 py-2 text-base font-normal text-ink";

export function PrimaryButton({
  children,
  type = "button",
  disabled,
  onClick,
}: {
  children: ReactNode;
  type?: "button" | "submit";
  disabled?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border-2 border-ink bg-teal px-4 text-sm font-semibold text-on-teal disabled:opacity-50"
    >
      {children}
    </button>
  );
}

export function GhostButton({
  children,
  type = "button",
  disabled,
  onClick,
}: {
  children: ReactNode;
  type?: "button" | "submit";
  disabled?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border-2 border-ink bg-surface px-4 text-sm font-semibold text-ink disabled:opacity-50"
    >
      {children}
    </button>
  );
}
