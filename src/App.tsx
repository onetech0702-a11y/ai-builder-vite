import Header from "./components/Header";
import HeroCard from "./components/HeroCard";
import IdeaInputCard from "./components/IdeaInputCard";
import RecentProjects from "./components/RecentProjects";
import TodayTasks from "./components/TodayTasks";
import BottomNavigation from "./components/BottomNavigation";

export default function App() {
  const handleCreateProject = () => console.log("create project");
  const handleStartWithAI = () => console.log("start with ai");
  const handleViewAll = () => console.log("view all");

  return (
    <div className="mx-auto flex min-h-[100dvh] w-full max-w-[1200px] flex-col bg-white md:h-[100dvh] md:overflow-hidden">
      <Header />

      <main className="grid flex-1 grid-cols-1 gap-3 px-5 py-3 md:min-h-0 md:grid-cols-[380px_minmax(0,1fr)] md:gap-6 md:overflow-hidden md:px-8 md:py-5 lg:grid-cols-[420px_minmax(0,1fr)] lg:gap-8 lg:px-10">
        {/* Hero + 입력 카드: Desktop 좌측 고정폭, Mobile 상단 */}
        <div className="flex min-w-0 flex-col gap-3 md:gap-4">
          <HeroCard onCreateProject={handleCreateProject} />
          <IdeaInputCard onStartWithAI={handleStartWithAI} />
        </div>

        {/* 최근 프로젝트 + 오늘 할 일: 중간 화면은 세로, 넓은 화면은 2컬럼 */}
        <div className="grid min-w-0 grid-cols-1 gap-3 md:min-h-0 md:gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(260px,320px)] xl:gap-8">
          <div className="min-w-0">
            <RecentProjects onViewAll={handleViewAll} />
          </div>
          <div className="min-w-0">
            <TodayTasks onViewAll={handleViewAll} />
          </div>
        </div>
      </main>

      <BottomNavigation />
    </div>
  );
}