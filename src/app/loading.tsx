export default function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F8FAFC]">
      <div className="flex flex-col items-center">
        <div className="relative flex h-16 w-16 items-center justify-center">
          <div className="absolute h-16 w-16 animate-spin rounded-full border-4 border-slate-200 border-t-red-500" />

          <div className="grid h-8 w-8 grid-cols-2 gap-1 rounded-lg bg-[#151515] p-1.5 shadow-lg">
            <span className="rounded-sm bg-red-400" />
            <span className="rounded-sm bg-red-400" />
            <span className="rounded-sm bg-red-400" />
            <span className="rounded-sm bg-red-400" />
          </div>
        </div>

        <p className="mt-5 text-[15px] font-bold text-slate-800">
          Chargement...
        </p>

        <p className="mt-1 text-[12px] text-slate-400">
          Alteract prépare vos données
        </p>
      </div>
    </div>
  );
}