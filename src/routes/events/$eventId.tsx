import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Ban,
  Check,
  Clock,
  Copy,
  Download,
  Sparkles,
  Trash2,
  UserCheck,
  UserX,
} from "lucide-react";
import { Field, GhostButton, PrimaryButton, Shell, StatusMark, controlClass } from "@/components/desk-ui";
import {
  APPROVAL_KEYS,
  APPROVAL_LABEL,
  type ApprovalKey,
  type CommunityEvent,
  type Dietary,
  type GuestStatus,
  approvedCount,
  budgetTotal,
  formatWhen,
  hoursLabel,
  leadMinutes,
  money,
  pieceTotal,
  toIcs,
  toNotionMarkdown,
} from "@/lib/domain";
import { copyText, downloadText, posterSvg } from "@/lib/poster";
import { polishCopy } from "@/lib/ai";
import { hydrateDesk, useDesk } from "@/lib/store";

export const Route = createFileRoute("/events/$eventId")({ component: EventDesk });

type Tab = "brief" | "run" | "budget" | "rota" | "promo" | "visual" | "night";

const TABS: { id: Tab; label: string }[] = [
  { id: "brief", label: "Brief" },
  { id: "run", label: "Run sheet" },
  { id: "budget", label: "Budget" },
  { id: "rota", label: "Rota" },
  { id: "promo", label: "Posts" },
  { id: "visual", label: "Poster" },
  { id: "night", label: "Night" },
];

function EventDesk() {
  const { eventId } = Route.useParams();
  const hydrated = useDesk((s) => s.hydrated);
  const event = useDesk((s) => s.events.find((item) => item.id === eventId));
  const rebuild = useDesk((s) => s.rebuild);
  const removeEvent = useDesk((s) => s.removeEvent);
  const [tab, setTab] = useState<Tab>("run");
  const [toast, setToast] = useState("");

  useEffect(() => {
    void hydrateDesk();
  }, []);

  if (!hydrated) {
    return (
      <Shell>
        <p className="text-muted">Opening the pack…</p>
      </Shell>
    );
  }

  if (!event) {
    return (
      <Shell>
        <h1 className="font-display text-3xl">That event isn't on the desk</h1>
        <Link to="/" className="mt-4 inline-flex min-h-11 items-center font-semibold text-teal">
          Back to the desk
        </Link>
      </Shell>
    );
  }

  const done = approvedCount(event);
  const total = budgetTotal(event.budget);
  const gap = event.budgetCap - total;

  async function copyPack() {
    const ok = await copyText(toNotionMarkdown(event!));
    setToast(ok ? "Workspace markdown copied. Paste it into Notion." : "Copy failed. Try the download instead.");
  }

  return (
    <Shell>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold tracking-[0.16em] text-teal uppercase">{event.kind}</p>
          <h1 className="font-display text-4xl">{event.title}</h1>
          <p className="mt-1 text-muted">
            {formatWhen(event.date, event.start, event.end)} · {[event.venue || "Venue to confirm", event.area].filter(Boolean).join(", ")}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <GhostButton onClick={() => void copyPack()}>
            <Copy className="size-4" aria-hidden="true" />
            Copy Notion page
          </GhostButton>
          <GhostButton
            onClick={() => downloadText(`${event.title.replace(/\s+/g, "-").toLowerCase()}.ics`, toIcs(event), "text/calendar")}
          >
            <Download className="size-4" aria-hidden="true" />
            Calendar
          </GhostButton>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <article className="rounded-xl border border-line bg-surface p-4">
          <p className="text-xs font-semibold tracking-[0.14em] text-teal uppercase">Writing replaced</p>
          <p className="font-display text-3xl tabular-nums">{hoursLabel(pieceTotal())}</p>
          <p className="text-sm text-muted">What a volunteer used to type for this one event.</p>
        </article>
        <article className="rounded-xl border border-line bg-surface p-4">
          <p className="text-xs font-semibold tracking-[0.14em] text-teal uppercase">Your time left</p>
          <p className="font-display text-3xl tabular-nums">{hoursLabel(leadMinutes(event))}</p>
          <p className="text-sm text-muted">
            {done} of {APPROVAL_KEYS.length} approved. Each one is a click, about 2 minutes.
          </p>
        </article>
        <article className="rounded-xl border border-line bg-surface p-4">
          <p className="text-xs font-semibold tracking-[0.14em] text-teal uppercase">Against the cap</p>
          <p className="font-display text-3xl tabular-nums">{money(total)}</p>
          <p className="text-sm text-muted">
            {gap >= 0 ? `Under cap by ${money(gap)}.` : `Over cap by ${money(Math.abs(gap))}.`} Cap is {money(event.budgetCap)}.
          </p>
        </article>
      </div>

      <div className="mt-4 flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Event pack">
        {TABS.map((item) => {
          const selected = tab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => setTab(item.id)}
              className={
                selected
                  ? "min-h-11 shrink-0 rounded-lg border-2 border-ink bg-teal px-4 text-sm font-semibold text-on-teal underline decoration-2 underline-offset-4"
                  : "min-h-11 shrink-0 rounded-lg border-2 border-ink bg-surface px-4 text-sm font-semibold text-ink"
              }
            >
              {item.label}
            </button>
          );
        })}
      </div>

      {toast && <p className="mt-3 text-sm text-muted">{toast}</p>}

      <div className="mt-4" role="tabpanel">
        {tab === "brief" && <BriefTab event={event} onRebuild={() => { rebuild(event.id); setToast("Pack rebuilt. Approvals are back to draft."); }} onDelete={() => removeEvent(event.id)} />}
        {tab === "run" && <RunTab event={event} />}
        {tab === "budget" && <BudgetTab event={event} total={total} gap={gap} />}
        {tab === "rota" && <RotaTab event={event} />}
        {tab === "promo" && <PromoTab event={event} onNote={setToast} />}
        {tab === "visual" && <VisualTab event={event} />}
        {tab === "night" && <NightTab event={event} />}
      </div>
    </Shell>
  );
}

function ApproveRow({ eventId, piece }: { eventId: string; piece: ApprovalKey }) {
  const event = useDesk((s) => s.events.find((item) => item.id === eventId));
  const setApproval = useDesk((s) => s.setApproval);
  if (!event) return null;
  const approval = event.approvals[piece];
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div className="flex items-center gap-2">
        <StatusMark approval={approval} />
        <span className="text-sm text-muted">{APPROVAL_LABEL[piece]}</span>
      </div>
      {approval === "approved" ? (
        <GhostButton onClick={() => setApproval(eventId, piece, "draft")}>Return to draft</GhostButton>
      ) : (
        <PrimaryButton onClick={() => setApproval(eventId, piece, "approved")}>Approve</PrimaryButton>
      )}
    </div>
  );
}

function BriefTab({ event, onRebuild, onDelete }: { event: CommunityEvent; onRebuild: () => void; onDelete: () => void }) {
  const updateBrief = useDesk((s) => s.updateBrief);
  const addInterest = useDesk((s) => s.addInterest);
  const removeInterest = useDesk((s) => s.removeInterest);
  const addReceipt = useDesk((s) => s.addReceipt);
  const removeReceipt = useDesk((s) => s.removeReceipt);
  const [name, setName] = useState("");
  const [dietary, setDietary] = useState<Dietary>("vegetarian");
  const [alcohol, setAlcohol] = useState<"yes" | "no" | "either">("either");
  const [canHelp, setCanHelp] = useState(false);
  const [freeWindow, setFreeWindow] = useState("19:00–22:00");
  const [tablePref, setTablePref] = useState("");
  const [personNotes, setPersonNotes] = useState("");
  const [vendor, setVendor] = useState("");
  const [amount, setAmount] = useState(0);
  const [receiptNote, setReceiptNote] = useState("");

  return (
    <div className="grid gap-4">
      <section className="rounded-xl border border-line bg-surface p-4">
        <h2 className="font-display text-2xl">Facts</h2>
        <p className="mb-3 text-sm text-muted">Edit the brief, then rebuild. Rebuild rewrites every draft and clears approvals. Check-ins for the same names stay.</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Title">
            <input className={controlClass} value={event.title} onChange={(e) => updateBrief(event.id, { title: e.target.value })} />
          </Field>
          <Field label="Theme">
            <input className={controlClass} value={event.theme} onChange={(e) => updateBrief(event.id, { theme: e.target.value })} />
          </Field>
          <Field label="Venue">
            <input className={controlClass} value={event.venue} onChange={(e) => updateBrief(event.id, { venue: e.target.value })} />
          </Field>
          <Field label="Area">
            <input className={controlClass} value={event.area} onChange={(e) => updateBrief(event.id, { area: e.target.value })} />
          </Field>
          <Field label="Host notes">
            <textarea className={controlClass} rows={3} value={event.notes} onChange={(e) => updateBrief(event.id, { notes: e.target.value })} />
          </Field>
          <Field label="Quote or venue line">
            <textarea className={controlClass} rows={3} value={event.quotes} onChange={(e) => updateBrief(event.id, { quotes: e.target.value })} />
          </Field>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <PrimaryButton onClick={onRebuild}>Rebuild drafts</PrimaryButton>
          <Link to="/" onClick={onDelete} className="inline-flex min-h-11 items-center gap-2 rounded-lg border-2 border-ink bg-surface px-4 text-sm font-semibold">
            <Trash2 className="size-4" aria-hidden="true" />
            Remove from desk
          </Link>
        </div>
      </section>

      <section className="rounded-xl border border-line bg-surface p-4">
        <h2 className="font-display text-2xl">Interest replies</h2>
        <p className="text-sm text-muted">Dietary need, alcohol, free hours, who they'll sit with. These change the rota and the food line when you rebuild.</p>
        <ul className="mt-3 grid gap-2">
          {event.interests.map((row) => (
            <li key={row.id} className="flex flex-wrap items-start justify-between gap-2 rounded-lg border border-line px-3 py-2 text-sm">
              <div>
                <p className="font-semibold">{row.name}</p>
                <p className="text-muted">
                  {row.dietary} · alcohol {row.alcohol} · free {row.freeWindow}
                  {row.canHelp ? " · can help" : ""}
                  {row.tablePref ? ` · ${row.tablePref}` : ""}
                </p>
                {row.notes && <p>{row.notes}</p>}
              </div>
              <button type="button" className="min-h-11 rounded-lg border-2 border-ink bg-surface px-3 text-sm font-semibold" onClick={() => removeInterest(event.id, row.id)}>
                Remove
              </button>
            </li>
          ))}
          {event.interests.length === 0 && <li className="text-sm text-muted">No replies yet. Catering stays a flat estimate until someone answers.</li>}
        </ul>
        <form
          className="mt-4 grid gap-3 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!name.trim()) return;
            addInterest(event.id, { name: name.trim(), dietary, alcohol, canHelp, freeWindow, tablePref, notes: personNotes });
            setName("");
            setTablePref("");
            setPersonNotes("");
          }}
        >
          <Field label="Name">
            <input className={controlClass} value={name} onChange={(e) => setName(e.target.value)} required />
          </Field>
          <Field label="Dietary">
            <select className={controlClass} value={dietary} onChange={(e) => setDietary(e.target.value as Dietary)}>
              <option value="omnivore">Omnivore</option>
              <option value="vegetarian">Vegetarian</option>
              <option value="vegan">Vegan</option>
              <option value="halal">Halal</option>
              <option value="gluten-free">Gluten-free</option>
            </select>
          </Field>
          <Field label="Alcohol">
            <select className={controlClass} value={alcohol} onChange={(e) => setAlcohol(e.target.value as "yes" | "no" | "either")}>
              <option value="yes">Yes</option>
              <option value="no">No</option>
              <option value="either">Either</option>
            </select>
          </Field>
          <Field label="Free hours">
            <input className={controlClass} value={freeWindow} onChange={(e) => setFreeWindow(e.target.value)} />
          </Field>
          <Field label="Table or partner">
            <input className={controlClass} value={tablePref} onChange={(e) => setTablePref(e.target.value)} placeholder="Quiet table, or a name" />
          </Field>
          <label className="flex min-h-11 items-center gap-2 text-sm font-semibold">
            <input type="checkbox" checked={canHelp} onChange={(e) => setCanHelp(e.target.checked)} />
            Can take a rota slot
          </label>
          <div className="sm:col-span-2">
            <Field label="Note">
              <input className={controlClass} value={personNotes} onChange={(e) => setPersonNotes(e.target.value)} />
            </Field>
          </div>
          <div>
            <PrimaryButton type="submit">Log reply</PrimaryButton>
          </div>
        </form>
      </section>

      <section className="rounded-xl border border-line bg-surface p-4">
        <h2 className="font-display text-2xl">Receipts</h2>
        <ul className="mt-3 grid gap-2">
          {event.receipts.map((row) => (
            <li key={row.id} className="flex items-center justify-between gap-2 text-sm">
              <span>
                <span className="font-semibold">{row.vendor}</span> · {money(row.amount)} · {row.note}
              </span>
              <button type="button" className="min-h-11 rounded-lg border-2 border-ink bg-surface px-3 text-sm font-semibold" onClick={() => removeReceipt(event.id, row.id)}>
                Remove
              </button>
            </li>
          ))}
        </ul>
        <form
          className="mt-3 grid gap-3 sm:grid-cols-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (!vendor.trim()) return;
            addReceipt(event.id, { vendor: vendor.trim(), amount, note: receiptNote });
            setVendor("");
            setAmount(0);
            setReceiptNote("");
          }}
        >
          <Field label="Vendor">
            <input className={controlClass} value={vendor} onChange={(e) => setVendor(e.target.value)} required />
          </Field>
          <Field label="Amount (£)">
            <input className={`${controlClass} tabular-nums`} type="number" min={0} value={amount} onChange={(e) => setAmount(Number(e.target.value))} />
          </Field>
          <Field label="Note">
            <input className={controlClass} value={receiptNote} onChange={(e) => setReceiptNote(e.target.value)} />
          </Field>
          <div>
            <PrimaryButton type="submit">Add receipt</PrimaryButton>
          </div>
        </form>
      </section>
    </div>
  );
}

function RunTab({ event }: { event: CommunityEvent }) {
  const setRun = useDesk((s) => s.setRun);
  return (
    <section className="rounded-xl border border-line bg-surface p-4">
      <div className="mb-4">
        <ApproveRow eventId={event.id} piece="runSheet" />
      </div>
      <ol className="grid gap-3">
        {event.runSheet.map((item) => (
          <li key={item.id} className="grid gap-2 border-t border-line pt-3 sm:grid-cols-[7rem_1fr]">
            <label className="text-sm font-semibold">
              Time
              <input
                className={`${controlClass} mt-1 tabular-nums`}
                type="time"
                value={item.time}
                onChange={(e) => setRun(event.id, item.id, { time: e.target.value })}
              />
            </label>
            <div>
              <p className="font-semibold">{item.title}</p>
              <p className="text-sm text-muted">Owner: {item.owner}</p>
              <p className="text-sm">{item.detail}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

function BudgetTab({ event, total, gap }: { event: CommunityEvent; total: number; gap: number }) {
  const setBudgetLine = useDesk((s) => s.setBudgetLine);
  return (
    <section className="rounded-xl border border-line bg-surface p-4">
      <div className="mb-4">
        <ApproveRow eventId={event.id} piece="budget" />
      </div>
      <p className="mb-3 text-sm">
        {gap >= 0 ? (
          <span>Under cap by {money(gap)}. Total {money(total)} against {money(event.budgetCap)}.</span>
        ) : (
          <span className="inline-flex items-center gap-2 font-semibold text-amber">
            <Ban className="size-4" aria-hidden="true" />
            Over cap by {money(Math.abs(gap))}. Total {money(total)} against {money(event.budgetCap)}.
          </span>
        )}
      </p>
      <ul className="grid gap-3">
        {event.budget.map((line) => (
          <li key={line.id} className="grid gap-2 border-t border-line pt-3 sm:grid-cols-[1fr_8rem]">
            <div>
              <p className="font-semibold">
                {line.label}{" "}
                <span className="font-normal text-muted">({line.source === "receipt" ? "receipt" : "estimate"})</span>
              </p>
              <p className="text-sm text-muted">{line.note}</p>
            </div>
            <label className="text-sm font-semibold">
              £
              <input
                className={`${controlClass} mt-1 tabular-nums`}
                type="number"
                min={0}
                value={line.amount}
                onChange={(e) => setBudgetLine(event.id, line.id, Number(e.target.value))}
              />
            </label>
          </li>
        ))}
      </ul>
    </section>
  );
}

function RotaTab({ event }: { event: CommunityEvent }) {
  const setRotaPerson = useDesk((s) => s.setRotaPerson);
  return (
    <section className="rounded-xl border border-line bg-surface p-4">
      <div className="mb-4">
        <ApproveRow eventId={event.id} piece="rota" />
      </div>
      <ul className="grid gap-3">
        {event.rota.map((slot) => (
          <li key={slot.id} className={`rounded-lg border px-3 py-3 ${slot.open ? "draft-stripe border-dashed border-amber" : "border-line"}`}>
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-semibold">{slot.role}</p>
              {slot.open ? (
                <span className="text-sm font-semibold text-amber">Open slot</span>
              ) : (
                <span className="inline-flex items-center gap-1 text-sm font-semibold text-teal">
                  <Check className="size-3.5" aria-hidden="true" />
                  Named
                </span>
              )}
            </div>
            <p className="text-sm text-muted">{slot.window}</p>
            <p className="text-sm">{slot.note}</p>
            <label className="mt-2 block text-sm font-semibold">
              Person
              <input
                className={`${controlClass} mt-1`}
                value={slot.person}
                placeholder="Leave empty if the slot is open"
                onChange={(e) => setRotaPerson(event.id, slot.id, e.target.value)}
              />
            </label>
          </li>
        ))}
      </ul>
    </section>
  );
}

const PROMO_KEYS = [
  ["page", "Event page", "page"],
  ["ghost", "Ghost newsletter", "ghost"],
  ["whatsapp", "WhatsApp", "whatsapp"],
  ["linkedin", "LinkedIn", "linkedin"],
  ["discord", "Discord", "discord"],
] as const;

function PromoTab({ event, onNote }: { event: CommunityEvent; onNote: (msg: string) => void }) {
  const setPromo = useDesk((s) => s.setPromo);
  const [busy, setBusy] = useState<string | null>(null);

  async function polish(key: (typeof PROMO_KEYS)[number][0], label: string) {
    setBusy(key);
    const result = await polishCopy({
      data: {
        kind: label,
        draft: event.promo[key],
        context: `${event.title}. ${formatWhen(event.date, event.start, event.end)}. ${event.venue}, ${event.area}. Cap £${event.budgetCap}. Seats ${event.capacity}. ${event.theme}. ${event.notes}`,
      },
    });
    setBusy(null);
    if (!result.ok) {
      onNote(result.error);
      return;
    }
    setPromo(event.id, key, result.text);
    onNote(`${label} rewritten. It's a draft again until you approve it.`);
  }

  async function copyApproved(key: (typeof PROMO_KEYS)[number][0], approval: ApprovalKey, label: string) {
    if (event.approvals[approval] !== "approved") {
      onNote(`Approve the ${label} first. Drafts don't get copied out.`);
      return;
    }
    const ok = await copyText(event.promo[key]);
    onNote(ok ? `${label} copied.` : "Copy failed in this browser.");
  }

  return (
    <div className="grid gap-4">
      {PROMO_KEYS.map(([key, label, approval]) => (
        <section key={key} className="rounded-xl border border-line bg-surface p-4">
          <div className="mb-3">
            <ApproveRow eventId={event.id} piece={approval} />
          </div>
          <h2 className="mb-2 font-display text-xl">{label}</h2>
          <textarea
            className={key === "discord" ? `${controlClass} bg-ink text-paper` : controlClass}
            rows={key === "whatsapp" ? 6 : 8}
            value={event.promo[key]}
            onChange={(e) => setPromo(event.id, key, e.target.value)}
          />
          <div className="mt-3 flex flex-wrap gap-2">
            <GhostButton onClick={() => void polish(key, label)} disabled={busy === key}>
              <Sparkles className="size-4" aria-hidden="true" />
              {busy === key ? "Rewriting…" : "Polish with Grok"}
            </GhostButton>
            <GhostButton onClick={() => void copyApproved(key, approval, label)}>
              <Copy className="size-4" aria-hidden="true" />
              Copy if approved
            </GhostButton>
          </div>
        </section>
      ))}
      <p className="text-sm text-muted">
        Ghost, WhatsApp, LinkedIn and Discord stay as approved drafts. Sending needs the lead's own keys, which this desk never asks you to paste in.
      </p>
    </div>
  );
}

function VisualTab({ event }: { event: CommunityEvent }) {
  const [shape, setShape] = useState<"story" | "wide">("story");
  const svg = posterSvg(event, shape);
  return (
    <section className="rounded-xl border border-line bg-surface p-4">
      <div className="mb-4">
        <ApproveRow eventId={event.id} piece="visual" />
      </div>
      <p className="mb-3 text-sm text-muted">Same template every time. Only the facts change. This is drawn as SVG, not an image model.</p>
      <div className="mb-3 flex gap-2">
        <button
          type="button"
          onClick={() => setShape("story")}
          className={shape === "story" ? "min-h-11 rounded-lg border-2 border-ink bg-teal px-4 text-sm font-semibold text-on-teal underline decoration-2 underline-offset-4" : "min-h-11 rounded-lg border-2 border-ink bg-surface px-4 text-sm font-semibold"}
        >
          Story
        </button>
        <button
          type="button"
          onClick={() => setShape("wide")}
          className={shape === "wide" ? "min-h-11 rounded-lg border-2 border-ink bg-teal px-4 text-sm font-semibold text-on-teal underline decoration-2 underline-offset-4" : "min-h-11 rounded-lg border-2 border-ink bg-surface px-4 text-sm font-semibold"}
        >
          Wide
        </button>
      </div>
      <div
        className="poster-frame mx-auto max-w-md overflow-hidden rounded-lg border border-line bg-paper"
        dangerouslySetInnerHTML={{ __html: svg }}
      />
      <div className="mt-3">
        <GhostButton
          onClick={() =>
            downloadText(
              `${event.title.replace(/\s+/g, "-").toLowerCase()}-${shape}.svg`,
              svg,
              "image/svg+xml",
            )
          }
        >
          <Download className="size-4" aria-hidden="true" />
          Download SVG
        </GhostButton>
      </div>
    </section>
  );
}

const GUEST_ACTIONS: { status: GuestStatus; label: string; icon: typeof Check }[] = [
  { status: "checked-in", label: "Check in", icon: UserCheck },
  { status: "expected", label: "Expected", icon: Clock },
  { status: "no-show", label: "No-show", icon: UserX },
  { status: "cancelled", label: "Cancelled", icon: Ban },
];

function NightTab({ event }: { event: CommunityEvent }) {
  const setGuestStatus = useDesk((s) => s.setGuestStatus);
  const addWalkIn = useDesk((s) => s.addWalkIn);
  const applyNightChange = useDesk((s) => s.applyNightChange);
  const [change, setChange] = useState(event.lastChange);
  const [walkIn, setWalkIn] = useState("");
  const counts = {
    "checked-in": event.guests.filter((g) => g.status === "checked-in").length,
    expected: event.guests.filter((g) => g.status === "expected").length,
    "no-show": event.guests.filter((g) => g.status === "no-show").length,
    cancelled: event.guests.filter((g) => g.status === "cancelled").length,
  };

  return (
    <div className="grid gap-4">
      <section className="rounded-xl border border-line bg-surface p-4">
        <h2 className="font-display text-2xl">Door</h2>
        <p className="text-sm text-muted">
          {counts["checked-in"]} checked in · {counts.expected} expected · {counts["no-show"]} no-show · {counts.cancelled} cancelled.
          Status is the word and the icon, not a colour.
        </p>
        <ul className="mt-3 grid gap-3">
          {event.guests.map((guest) => (
            <li key={guest.id} className="rounded-lg border border-line px-3 py-3">
              <p className="font-semibold">{guest.name}</p>
              <p className="text-sm text-muted">
                {guest.dietary} · {guest.status}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {GUEST_ACTIONS.map((action) => {
                  const Icon = action.icon;
                  const on = guest.status === action.status;
                  return (
                    <button
                      key={action.status}
                      type="button"
                      onClick={() => setGuestStatus(event.id, guest.id, action.status)}
                      className={
                        on
                          ? "inline-flex min-h-11 items-center gap-1.5 rounded-lg border-2 border-ink bg-teal px-3 text-sm font-semibold text-on-teal underline decoration-2 underline-offset-4"
                          : "inline-flex min-h-11 items-center gap-1.5 rounded-lg border-2 border-ink bg-surface px-3 text-sm font-semibold"
                      }
                    >
                      <Icon className="size-4" aria-hidden="true" />
                      {action.label}
                    </button>
                  );
                })}
              </div>
            </li>
          ))}
          {event.guests.length === 0 && <li className="text-sm text-muted">No one on the list. Log interest replies, rebuild, or add a walk-in.</li>}
        </ul>
        <form
          className="mt-4 flex flex-wrap gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!walkIn.trim()) return;
            addWalkIn(event.id, walkIn);
            setWalkIn("");
          }}
        >
          <input className={`${controlClass} max-w-xs`} value={walkIn} placeholder="Walk-in name" onChange={(e) => setWalkIn(e.target.value)} />
          <PrimaryButton type="submit">Add walk-in</PrimaryButton>
        </form>
      </section>

      <section className="rounded-xl border border-line bg-surface p-4">
        <div className="mb-3">
          <ApproveRow eventId={event.id} piece="night" />
        </div>
        <h2 className="font-display text-2xl">Last-minute change</h2>
        <p className="mb-3 text-sm text-muted">Write what changed. The desk drafts the group note from the door count. Approve it, then copy.</p>
        <textarea className={controlClass} rows={3} value={change} onChange={(e) => setChange(e.target.value)} placeholder="Kitchen is 15 minutes late. Food moves to 20:45." />
        <div className="mt-3">
          <PrimaryButton onClick={() => applyNightChange(event.id, change)}>Draft the update</PrimaryButton>
        </div>
        {event.promo.nightUpdate && (
          <pre className="mt-4 overflow-x-auto rounded-lg bg-paper p-3 text-sm whitespace-pre-wrap">{event.promo.nightUpdate}</pre>
        )}
        <div className="mt-3">
          <GhostButton
            onClick={() => {
              if (event.approvals.night !== "approved") return;
              void copyText(event.promo.nightUpdate);
            }}
            disabled={event.approvals.night !== "approved" || !event.promo.nightUpdate}
          >
            <Copy className="size-4" aria-hidden="true" />
            Copy approved update
          </GhostButton>
        </div>
      </section>
    </div>
  );
}
