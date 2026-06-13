import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { QuickActionFab } from "@/components/layout/QuickActionFab";
import { OnboardingWizard } from "@/components/OnboardingWizard";
import { Toaster } from "react-hot-toast";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-full">
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: '#1C1917',
            color: '#FAFAF8',
            borderRadius: '12px',
            fontSize: '14px',
            padding: '12px 16px',
          },
          success: {
            iconTheme: {
              primary: '#059669',
              secondary: '#FAFAF8',
            },
          },
          error: {
            iconTheme: {
              primary: '#EF4444',
              secondary: '#FAFAF8',
            },
          },
        }}
      />
      <Sidebar />
      <div className="flex-1 flex flex-col min-h-full">
        <TopBar />
        <main className="flex-1 p-4 lg:p-8 overflow-auto">
          {children}
        </main>
      </div>
      <QuickActionFab />
      <OnboardingWizard />
    </div>
  );
}
