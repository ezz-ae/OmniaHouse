// Minimal class-name helper, used by components. Replace with `clsx + tailwind-merge`
// once those deps are added per a spec.

export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ');
}
