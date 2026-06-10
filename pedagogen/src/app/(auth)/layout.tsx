import { BookOpen } from "lucide-react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-navy via-navy-light to-navy px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-teal flex items-center justify-center mx-auto mb-4">
            <BookOpen size={32} className="text-white" />
          </div>
          <h1 className="font-display text-3xl font-bold text-white">PEDAGOGEN</h1>
          <p className="text-parchment/60 mt-1">Assistant Pédagogique IA</p>
        </div>
        {children}
      </div>
    </div>
  );
}
