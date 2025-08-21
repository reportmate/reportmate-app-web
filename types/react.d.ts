declare namespace React {
  type ReactNode = import('react').ReactNode
}

declare global {
  namespace JSX {
    interface IntrinsicElements {
      [elemName: string]: any
    }
  }
}

export {}
