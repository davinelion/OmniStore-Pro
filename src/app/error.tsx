"use client";
export default function Error({ reset }: { reset: () => void }) {
  return (
    <div className="text-center">
      <h1 className="font-display text-3xl font-semibold">Something went wrong</h1>
      <button className="mt-4 rounded-full bg-accent px-4 py-2 text-white" onClick={reset}>
        Try Again
      </button>
    </div>
  );
}
