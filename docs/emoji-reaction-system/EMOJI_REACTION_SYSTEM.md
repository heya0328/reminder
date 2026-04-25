# Emoji Reaction System Documentation

이 문서는 현재 프로젝트에 구현된 이모지 리액션 인터랙션의 핵심 구조를 실제 코드와 함께 정리한 문서다.  
대상 파일은 [src/components/ui/reaction-showcase.tsx](/Users/soon/Documents/New%20project/src/components/ui/reaction-showcase.tsx), [src/index.css](/Users/soon/Documents/New%20project/src/index.css) 이다.

## 1. 이 인터랙션이 만들고 있는 경험

이 리액션 UI의 목표는 단순히 "이모지가 위로 올라가는 효과"가 아니다.  
클릭 순간마다 아래 요소가 동시에 겹치면서, 라이브 쇼핑이나 SNS 라이브 반응처럼 화면이 살아 있는 느낌을 만든다.

- 메인 이모지가 중심이 되어 크게 떠오른다.
- 작은 버스트 이모지들이 주변으로 흩어진다.
- 은은한 색 글로우가 뒤에서 번진다.
- 반투명 링이 퍼지며 "터짐"의 잔향을 만든다.
- 매 클릭마다 위치, 크기, 회전, 퍼짐 방향이 달라져 반복 클릭이 지루하지 않다.

핵심은 "랜덤" 자체가 아니라, 랜덤이 시각적으로 설계되어 있다는 점이다.  
아무 값이나 흔드는 것이 아니라, 메인 이모지는 더 존재감 있게, 주변 버스트는 더 경쾌하게, 전체 덩어리는 미세하게 다른 위치에서 시작되도록 계층적으로 설계했다.

## 2. 실제 핵심 코드

아래는 현재 동작하는 핵심 컴포넌트 전체 코드다.

```tsx
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
    const size =
      index === 0
        ? 60 + Math.round(generator() * 18)
        : Math.round(20 + generator() * 28);
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
```

## 3. 클릭했을 때 실제로 어떤 값이 변하는가

클릭 순간의 시작점은 `ReactionButton` 이 아니라 `ReactionDemo` 내부의 `addReaction` 이다.

```tsx
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
```

여기서 한 번 클릭할 때마다 `ReactionParticle` 하나가 새로 만들어져 `activeReactions` 배열에 추가된다.

### 생성되는 값의 의미

- `id`
  각 리액션 인스턴스를 구분하는 고유값이다. 여러 번 연속 클릭해도 각 애니메이션이 독립적으로 유지된다.
- `config`
  어떤 이모지 세트를 썼는지에 대한 시각 테마다. 메인 이모지, 버스트용 보조 이모지, 배경 글로우 색이 여기 들어 있다.
- `offsetX`
  전체 버스트 덩어리가 좌우 어디에서 시작될지를 결정한다.  
  같은 버튼을 연속 클릭해도 매번 정확히 같은 위치에서 터지지 않게 해준다.
- `offsetY`
  버스트가 위로 얼마나 조금 더 들려서 시작할지를 결정한다.  
  수직 위치가 살짝씩 달라져서 레이어가 겹칠 때 더 자연스럽다.
- `burstSize`
  이번 클릭의 전체 이펙트 스케일이다.  
  어떤 클릭은 약간 작고, 어떤 클릭은 조금 더 크게 느껴진다.

이 3개의 값만으로도 "클릭할 때마다 똑같이 재생되는 GIF 같은 느낌"이 사라진다.

## 4. 화면을 채우는 실제 흐름

클릭 후 렌더링 흐름은 아래 순서로 진행된다.

1. 버튼 클릭
2. `onReact(config)` 호출
3. `activeReactions` 배열에 새로운 `ReactionParticle` 추가
4. `AnimatePresence`가 새 항목을 감지
5. 각 `ReactionParticle`에 대해 `ReactionBurst` 렌더링
6. `ReactionBurst` 내부에서 `pieces`, `rings`가 `seed` 기반으로 생성
7. 글로우, 링, 이모지 조각들이 동시에 다른 모션으로 재생
8. 2400ms 후 해당 리액션이 배열에서 제거됨
9. `AnimatePresence`가 exit 애니메이션을 처리하며 마무리

핵심은 "한 개의 클릭 이벤트가 여러 레이어 애니메이션으로 분해된다"는 점이다.

## 5. 랜덤성이 실제로 작동하는 방식

이 구현은 완전 무작위처럼 보이지만, 사실은 `seed` 기반 난수로 제어된다.

```tsx
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
```

이 방식의 장점은 아래와 같다.

- 클릭마다 다른 결과가 나온다.
- 같은 리액션 인스턴스 안에서는 계산이 일관된다.
- `pieces`, `rings` 가 서로 충돌하지 않고 하나의 묶음처럼 보인다.

즉, "무질서한 랜덤"이 아니라 "통제된 랜덤"이다.

## 6. 이모지 조각이 퍼지는 로직

실제 시각적 다양성은 `buildFloatingPieces` 에서 만들어진다.

```tsx
function buildFloatingPieces(config: EmojiConfig, seed: number): FloatingPiece[] {
  const generator = createSeededRandom(seed);
  const count = 10 + Math.floor(generator() * 5);

  return Array.from({ length: count }, (_, index) => {
    const symbol =
      index === 0
        ? config.symbol
        : config.burst[Math.floor(generator() * config.burst.length)];
    const size =
      index === 0
        ? 60 + Math.round(generator() * 18)
        : Math.round(20 + generator() * 28);
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
```

### 각 값이 시각적으로 의미하는 것

- `count`
  한 번 클릭할 때 생성되는 조각 개수다.  
  10개에서 14개 사이를 오가므로 밀도가 매번 달라진다.
- `symbol`
  `index === 0` 은 메인 이모지를 보장한다.  
  나머지는 `burst` 배열에서 골라 주변 장식 역할을 한다.
- `size`
  메인 이모지는 크게, 보조 이모지는 작게 만든다.  
  계층감이 생겨 화면이 정돈되어 보인다.
- `startX`
  시작 시점의 좌우 편차다.  
  모든 조각이 완전히 같은 중앙에서 나오지 않도록 살짝 흩어준다.
- `driftX`
  좌우 퍼짐 거리다.  
  이 값이 크기 때문에 클릭할 때마다 확산 방향성이 눈에 잘 들어온다.
- `lift`
  위로 떠오르는 거리다.  
  단순히 투명해지며 사라지는 것이 아니라 "날아오른다"는 인상을 만든다.
- `rotate`
  회전 값이다.  
  이모지들이 평면적인 스프라이트가 아니라 가볍게 튕기듯 날리는 느낌을 준다.
- `delay`
  모든 조각이 동시에 정확히 출발하지 않게 한다.  
  이 미세한 차이가 생동감을 만든다.
- `duration`
  짧게 터지는 조각과 천천히 떠오르는 조각이 섞인다.
- `popScale`
  중간 지점에서 얼마나 크게 튀어 오를지 결정한다.
- `endScale`
  끝날 때 어느 크기로 마무리될지 결정한다.  
  끝 프레임까지 너무 딱딱하지 않게 만든다.

## 7. 실제 애니메이션 렌더링 방식

조각이 움직이는 코드는 아래 부분이다.

```tsx
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
```

### 이 코드가 만드는 움직임

- `x`
  중앙에서 좌우로 퍼지는 확산감.
- `y`
  위로 떠오르는 부유감.
- `rotate`
  각 조각의 비틀림.
- `scale: [0.5, piece.popScale, piece.endScale]`
  등장 시 작게 시작했다가 한 번 부풀고, 마지막에 살짝 줄어들며 사라진다.
- `opacity: [0, 1, 0]`
  갑자기 튀어나오는 대신 자연스럽게 나타났다 사라진다.

여기서 중요한 것은 값 하나가 아니라 조합이다.  
`x + y + rotate + scale + opacity + delay + duration` 이 동시에 다르게 움직이기 때문에 풍부해 보인다.

## 8. 전체 버스트 덩어리의 랜덤성

조각 각각만 랜덤이면 부족하다.  
전체 덩어리도 매 클릭마다 조금씩 다른 위치와 크기로 나와야 한다.

```tsx
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
```

### 왜 이게 중요하나

- 모든 이모지가 같은 출발점에서만 나오면 금방 기계적으로 보인다.
- `offsetX`, `offsetY` 덕분에 레이어가 자연스럽게 쌓인다.
- `burstSize` 덕분에 어떤 클릭은 소담스럽고, 어떤 클릭은 더 화려하게 보인다.

이 차이는 매우 작지만, 반복 클릭할 때 체감되는 품질 차이는 꽤 크다.

## 9. 심미적인 완성도를 위해 추가한 디테일

이 구현이 단순 예제보다 더 매력적으로 느껴지는 핵심은 아래 디테일들이다.

### 9-1. 메인 이모지와 보조 이모지의 역할 분리

- 첫 번째 조각은 항상 메인 이모지다.
- 나머지는 `burst` 배열의 보조 이모지다.
- 이 구조 덕분에 사용자는 "내가 누른 반응"을 즉시 인식하면서도, 주변 장식에서 풍성함을 느낀다.

### 9-2. 색상 테마를 이모지별로 분리

```tsx
{
  symbol: "💖",
  label: "Love",
  accent: "from-pink-400 via-rose-300 to-red-400",
  glow: "rgba(244, 114, 182, 0.48)",
  burst: ["💗", "💕", "💞"],
}
```

- 버튼 hover 그라데이션
- 버스트 뒤쪽의 글로우
- 보조 이모지 종류

이 세 가지가 하나의 테마로 묶여 있기 때문에 버튼을 누르기 전부터 누른 후까지 경험이 이어진다.

### 9-3. 링 웨이브 추가

```tsx
function buildOrbitRings(seed: number): OrbitRing[] {
  const generator = createSeededRandom(seed + 44);

  return Array.from({ length: 3 }, (_, index) => ({
    id: `ring-${seed}-${index}`,
    size: 70 + index * 42 + Math.round(generator() * 10),
    rotate: Math.round(generator() * 120),
    duration: 0.8 + index * 0.2,
  }));
}
```

이 링은 직접적으로 "이모지"는 아니지만, 클릭의 충격파처럼 느껴지는 시각적 잔향을 만들어 준다.  
리액션을 단순 오브젝트 애니메이션이 아니라 "이벤트"처럼 느끼게 하는 중요한 장치다.

### 9-4. 글로우 레이어

```tsx
<motion.div
  className="absolute left-1/2 top-[62%] h-32 w-32 -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl"
  style={{ backgroundColor: reaction.config.glow }}
  initial={{ opacity: 0 }}
  animate={{ opacity: [0, 0.85, 0] }}
  transition={{ duration: 1.8, ease: "easeOut" }}
/>
```

글로우는 배경에 색을 남긴다.  
이 레이어가 없으면 요소는 움직여도 장면이 채워지는 느낌이 약하다.  
글로우가 들어가면 화면에 체류하는 빛이 생겨 훨씬 고급스럽다.

### 9-5. 메인 이모지에만 `animate-float` 적용

메인 조각에만 아주 미세한 부유 애니메이션을 추가해서, 그 이모지가 장면의 주인공처럼 느껴지게 했다.  
모든 조각에 다 넣으면 산만해지고, 하나에만 넣으면 중심이 생긴다.

## 10. 배경과 버튼 자체의 미감 설계

인터랙션만 화려하면 부족하다. 배경과 버튼도 받쳐줘야 한다.

현재 전역 스타일은 아래와 같다.

```css
@import url("https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;700;800&family=Space+Grotesk:wght@500;700&display=swap");

@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  color: #f5f7fb;
  background:
    radial-gradient(circle at top, rgba(255, 135, 135, 0.18), transparent 28%),
    radial-gradient(circle at 20% 20%, rgba(251, 191, 36, 0.2), transparent 24%),
    radial-gradient(circle at 80% 0%, rgba(96, 165, 250, 0.2), transparent 20%),
    linear-gradient(180deg, #09111f 0%, #050816 52%, #03050c 100%);
  font-family: "Manrope", sans-serif;
}

* {
  box-sizing: border-box;
}

html,
body,
#root {
  min-height: 100%;
  margin: 0;
}

body {
  min-height: 100vh;
}

body::before,
body::after {
  content: "";
  position: fixed;
  inset: auto;
  pointer-events: none;
  filter: blur(80px);
  opacity: 0.45;
}

body::before {
  top: 10%;
  left: -8%;
  width: 24rem;
  height: 24rem;
  background: rgba(244, 114, 182, 0.18);
}

body::after {
  right: -4%;
  bottom: 8%;
  width: 20rem;
  height: 20rem;
  background: rgba(59, 130, 246, 0.18);
}
```

### 이 스타일의 역할

- 평면 단색 배경 대신 다층 그라데이션으로 분위기를 만든다.
- 고정된 흐린 빛 번짐이 있어 화면 자체가 이미 "라이브 무드"를 가진다.
- 버튼 카드에 `backdrop-blur`, 반투명 배경, 얇은 테두리를 써서 유리 같은 밀도를 준다.

즉, 리액션이 올라가지 않는 순간에도 화면이 심심하지 않다.

## 11. 왜 하얀 선 효과를 제거했는가

초기 버전에는 스파클 선이 있었다.  
하지만 사용성 관점에서는 아래 이유로 제거한 편이 더 좋다.

- 이모지보다 먼저 눈에 들어와 주인공을 빼앗을 수 있다.
- 얇은 흰 선은 스타일에 따라 "이상한 노이즈"처럼 느껴질 수 있다.
- 지금 구조에서는 링과 글로우만으로도 충분히 터지는 감각을 전달할 수 있다.

즉, 더 많이 넣는 것이 항상 더 좋은 것은 아니다.  
현재 버전은 이모지 자체의 존재감을 높이기 위해 시각적 경쟁 요소를 일부 걷어낸 상태다.

## 12. 구현 포인트 요약

이 시스템의 퀄리티를 만드는 핵심은 아래 다섯 가지다.

1. 클릭마다 `ReactionParticle` 을 새로 만들고 배열에 누적한다.
2. 리액션 하나를 "글로우 + 링 + 메인 이모지 + 보조 이모지들"의 레이어로 분해한다.
3. 조각마다 크기, 이동거리, 회전, 시간차를 다르게 준다.
4. 전체 버스트 위치와 크기도 매 클릭마다 달라지게 만든다.
5. 배경, 카드, 타이포그래피까지 함께 설계해서 인터랙션이 더 고급스럽게 보이게 한다.

## 13. 다음 확장 아이디어

이 문서 기준 구현은 이미 충분히 풍성하지만, 실제 서비스 느낌으로 더 확장하려면 아래도 가능하다.

- 연속 탭 시 같은 이모지가 오른쪽 측면에서 스트림처럼 계속 떠오르기
- 각 이모지별 출현 빈도 카운터 추가
- 라이브 채팅과 연동해 특정 단어가 감지되면 자동 리액션 발생
- 버튼을 길게 누르면 더 큰 `burstSize` 가 나오도록 압력형 인터랙션 추가
- 모바일에서는 하단 고정 바, 데스크톱에서는 플로팅 패널로 위치 변경

## 14. 문서 위치

이 문서는 아래 경로에 저장되어 있다.

[EMOJI_REACTION_SYSTEM.md](/Users/soon/Documents/New%20project/docs/emoji-reaction-system/EMOJI_REACTION_SYSTEM.md)
