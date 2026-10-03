import Link from "next/link";

export default function NotFound() {
  return (
    <main className="relative flex h-dvh flex-col items-center justify-center overflow-hidden px-6 text-center">
      <div className="absolute inset-0 bg-[radial-gradient(50%_45%_at_74%_0%,rgba(90,232,168,.12),transparent_70%),linear-gradient(to_bottom,#060707,#0d100e_75%,#050505)]" />
      <div className="relative">
        <div className="label text-lamp/80">404 · no such plot</div>
        <h1 className="mt-3 font-display text-[clamp(48px,8vw,104px)] leading-[0.9]">Nobody&apos;s buried here.</h1>
        <p className="mx-auto mt-5 max-w-md font-serif text-lg italic text-ash-2">The stub you followed is gone, or it never existed. The lot is still open.</p>
        <Link href="/" className="btn btn-lamp mt-10 px-10 py-4 text-sm">
          Back to the lot
        </Link>
      </div>
    </main>
  );
}
