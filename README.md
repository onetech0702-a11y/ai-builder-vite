# AI Builder (React + Vite)

OneTech AI Builder Home 화면 — Next.js에서 React + Vite + TypeScript + Tailwind로 재구축.

## 로컬 실행

```bash
npm install
npm run dev
```

## 빌드

```bash
npm run build
npm run preview
```

## Vercel 배포

1. GitHub에 push
2. vercel.com → Add New Project → 이 저장소 Import
3. Framework Preset: **Vite** 자동 감지
4. Build Command: `npm run build` / Output Directory: `dist` (자동 감지됨)
5. Deploy

기존 Next.js 프로젝트와는 별개의 새 프로젝트로 Vercel에 연결하는 것을 권장합니다 (이전 프로젝트의 도메인/캐시 문제를 피하기 위함).

## 폴더 구조

```
src/
├── components/       # Header, HeroCard, IdeaInputCard, RecentProjects,
│                      ProjectListItem, TodayTasks, TaskListItem,
│                      BottomNavigation, StatusBadge, ProgressBar
├── data/mockData.ts  # 더미 데이터 + 타입
├── assets/           # 로고 이미지
├── App.tsx           # 컴포넌트 조합
└── main.tsx          # 진입점
```

## 현재 범위

Home 화면 UI만 구현. Backend/API/DB 미연결, 모든 버튼은 `console.log` 처리.
