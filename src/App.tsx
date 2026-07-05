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

      <main className="grid flex-1 grid-cols-1 gap-4 px-5 py-4 md:min-h-0 md:overflow-y-auto md:px-8 md:py-5 lg:grid-cols-[minmax(0,1.85fr)_minmax(300px,1fr)] lg:gap-8 lg:overflow-hidden lg:px-10">
        <div className="flex min-w-0 flex-col overflow-hidden rounded-[32px] border border-[#ECEEF2] bg-white shadow-[0_8px_24px_rgba(15,23,42,0.06)]">
          <HeroCard onCreateProject={handleCreateProject} />
          <IdeaInputCard onStartWithAI={handleStartWithAI} />
        </div>

        <div className="grid min-w-0 grid-cols-1 gap-4 md:min-h-0 md:gap-6">
          <RecentProjects onViewAll={handleViewAll} />
          <TodayTasks onViewAll={handleViewAll} />
        </div>
      </main>

      <BottomNavigation />
    </div>
  );
}
