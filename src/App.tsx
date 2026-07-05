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
    <div className="mx-auto flex min-h-[100dvh] w-full flex-col bg-white md:h-[100dvh] md:overflow-hidden md:max-w-[820px] lg:max-w-[1200px]">
      <Header />

      <main className="flex flex-1 flex-col gap-3 px-5 py-3 md:min-h-0 md:flex-row md:gap-6 md:overflow-hidden md:px-8 md:py-5 lg:gap-8 lg:px-10">
        {/* Hero + 입력 카드: Desktop 좌측 고정폭, Mobile 상단 */}
        <div className="flex shrink-0 flex-col gap-3 md:w-[380px] md:shrink-0 md:gap-4 lg:w-[420px]">
          <HeroCard onCreateProject={handleCreateProject} />
          <IdeaInputCard onStartWithAI={handleStartWithAI} />
        </div>

        {/* 최근 프로젝트 + 오늘 할 일: Desktop 우측 2컬럼, Mobile 하단 세로 */}
        <div className="flex flex-col gap-3 md:min-h-0 md:flex-1 md:flex-row md:gap-6 lg:gap-8">
          <div className="flex flex-col md:min-h-0 md:w-1/2 md:flex-1">
            <RecentProjects onViewAll={handleViewAll} />
          </div>
          <div className="flex flex-col md:min-h-0 md:w-1/2 md:flex-1">
            <TodayTasks onViewAll={handleViewAll} />
          </div>
        </div>
      </main>

      <BottomNavigation />
    </div>
  );
}
