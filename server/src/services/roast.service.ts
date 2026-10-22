/**
 * The Roast Engine.
 *
 * Deterministic escalation: a roast's tier is derived from how close the
 * deadline is, never from randomness. The chaos level chosen by the user
 * shifts the tier up or down by one. The deadline personality colours the
 * wording. Every tier is PG-13 and workplace-safe.
 */

export const TIERS = [
  { tier: 1, key: "POLITE", label: "Polite", colour: "#4c8563" },
  { tier: 2, key: "PASSIVE_AGGRESSIVE", label: "Passive-Aggressive", colour: "#a5813c" },
  { tier: 3, key: "LEGAL", label: "Legal", colour: "#b3703f" },
  { tier: 4, key: "DESPERATE", label: "Desperate", colour: "#b0604a" },
  { tier: 5, key: "COSMIC", label: "Cosmic Despair", colour: "#8a4f6d" },
] as const;

export type Tier = 1 | 2 | 3 | 4 | 5;

export const PERSONALITIES = [
  {
    key: "OVERCONFIDENT_OPTIMIST",
    label: "The Overconfident Optimist",
    blurb: "Believes the deadline is a rumour and time is a social construct.",
    open: "Absolutely on it. This will be done early.",
    close: "So, uhm. The deadline.",
  },
  {
    key: "SILENT_SLOBBER",
    label: "The Silent Slobber",
    blurb: "Has not opened the tracker since March. Does not talk about it.",
    open: "Mmmhm.",
    close: "...hello?",
  },
  {
    key: "POLITE_DEFERRER",
    label: "The Polite Defurrer",
    blurb: "Apologises for existing and will reschedule with great ceremony.",
    open: "Apologies for the delay, I am very aware this is difficult.",
    close: "I would never impose, but.",
  },
  {
    key: "CHAOTIC_SCHEDULER",
    label: "The Chaotic Scheduler",
    blurb: "Has seventeen deadlines, none of which are the one you asked about.",
    open: "I will do it. Probably. After the other six things.",
    close: "Which deadline? I have made seven.",
  },
  {
    key: "OPTIMISTIC_REALIST",
    label: "The Optimistic Realist",
    blurb: "Knows exactly what is going wrong and narrates it beautifully.",
    open: "It is going to be fine. I want to be clear that it will not be fine.",
    close: "I did say that, right at the start.",
  },
  {
    key: "LAST_MINUTE_PANIC",
    label: "The Last-Minute Panic",
    blurb: "Performs brilliantly at 3am, the night before. Never before.",
    open: "Plenty of time actually.",
    close: "WHY DID NOBODY TELL ME THE DEADLINE WAS REAL.",
  },
  {
    key: "METHODICAL_MASOCHIST",
    label: "The Methodical Masochist",
    blurb: "Has eleven subtasks, a spreadsheet, and no finished item.",
    open: "I have prepared extensively. Nothing is finished.",
    close: "The plan was flawless. I am the variable.",
  },
  {
    key: "PROCALLED_PROVOCATIONIST",
    label: "The Procalled Provocationist",
    blurb: "Wants to be chased. Chases you back. It is a whole thing.",
    open: "I thrive under pressure. Bring it.",
    close: "Okay I did not thrive under pressure.",
  },
] as const;

export type PersonalityKey = (typeof PERSONALITIES)[number]["key"];

export function personalityMeta(key: string) {
  return PERSONALITIES.find((p) => p.key === key) ?? PERSONALITIES[0];
}

/**
 * Days remaining until the deadline. Negative means overdue.
 */
export function daysUntil(dueAt: Date, now: Date = new Date()): number {
  return (dueAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
}

/**
 * Base tier from deadline proximity. Deterministic.
 *   > 7 days out        -> 1 (Polite)
 *   3-7 days out        -> 2
 *   1-3 days out        -> 3
 *   < 1 day out         -> 4
 *   overdue             -> 5
 */
export function baseTier(dueAt: Date, now: Date = new Date()): Tier {
  const days = daysUntil(dueAt, now);
  if (days < 0) return 5;
  if (days < 1) return 4;
  if (days < 3) return 3;
  if (days < 7) return 2;
  return 1;
}

/**
 * Final tier = base tier from the clock, shifted by the user's chaos level.
 * Chaos 1 softens by one, chaos 5 sharpens by one, chaos 3 is exactly the clock.
 */
export function tierFor(dueAt: Date, chaosLevel: number, now: Date = new Date()): Tier {
  const base = baseTier(dueAt, now);
  const shift = Math.round((chaosLevel - 3) / 2);
  const value = Math.min(5, Math.max(1, base + shift));
  return value as Tier;
}

export function tierMeta(tier: number) {
  return TIERS.find((t) => t.tier === tier) ?? TIERS[0];
}

const TIER_COPY: Record<Tier, string[]> = {
  1: [
    "Just a friendly heads-up: {title} is due in about {when}. No rush. (Some rush.)",
    "A gentle reminder that {title} exists and would love to be finished by {when}.",
    "{title} is due {when}. I am not worried. I am simply mentioning it, loudly, in a calm voice.",
    "You have until {when} for {title}. That is a whole number of days. You are welcome.",
    "Hello! {title} would like to know what your plans are for {when}.",
  ],
  2: [
    "{title} is due {when}. Just checking that {title} and you are still on speaking terms.",
    "Interesting how {title} has been on your list since last week. Due {when}.",
    "{when} until {title}. Not that anyone is counting. Apart from me. I am counting.",
    "Hi! {title} is due {when}. I looked it up so you don't have to. You should look it up.",
    "Just so you know, {title} is due {when}, and the calendar has started making eye contact with you.",
  ],
  3: [
    "{title} is due {when}. I have started a formal record of this. There is a spreadsheet.",
    "This is now the third reminder about {title}. Due {when}. The file is getting thick.",
    "{title} is due {when}. I am writing to you in the tone of a concerned lighthouse keeper.",
    "To summarise the situation with {title}: it is due {when}. Thank you for your service.",
    "{title}: due {when}. I have drafted a strongly worded email to myself about this.",
  ],
  4: [
    "{title} is due {when}. I have moved on to the stage of the conversation where I use your full name.",
    "URGENT, in the calmest possible voice: {title}. {when}. Today. The day itself.",
    "{title} is due {when}. I have started sending messages in all caps and then correcting them.",
    "{when}. {title}. These two facts are now permanently joined in my mind.",
    "This is a genuine emergency about a spreadsheet: {title}. Due {when}. Please.",
  ],
  5: [
    "{title} was due {when}. It is now the day after {when}. We are in the aftermath.",
    "{title} is {past}. I have written a eulogy. It was short. It was not kind.",
    "It is {now}. {title} was due {when}. The deadline has passed and so have my expectations.",
    "{title} was due {when}. I have moved on to grief. The stage is real and I am in it.",
    "Dear {title}, you were due {when}. You did not come. I have taken up a new hobby of disappointment.",
  ],
};

const MEME_TOP: Record<Tier, string[]> = {
  1: ["{title}", "due {when}"],
  2: ["{title}", "still not done"],
  3: ["{title}", "{when}. seriously."],
  4: ["{title}", "DUE {when}"],
  5: ["{title}", "was due {when}"],
};

const MEME_BOTTOM: Record<Tier, string[]> = {
  1: ["me", "totally on top of it"],
  2: ["me", "checking the tracker"],
  3: ["me", "this is fine"],
  4: ["me", "panicking professionally"],
  5: ["me", "accepting my fate"],
};

/**
 * Stable pseudo-random pick so the same roast always renders the same meme.
 */
function pick<T>(items: T[], seed: number): T {
  const idx = Math.abs(Math.floor(seed)) % items.length;
  return items[idx];
}

export interface RoastContext {
  title: string;
  dueAt: Date;
  chaosLevel: number;
  personality: string;
  now?: Date;
  seed?: number;
}

function humaniseWhen(dueAt: Date, now: Date): { when: string; past: string; now: string } {
  const days = daysUntil(dueAt, now);
  const abs = Math.abs(days);
  const rounded = abs < 1 ? Math.max(0, Math.round(abs * 24)) : Math.round(abs);
  const phrase = abs < 1 ? `${rounded} hour${rounded === 1 ? "" : "s"}` : `${rounded} day${rounded === 1 ? "" : "s"}`;
  return {
    when: days >= 0 ? `in ${phrase}` : `${phrase} ago`,
    past: `${phrase} ago`,
    now: "now",
  };
}

/**
 * Builds a roast: body copy + meme caption, both tier- and personality-aware.
 */
export function buildRoast(ctx: RoastContext) {
  const now = ctx.now ?? new Date();
  const tier = tierFor(ctx.dueAt, ctx.chaosLevel, now);
  const persona = personalityMeta(ctx.personality);
  const seed = ctx.seed ?? Math.floor(ctx.dueAt.getTime() / 1000) + tier;
  const when = humaniseWhen(ctx.dueAt, now);

  const body = pick(TIER_COPY[tier], seed)
    .replaceAll("{title}", ctx.title)
    .replaceAll("{when}", when.when)
    .replaceAll("{past}", when.past)
    .replaceAll("{now}", when.now);

  const memeTop = pick(MEME_TOP[tier], seed + 1)
    .replaceAll("{title}", ctx.title)
    .replaceAll("{when}", when.when.toUpperCase())
    .replaceAll("{past}", when.past);

  const memeBottom = pick(MEME_BOTTOM[tier], seed + 2);

  return {
    tier,
    tierKey: tierMeta(tier).key,
    tierLabel: tierMeta(tier).label,
    body,
    personalityFlavour: tier >= 4 ? persona.close : persona.open,
    memeTop,
    memeBottom,
  };
}
