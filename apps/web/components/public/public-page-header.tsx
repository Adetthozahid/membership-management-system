import Image from "next/image";

type PublicPageHeaderProps = {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  className?: string;
};

export function PublicPageHeader({
  eyebrow,
  title,
  subtitle,
  className = "",
}: PublicPageHeaderProps) {
  return (
    <section
      className={`grid gap-6 lg:grid-cols-[minmax(0,1fr)_520px] lg:items-center ${className}`}
    >
      <div className="space-y-5">
        <div>
          {eyebrow ? (
            <p className="mb-4 text-sm font-bold uppercase tracking-wide text-[hsl(var(--terracotta))]">
              {eyebrow}
            </p>
          ) : null}
          <h1 className="max-w-3xl font-serif text-2xl font-bold leading-tight tracking-normal text-primary md:text-3xl">
            {title}
          </h1>
          {subtitle ? (
            <p className="mt-3 max-w-2xl text-base font-semibold leading-7 text-muted-foreground">
              {subtitle}
            </p>
          ) : null}
        </div>
      </div>
      <div className="relative hidden h-52 overflow-hidden lg:block">
        <div className="absolute right-16 top-5 h-32 w-32 rounded-full bg-[hsl(var(--terracotta))]/80" />
        <div className="absolute inset-x-0 bottom-0 top-2">
          <Image
            src="/images/sust-slider-academic-building.jpg"
            alt=""
            fill
            sizes="520px"
            className="object-cover opacity-35 grayscale"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-background via-background/25 to-background/80" />
        </div>
        <div className="absolute right-0 top-16 grid grid-cols-6 gap-3 opacity-35">
          {Array.from({ length: 24 }).map((_, index) => (
            <span
              key={index}
              className="h-1.5 w-1.5 rounded-full bg-muted-foreground"
            />
          ))}
        </div>
      </div>
    </section>
  );
}
