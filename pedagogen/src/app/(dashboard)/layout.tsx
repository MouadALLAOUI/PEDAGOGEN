import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { QuickActionFab } from "@/components/layout/QuickActionFab";
import { OnboardingWizard } from "@/components/OnboardingWizard";
import { Toaster } from "react-hot-toast";

import { verifyToken } from "@/lib/db/auth";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth-token')?.value;

  if (!token) {
    redirect('/login');
  }

  const payload = await verifyToken(token);
  if (!payload?.sub) {
    redirect('/login');
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
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
      <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden">
        <TopBar />
        <main className="flex-1 p-4 lg:p-8 overflow-y-auto min-h-0">
          {children}
        </main>
      </div>
      <QuickActionFab />
      <OnboardingWizard />
    </div>
  );
}
