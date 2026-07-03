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
    <div className="min-h-screen w-full md:max-w-[820px] lg:max-w-[1200px] mx-auto bg-white relative overflow-x-hidden">
      <main className="animate-fadeIn bg-white pb-[calc(80px+env(safe-area-inset-bottom))] md:pb-24">
        <Header />

        <div className="px-5 md:px-8 lg:px-10 flex flex-col gap-5 md:gap-8">
          <HeroCard onCreateProject={handleCreateProject} />
          <IdeaInputCard onStartWithAI={handleStartWithAI} />
          <RecentProjects onViewAll={handleViewAll} />
          <TodayTasks onViewAll={handleViewAll} />
        </div>

        <BottomNavigation />
      </main>
    </div>
  );
}
