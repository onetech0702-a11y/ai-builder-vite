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
        {/* 좌측 65%(Desktop): Hero + 입력카드를 하나의 연결된 카드로 */}
        <div className="flex shrink-0 flex-col md:min-h-0 md:w-[58%] md:shrink-0 lg:w-[65%]">
          <div className="flex flex-1 flex-col overflow-hidden rounded-[28px] border border-[#ECEEF2] shadow-[0_8px_24px_rgba(15,23,42,0.06)]">
            <HeroCard onCreateProject={handleCreateProject} />
            <IdeaInputCard onStartWithAI={handleStartWithAI} />
          </div>
        </div>

        {/* 우측 35%(Desktop): 최근 프로젝트 + 오늘 할 일 */}
        <div className="flex flex-col gap-3 md:min-h-0 md:w-[42%] md:flex-1 lg:w-[35%]">
          <div className="flex min-h-0 flex-1 flex-col md:min-h-0">
            <RecentProjects onViewAll={handleViewAll} />
          </div>
          <div className="flex min-h-0 flex-1 flex-col md:min-h-0">
            <TodayTasks onViewAll={handleViewAll} />
          </div>
        </div>
      </main>

      <BottomNavigation />
    </div>
  );
}
