/** Hero (mockup Section 1). */

export function Hero(): React.JSX.Element {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-[48px] font-light leading-[1.05] tracking-[-0.05em] text-text-primary lg:text-[72px]">
        Drop your DNA test. <br className="hidden sm:inline" />
        <span className="font-normal italic text-archival-amber">Get a micro documentary about you.</span>
      </h1>
      <p className="max-w-2xl text-base font-light leading-relaxed text-on-surface-variant">
        Drop your 23andMe or AncestryDNA raw DNA export. PocketDNA analyses it on your device and turns your
        Bronze Age, Medieval, and Modern chapters into a cited, cinematic micro-documentary.
      </p>
    </div>
  );
}
