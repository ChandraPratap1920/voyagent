import BottomNav from '@/components/BottomNav'

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-950 text-white max-w-md mx-auto w-full">
      {children}
      <BottomNav />
    </div>
  )
}
