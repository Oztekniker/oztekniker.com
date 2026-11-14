// Temporary CSS chain so the layout matches the prototype.
// This gets replaced by the real 3D chain (one InstancedMesh running through the whole page).

export default function ChainColumn({ tone = 'dark', count = 16, className = '' }) {
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none flex flex-col items-center overflow-hidden ${className}`}
    >
      {Array.from({ length: count }, (_, i) =>
        i % 2 === 0 ? (
          <div key={i} className={`ring-${tone} -my-[18px] h-[104px] w-16 shrink-0 rounded-full`} />
        ) : (
          <div key={i} className={`edge-${tone} -my-[18px] h-[104px] w-4 shrink-0 rounded-full`} />
        ),
      )}
    </div>
  )
}
