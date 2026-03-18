import { Navbar } from "@/components/ui/navbar";
import { SidebarContainer } from "@/components/ui/sidebar";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SidebarContainer>
        <Navbar />
        {children}
      </SidebarContainer>
    </>
  );
}
