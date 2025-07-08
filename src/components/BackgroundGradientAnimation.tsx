'use client'

export default function BackgroundGradientAnimation() {
  return (
    <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
      <div className="absolute left-1/2 top-0 w-[60vw] h-[60vw] -translate-x-1/2 bg-gradient-to-tr from-pink-500 via-red-500 to-yellow-500 rounded-full blur-3xl opacity-50 mix-blend-multiply animate-blob-1" />
      <div className="absolute left-0 bottom-0 w-[60vw] h-[60vw] bg-gradient-to-tr from-blue-500 via-cyan-500 to-purple-500 rounded-full blur-3xl opacity-50 mix-blend-multiply animate-blob-2" />
      <div className="absolute right-0 top-1/4 w-[60vw] h-[60vw] bg-gradient-to-tr from-green-500 via-lime-500 to-emerald-500 rounded-full blur-3xl opacity-50 mix-blend-multiply animate-blob-3" />
    </div>
  )
}
