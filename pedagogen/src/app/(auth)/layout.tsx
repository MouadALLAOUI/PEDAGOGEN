import { Sparkles } from "lucide-react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      <div className="hidden lg:flex lg:w-[55%] relative h-screen bg-gradient-to-br from-teal via-teal-dark to-navy items-center justify-center p-12">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(16,185,129,0.15),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(180,83,9,0.08),transparent_50%)]" />
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1501504905252-473c47e087f8?w=1200')] bg-cover bg-center opacity-5" />
        <div className="absolute inset-0 bg-black/30" />
        <div className="relative z-10 max-w-xl mx-auto text-center text-white">
          <div className="w-20 h-20 rounded-2xl bg-white/15 backdrop-blur flex items-center justify-center mx-auto mb-6">
            <Sparkles size={40} className="text-white" />
          </div>
          <h1 className="font-display text-4xl lg:text-5xl font-bold tracking-tight mb-4">PEDAGOGEN</h1>
          <p className="text-white/70 text-lg lg:text-xl leading-relaxed">Assistant Pédagogique IA</p>
        </div>
      </div>

      <div className="lg:w-[45%] flex items-center justify-center min-h-screen bg-white p-8">
        <div className="w-full max-w-md">
          {children}
        </div>
      </div>
    </div>
  );
}
