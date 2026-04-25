import { AnimatePresence, motion } from "motion/react";
import type { ButtonHTMLAttributes, MouseEventHandler } from "react";
import { useCallback, useMemo, useState } from "react";

type EmojiConfig = {
  symbol: string;
  label: string;
  accent: string;
  glow: string;
  burst: string[];
};

type ReactionParticle = {
  id: number;
  config: EmojiConfig;
  offsetX: number;
  offsetY: number;
  burstSize: number;
};

type FloatingPiece = {
  id: string;
  symbol: string;
  size: number;
  startX: number;
  driftX: number;
  lift: number;
  rotate: number;
  delay: number;
  duration: number;
  popScale: number;
  endScale: number;
};

type OrbitRing = {
  id: string;
  size: number;
  rotate: number;
  duration: number;
};

type ReactionButtonProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "children"
> & {
  config: EmojiConfig;
  onReact?: (config: EmojiConfig) => void;
};

const EMOJIS: EmojiConfig[] = [
  {
    symbol: "🔥",
    label: "Fire",
    accent: "from-orange-400 via-rose-400 to-fuchsia-500",
    glow: "rgba(251, 146, 60, 0.5)",
    burst: ["✨", "💥", "🔥"],
  },
  {
    symbol: "💖",
    label: "Love",
    accent: "from-pink-400 via-rose-300 to-red-400",
    glow: "rgba(244, 114, 182, 0.48)",
    burst: ["💗", "💕", "💞"],
  },
  {
    symbol: "😂",
    label: "Laugh",
    accent: "from-amber-300 via-yellow-300 to-orange-300",
    glow: "rgba(250, 204, 21, 0.46)",
    burst: ["🤣", "✨", "😂"],
  },
  {
    symbol: "👏",
    label: "Clap",
    accent: "from-sky-300 via-cyan-300 to-blue-400",
    glow: "rgba(96, 165, 250, 0.42)",
    burst: ["🙌", "👏", "⚡"],
  },
  {
    symbol: "😍",
    label: "Wow",
    accent: "from-violet-400 via-fuchsia-400 to-pink-400",
    glow: "rgba(192, 132, 252, 0.42)",
    burst: ["🤩", "✨", "😍"],
  },
];

export function ReactionDemo() {
  const [activeReactions, setActiveReactions] = useState<ReactionParticle[]>([]);

  const addReaction = useCallback((config: EmojiConfig) => {
    const id = Date.now() + Math.floor(Math.random() * 10_000);
    const particle = {
      id,
      config,
      offsetX: Math.round((Math.random() - 0.5) * 140),
      offsetY: Math.round(Math.random() * 36),
      burstSize: 0.92 + Math.random() * 0.32,
    };

    setActiveReactions((current) => [...current, particle]);

    window.setTimeout(() => {
      setActiveReactions((current) => current.filter((item) => item.id !== id));
    }, 2400);
  }, []);

  return (
    <main className="relative isolate min-h-screen overflow-hidden px-6 py-10 text-white">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-6xl flex-col justify-between gap-10">
        <section className="grid gap-6 pt-8 md:max-w-3xl">
          <span className="w-fit rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-white/70">
            Live Reaction Playground
          </span>
          <div className="space-y-4">
            <h1 className="font-display text-5xl leading-none text-white md:text-7xl">
              클릭할 때마다 이모지가 살아 움직이는 반응형 리액션 UI
            </h1>
            <p className="max-w-2xl text-base leading-7 text-slate-300 md:text-lg">
              단순히 위로 뜨는 수준이 아니라, 메인 이모지와 작은 버스트 이모지,
              스파클, 링 웨이브가 겹쳐지면서 라이브 쇼핑이나 SNS에서 보는 듯한
              풍성한 감도를 목표로 만들었습니다.
            </p>
          </div>
        </section>

        <section className="relative flex flex-1 items-end justify-center pb-8 pt-24">
          <AnimatePresence>
            {activeReactions.map((reaction) => (
              <ReactionBurst key={reaction.id} reaction={reaction} />
            ))}
          </AnimatePresence>

          <div className="relative w-full max-w-3xl">
            <div className="absolute inset-x-10 bottom-6 h-24 rounded-full bg-cyan-400/10 blur-3xl" />
            <div className="relative rounded-[2rem] border border-white/10 bg-white/[0.08] p-4 shadow-glow backdrop-blur-xl md:p-5">
              <div className="grid gap-3 sm:grid-cols-5">
                {EMOJIS.map((config) => (
                  <ReactionButton
                    key={config.symbol}
                    config={config}
                    onReact={addReaction}
                    className="group relative overflow-hidden rounded-[1.6rem] border border-white/10 bg-white/5 px-3 py-4 transition hover:bg-white/10"
                  />
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function ReactionButton({
  config,
  onClick,
  onReact,
  className = "",
  ...props
}: ReactionButtonProps) {
  const handleClick: MouseEventHandler<HTMLButtonElement> = useCallback(
    (event) => {
      onClick?.(event);
      onReact?.(config);
    },
    [config, onClick, onReact],
  );

  return (
    <button
      {...props}
      type="button"
      onClick={handleClick}
      className={`${className} min-h-28`}
      aria-label={`${config.label} reaction`}
    >
      <div
        className={`absolute inset-0 bg-gradient-to-br ${config.accent} opacity-0 transition duration-300 group-hover:opacity-20`}
      />
      <div className="relative flex flex-col items-center gap-2">
        <span className="text-4xl transition duration-300 group-hover:scale-110 group-active:scale-95">
          {config.symbol}
        </span>
        <span className="text-sm font-semibold tracking-wide text-white/80">
          {config.label}
        </span>
      </div>
    </button>
  );
}

function ReactionBurst({ reaction }: { reaction: ReactionParticle }) {
  const seed = reaction.id;
  const pieces = useMemo(
    () => buildFloatingPieces(reaction.config, seed),
    [reaction.config, seed],
  );
  const rings = useMemo(() => buildOrbitRings(seed), [seed]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.72, y: 36 }}
      animate={{
        opacity: 1,
        scale: reaction.burstSize,
        x: reaction.offsetX,
        y: -reaction.offsetY,
      }}
      exit={{ opacity: 0 }}
      className="pointer-events-none absolute bottom-32 left-1/2 z-20 h-[22rem] w-[22rem] -translate-x-1/2"
    >
      <motion.div
        className="absolute left-1/2 top-[62%] h-32 w-32 -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl"
        style={{ backgroundColor: reaction.config.glow }}
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 0.85, 0] }}
        transition={{ duration: 1.8, ease: "easeOut" }}
      />

      {rings.map((ring) => (
        <motion.div
          key={ring.id}
          className="absolute left-1/2 top-[58%] rounded-full border border-white/20"
          style={{
            width: ring.size,
            height: ring.size,
            marginLeft: -ring.size / 2,
            marginTop: -ring.size / 2,
          }}
          initial={{ opacity: 0.35, scale: 0.2, rotate: ring.rotate }}
          animate={{ opacity: 0, scale: 1.7, rotate: ring.rotate + 18 }}
          transition={{ duration: ring.duration, ease: "easeOut" }}
        />
      ))}

      {pieces.map((piece, index) => (
        <motion.div
          key={piece.id}
          className="absolute left-1/2 top-[58%] text-center drop-shadow-[0_8px_20px_rgba(0,0,0,0.35)]"
          initial={{
            x: piece.startX,
            y: 0,
            scale: 0.45 + (index === 0 ? 0.2 : 0),
            opacity: 0,
            rotate: piece.rotate * 0.35,
          }}
          animate={{
            x: piece.startX + piece.driftX,
            y: -piece.lift,
            rotate: piece.rotate,
            scale: [0.5, piece.popScale, piece.endScale],
            opacity: [0, 1, 0],
          }}
          transition={{
            duration: piece.duration,
            delay: piece.delay,
            ease: [0.2, 0.8, 0.2, 1],
          }}
        >
          <span
            className={index === 0 ? "animate-float" : ""}
            style={{ fontSize: `${piece.size}px` }}
          >
            {piece.symbol}
          </span>
        </motion.div>
      ))}
    </motion.div>
  );
}

function buildFloatingPieces(config: EmojiConfig, seed: number): FloatingPiece[] {
  const generator = createSeededRandom(seed);
  const count = 10 + Math.floor(generator() * 5);

  return Array.from({ length: count }, (_, index) => {
    const symbol =
      index === 0
        ? config.symbol
        : config.burst[Math.floor(generator() * config.burst.length)];
    const size = index === 0 ? 60 + Math.round(generator() * 18) : Math.round(20 + generator() * 28);
    const driftDirection = generator() > 0.5 ? 1 : -1;

    return {
      id: `${seed}-${index}`,
      symbol,
      size,
      startX: Math.round((generator() - 0.5) * 42),
      driftX: Math.round((40 + generator() * 180) * driftDirection),
      lift: Math.round(120 + generator() * 190 + index * 10),
      rotate: Math.round((generator() - 0.5) * 160),
      delay: index === 0 ? 0 : generator() * 0.18,
      duration: 1.2 + generator() * 1.2,
      popScale: 0.95 + generator() * 0.65,
      endScale: 0.72 + generator() * 0.38,
    };
  });
}

function buildOrbitRings(seed: number): OrbitRing[] {
  const generator = createSeededRandom(seed + 44);

  return Array.from({ length: 3 }, (_, index) => ({
    id: `ring-${seed}-${index}`,
    size: 70 + index * 42 + Math.round(generator() * 10),
    rotate: Math.round(generator() * 120),
    duration: 0.8 + index * 0.2,
  }));
}

function createSeededRandom(seed: number) {
  let value = seed % 2147483647;

  if (value <= 0) {
    value += 2147483646;
  }

  return () => {
    value = (value * 16807) % 2147483647;
    return (value - 1) / 2147483646;
  };
}
