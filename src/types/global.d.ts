/// <reference types="react" />
/// <reference types="react-dom" />

declare module 'next/link' {
  import { ComponentType, AnchorHTMLAttributes } from 'react';
  interface LinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
    href: string;
    replace?: boolean;
    scroll?: boolean;
    shallow?: boolean;
    prefetch?: boolean;
    locale?: string | false;
  }
  const Link: ComponentType<LinkProps>;
  export default Link;
}

declare module 'next/navigation' {
  export function usePathname(): string;
  export function useRouter(): {
    push: (href: string) => void;
    replace: (href: string) => void;
    refresh: () => void;
    back: () => void;
    forward: () => void;
    prefetch: (href: string) => void;
  };
  export function useSearchParams(): URLSearchParams;
}

declare module 'next/server' {
  export function redirect(url: string): never;
  export function notFound(): never;
}

// React types are provided by @types/react after npm install
// This file provides minimal type stubs for pre-installation IDE support

