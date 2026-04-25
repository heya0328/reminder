docs/skills/apps-in-toss.md 파일을 참고하세요.
docs/skills/tds-mobile.md 파일을 참고하세요.


## Rules

1. 많은 부분을 수정해야 한다면 반드시 나에게 물어보고 진행해.
2. 하나의 파일에 코드를 다 넣지 말고, 기능별로 모듈화 해.
3. 내 요청이 명확하지 않을 때 추론 및 실행하지 말고 우선 내 설명을 제대로 이해했는지 물어봐줘.



기획이나 지시가 명료하지 않을 때, 다음과 같은 순서로 진행할 것.

gstack과 superpowers를 통해 서비스를 구체화하고  확실한  기획을 바탕으로 앱인토스 서비스를 구현해야함.         

1. gstack의 office hour
2. superpowers의 brainstorming
3. writing-plans
4. Git worktrees
5. sub-agent dev





---



## 앱인토스 개발 규칙

### 1. TDS 컴포넌트 필수 사용 (최우선 규칙)

- 비게임 미니앱은 반드시 **TDS(Toss Design System) 컴포넌트**를 사용하여 구현해야 한다.
- TDS 외의 자체 UI 컴포넌트를 만들거나, 외부 UI 라이브러리를 사용해서는 안 된다.
- 구현 전 TDS 문서를 MCP(`search_tds_web_docs` 또는 `search_tds_rn_docs`)로 먼저 검색하고, TDS에서 제공하는 컴포넌트로 구현 가능한지 반드시 검토한 후 작업한다.
- TDS에 해당 컴포넌트가 없는 경우에만(캐러셀, 파티클 이펙트, 드래그 제스처 등) 직접 구현한다.

### 2. Apps-in-Toss MCP, Plugin, Docs 기반 구현

- 모든 구현은 **Apps-in-Toss MCP 도구**, **Apps-in-Toss Plugin**, **Apps-in-Toss Developer Center 문서**를 기반으로 한다.
- 추측이나 일반적인 지식이 아닌, 공식 문서와 가이드에 명시된 내용을 바탕으로만 구현해야 한다.
- 구현 전 반드시 관련 문서를 MCP 도구(`search_docs`, `get_doc`, `search_tds_web_docs`, `get_tds_web_doc` 등)로 조회하여 정확한 가이드를 확인한다.
- 문서에서 확인되지 않는 API나 패턴은 사용하지 않는다.

### 3. SDK API 호출 패턴

- 모든 SDK API 호출은 `**isSupported()` 체크 → try-catch → 에러 핸들러** 3단계를 따른다.
- 비토스 환경(로컬 브라우저, 시뮬레이터)에서 크래시가 나지 않도록 항상 방어 코드를 작성한다.
- SDK API가 실패해도 사용자 flow를 차단하지 않는다 (예: 광고 로드 실패 → 바로 다음 단계 진행).

```tsx
// 기본 패턴
if (someAPI.isSupported?.()) {
  try {
    await someAPI(options);
  } catch { /* 비토스 환경 폴백 */ }
}
```

### 4. 이벤트 리스너 cleanup 필수

- `graniteEvent`, `tdsEvent`, `appsInTossEvent` 등 모든 이벤트 리스너는 반드시 `useEffect` return에서 해제한다.
- 이벤트 등록 시 `onError` 핸들러를 항상 포함한다.
- 이벤트 등록 자체를 try-catch로 감싸서 비토스 환경에서의 에러를 방지한다.

```tsx
useEffect(() => {
  let unsubscribe: (() => void) | undefined;
  try {
    unsubscribe = graniteEvent.addEventListener('backEvent', {
      onEvent: handler,
      onError: (error) => console.error(error),
    });
  } catch { /* 비토스 환경 */ }
  return () => { unsubscribe?.(); };
}, [handler]);
```

### 5. backEvent 뒤로가기 처리

- `backEvent`를 등록하면 기본 뒤로가기 동작이 차단된다. 모든 뒤로가기 로직을 직접 구현해야 한다.
- **BACK_MAP 패턴**: 각 페이지에서 뒤로가기 시 어디로 가는지를 `Record<Page, Page | null>`로 명시적으로 정의한다. `null`이면 종료 다이얼로그를 띄운다.
- 이벤트 핸들러 내부에서 페이지 상태를 참조할 때는 `useRef`를 사용해 클로저 문제를 방지한다.

### 6. 광고 통합 패턴

- 전면광고는 **load → show → load → show** 순환이 핵심이다. `dismissed` 후 반드시 다음 광고를 재로드한다.
- 보상은 `**userEarnedReward` 이벤트에서만** 지급한다. `dismissed`에서 지급하면 안 된다.
- 광고 로드는 마운트 시 즉시 하고, 표시는 사용자 액션에서 한다.
- 광고 로드/표시 실패 시에도 앱 기능을 차단하지 않고 바로 다음 단계로 진행한다.
- 배너광고 컨테이너: `width: 100%`, `height: 96px` 권장.

### 7. 데이터 페칭 & 캐싱

- 같은 데이터를 여러 컴포넌트가 동시에 요청할 수 있으므로, **모듈 스코프 변수로 in-flight 요청을 중복 방지**한다.
- 세션 캐시는 날짜 기반 TTL로 관리한다 (오늘 날짜와 비교하여 캐시 유효성 판단).
- `sessionStorage` 접근은 항상 try-catch로 감싼다 (private browsing 등에서 실패 가능).
- **Storage(SDK 네이티브)** vs **sessionStorage(Web)**: 영구 데이터는 `Storage`, 세션 캐시는 `sessionStorage`.
- `AsyncStorage` 사용 금지 (whiteout 이슈 발생). 반드시 SDK `Storage` 사용.

### 8. 코드 구조 & 모듈화

```
src/
├── components/     # 프레젠테이션 컴포넌트 (상태 최소화)
├── pages/          # 풀페이지 컴포넌트 (상태 + 비즈니스 로직)
│   └── {feature}/  # 퍼널별 서브디렉토리 (types.ts 포함)
├── hooks/          # 커스텀 훅 (SDK 래핑, 상태 로직)
├── lib/            # 유틸리티, 서비스 초기화
│   └── {domain}/   # 도메인별 서브디렉토리
├── data/           # 데이터 페칭 + 캐싱 로직
├── types/          # 공유 타입 정의
└── constants/      # 상수
```

- **한 파일 = 한 책임**: 컴포넌트, 훅, 데이터 로직을 분리한다.
- **SDK 래핑은 커스텀 훅으로**: `useFullScreenAd`, `useBannerAd` 등 SDK 호출을 훅으로 캡슐화한다.
- **데이터 로직은 `data/`에**: 컴포넌트에서 Supabase 등 데이터 소스를 직접 호출하지 않는다.
- **퍼널 데이터 흐름**: 부모(App)에서 상태를 들고, 각 퍼널 페이지에 props로 전달. `Omit<FullType, 'laterField'>`로 중간 타입을 관리한다.

### 9. 리뷰 필수 체크리스트

- 핀치줌 비활성화 (`user-scalable=no`) — 미적용 시 반려
- TDS 컴포넌트만 사용 (자체/외부 UI 라이브러리 없음)
- 네비게이션 바 커스텀 UI 없음 (SDK 기본 네비게이션 바 사용)
- 자체 앱 설치 유도 또는 외부 링크 리다이렉션 없음
- 권한은 `granite.config.ts`에 선언된 것만 사용
- 번들 크기 100MB 이하

### 10. 프로젝트 설정 주의사항

- `granite.config.ts`의 `appName`은 딥링크 키(`intoss://{appName}`)로 사용되며 콘솔에 등록된 값과 일치해야 한다.
- 실기기 테스트 시 `web.host`를 디바이스가 접근 가능한 IP 주소로 설정하고, dev 명령에 `--host` 플래그를 추가한다.
- CORS 설정: 프로덕션(`https://{appName}.apps.tossmini.com`)과 QR 테스트(`https://{appName}.private-apps.tossmini.com`)의 origin이 다르다.

## Skill routing

When the user's request matches an available skill, ALWAYS invoke it using the Skill
tool as your FIRST action. Do NOT answer directly, do NOT use other tools first.
The skill has specialized workflows that produce better results than ad-hoc answers.

Key routing rules:
- Product ideas, "is this worth building", brainstorming → invoke office-hours
- Bugs, errors, "why is this broken", 500 errors → invoke investigate
- Ship, deploy, push, create PR → invoke ship
- QA, test the site, find bugs → invoke qa
- Code review, check my diff → invoke review
- Update docs after shipping → invoke document-release
- Weekly retro → invoke retro
- Design system, brand → invoke design-consultation
- Visual audit, design polish → invoke design-review
- Architecture review → invoke plan-eng-review
- Save progress, checkpoint, resume → invoke checkpoint
- Code quality, health check → invoke health

