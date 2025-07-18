/// <reference types="vite/client" />

declare module 'aos' {
    interface AosOptions {
        duration?: number;
        easing?: string;
        once?: boolean;
        mirror?: boolean;
        anchorPlacement?: string;
    }

    interface Aos {
        init(options?: AosOptions): void;
        refresh(): void;
        refreshHard(): void;
    }

    const aos: Aos;
    export default aos;
}

interface Window {
    AOS: Aos;
}
