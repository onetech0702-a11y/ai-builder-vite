import Header from "./components/Header";
import HeroCard from "./components/HeroCard";
import IdeaInputCard from "./components/IdeaInputCard";
import RecentProjects from "./components/RecentProjects";
import BottomNavigation from "./components/BottomNavigation";

export default function App() {
  const handleCreateProject = () => console.log("create project");
  const handleStartWithAI = () => console.log("start with ai");
  const handleViewAll = () => console.log("view all");

  return (
    <div className="min-h-[100dvh] bg-[#F8FAFC]">
      <Header />

      <main className="mx-auto flex w-full max-w-[760px] flex-col gap-6 px-5 pb-[120px] pt-6">
        <HeroCard onCreateProject={handleCreateProject} />
        <IdeaInputCard onStartWithAI={handleStartWithAI} />
        <RecentProjects onViewAll={handleViewAll} />
      </main>

      <BottomNavigation />
    </div>
  );
}
