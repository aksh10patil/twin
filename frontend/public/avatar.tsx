"use client";

import React, {
    useCallback,
    useEffect,
    useId,
    useLayoutEffect,
    useRef,
    useSyncExternalStore,
} from "react";

export interface AvatarProps extends React.SVGProps<SVGSVGElement> {
    /** Width and height of the avatar in pixels or CSS units */
    size?: number | string;
    /** Primary color (dark ink in light mode, light face/outline in dark mode; defaults to currentColor) */
    color?: string;
    /** Dark surface/ink color used for hair fill and facial details in dark mode (defaults to "#141413") */
    darkSurfaceColor?: string;
    /** Enable or disable pointer head and eye tracking */
    interactive?: boolean;
    /** Track pointer across the entire window or only while hovering the avatar */
    trackingScope?: "window" | "element";
    /** Multiplier for head and eye movement range (default: 1) */
    intensity?: number;
    /** Toggle site dark/light mode when clicking the avatar (default: true) */
    toggleThemeOnClick?: boolean;
    /** Optional callback fired when theme toggles */
    onThemeChange?: (theme: "light" | "dark") => void;
}

const THEME_STORAGE_KEY = "theme";

const useIsomorphicLayoutEffect =
    typeof window !== "undefined" ? useLayoutEffect : useEffect;

const PATHS = {
    neck: "M 234 398 L 234 470 L 318 470 L 318 398 Z",
    collarUpper: "M 232 426 Q 276 446 320 426",
    collarLower: "M 228 444 Q 276 462 324 444",
    leftLapel:
        "M 236 420 C 208 424, 190 442, 182 468 L 234 474 C 232 454, 234 436, 236 420 Z",
    leftLapelCrease: "M 196 450 Q 212 456 226 460",
    rightLapel:
        "M 316 420 C 338 426, 350 444, 356 468 L 316 474 C 318 454, 318 436, 316 420 Z",
    rightLapelCrease: "M 344 450 Q 332 455 322 458",
    earOuter:
        "M 152 326 C 122 316, 102 332, 106 360 C 110 384, 132 396, 154 388",
    earFillDark:
        "M 152 326 C 122 316, 102 332, 106 360 C 110 384, 132 396, 154 388 L 182 374 L 182 326 Z",
    earInner1: "M 142 346 C 126 342, 122 362, 136 372",
    earInner2: "M 138 358 Q 145 360 144 368",
    headShape: `M 150 220
    C 146 315, 146 365, 174 394
    C 204 422, 268 430, 316 420
    C 364 410, 396 376, 404 330
    C 410 296, 404 250, 396 215 Z`,
    hair: `M 148 326
    L 124 304
    L 134 294
    C 114 302, 96 305, 86 304
    C 90 288, 98 274, 106 266
    C 80 262, 58 256, 44 246
    C 58 224, 78 208, 96 198
    L 82 192
    C 70 178, 62 164, 60 152
    C 84 136, 112 126, 134 122
    L 120 112
    C 110 102, 104 92, 102 86
    C 126 80, 152 80, 174 82
    L 172 66
    C 190 50, 210 40, 228 38
    C 234 44, 238 50, 242 56
    C 266 44, 290 40, 310 42
    C 298 58, 284 72, 272 86
    C 316 70, 360 66, 396 72
    C 388 88, 378 102, 366 114
    C 396 110, 424 112, 446 118
    C 434 136, 418 152, 404 166
    C 430 176, 452 190, 470 206
    C 452 218, 434 226, 416 232
    C 422 246, 424 258, 424 268
    L 398 272
    C 392 258, 384 248, 378 240
    C 374 250, 368 260, 362 266
    C 356 252, 348 240, 342 232
    C 334 248, 326 262, 318 274
    C 310 254, 300 236, 292 224
    C 282 240, 272 254, 264 266
    C 254 246, 242 226, 232 212
    C 222 232, 212 250, 204 266
    C 198 254, 192 244, 186 236
    C 178 262, 166 294, 148 326 Z`,
    hairStrands: [
        "M 134 122 Q 174 118 202 134",
        "M 242 56 Q 224 76 216 96",
        "M 366 114 Q 340 126 322 142",
        "M 96 198 Q 128 192 152 204",
        "M 232 212 Q 222 184 206 168",
    ],
    leftBrow: "M 218 282 Q 234 275 248 280",
    rightBrow: "M 346 274 Q 361 271 374 277",
    nose: "M 310 340 C 321 340, 321 352, 310 352",
    smile: "M 284 368 Q 306 382 328 366",
    glassesBridge: "M 290 308 Q 302 300 314 306",
    glassesTemple: "M 181 316 L 136 311",
} as const;

const FRECKLES = [
    { cx: 216, cy: 354, r: 2.2 },
    { cx: 228, cy: 351, r: 2 },
    { cx: 223, cy: 361, r: 2.2 },
    { cx: 236, cy: 359, r: 2 },
    { cx: 358, cy: 348, r: 2 },
    { cx: 370, cy: 345, r: 2.2 },
    { cx: 364, cy: 355, r: 2.2 },
    { cx: 376, cy: 352, r: 2 },
] as const;

const CATCHLIGHTS = [
    { cx: 234, cy: 314, r: 5 },
    { cx: 233, cy: 329, r: 2.2 },
    { cx: 345, cy: 306, r: 4.7 },
    { cx: 344, cy: 321, r: 2 },
] as const;

const subscribeTheme = (callback: () => void) => {
    if (typeof window === "undefined") return () => { };
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    const handleMediaChange = (e: MediaQueryListEvent) => {
        let currentStored: string | null = null;
        try {
            currentStored = window.localStorage.getItem(THEME_STORAGE_KEY);
        } catch {
            // Ignore storage access errors
        }
        if (!currentStored) {
            document.documentElement.classList.toggle("dark", e.matches);
            document.documentElement.style.colorScheme = e.matches ? "dark" : "light";
        }
        callback();
    };

    const handleStorage = (e: StorageEvent) => {
        if (e.key !== THEME_STORAGE_KEY) return;
        const nextDark = e.newValue === "dark";
        document.documentElement.classList.toggle("dark", nextDark);
        document.documentElement.style.colorScheme = nextDark ? "dark" : "light";
        callback();
    };

    mediaQuery.addEventListener("change", handleMediaChange);
    window.addEventListener("theme-change", callback);
    window.addEventListener("storage", handleStorage);

    return () => {
        mediaQuery.removeEventListener("change", handleMediaChange);
        window.removeEventListener("theme-change", callback);
        window.removeEventListener("storage", handleStorage);
    };
};

const getThemeSnapshot = () => {
    return (
        typeof document !== "undefined" &&
        document.documentElement.classList.contains("dark")
    );
};

const getServerSnapshot = () => false;

export const Avatar: React.FC<AvatarProps> = ({
    size = 128,
    color = "currentColor",
    darkSurfaceColor = "#141413",
    interactive = true,
    trackingScope = "window",
    intensity = 1,
    toggleThemeOnClick = true,
    onThemeChange,
    className = "",
    onClick,
    onKeyDown,
    ...props
}) => {
    const maskId = useId();
    const svgRef = useRef<SVGSVGElement | null>(null);
    const isDark = useSyncExternalStore(
        subscribeTheme,
        getThemeSnapshot,
        getServerSnapshot
    );

    // Layer refs for zero-rerender 2.5D spring parallax + independent eye tracking
    const collarRef = useRef<SVGGElement | null>(null);
    const headTiltRef = useRef<SVGGElement | null>(null);
    const hairRef = useRef<SVGGElement | null>(null);
    const earRef = useRef<SVGGElement | null>(null);
    const headShapeRef = useRef<SVGGElement | null>(null);
    const featuresRef = useRef<SVGGElement | null>(null);
    const leftBrowRef = useRef<SVGGElement | null>(null);
    const rightBrowRef = useRef<SVGGElement | null>(null);
    const eyesRef = useRef<SVGGElement | null>(null);
    const leftEyeLidRef = useRef<SVGGElement | null>(null);
    const rightEyeLidRef = useRef<SVGGElement | null>(null);
    const catchlightsRef = useRef<SVGGElement | null>(null);
    const glassesRef = useRef<SVGGElement | null>(null);

    // Target & spring physics state
    const targetRef = useRef({ x: 0, y: 0, focus: 0 });
    const headStateRef = useRef({ x: 0, y: 0, vx: 0, vy: 0 });
    const eyeStateRef = useRef({ x: 0, y: 0, vx: 0, vy: 0 });
    const focusStateRef = useRef({ val: 0, vel: 0 });
    const blinkStateRef = useRef({
        scaleY: 1,
        timer: 2.2,
        phase: "open" as "open" | "closing" | "opening",
    });
    const perkRef = useRef(0);
    const lastNowRef = useRef(0);
    const applyTransformsRef = useRef<((now: number) => void) | null>(null);

    // Sync initial theme from localStorage / document class / system preference
    useEffect(() => {
        const root = document.documentElement;
        let stored: string | null = null;
        try {
            stored = window.localStorage.getItem(THEME_STORAGE_KEY);
        } catch {
            // Ignore storage access errors in private browsing
        }

        const prefersDark = window.matchMedia(
            "(prefers-color-scheme: dark)"
        ).matches;
        const shouldBeDark =
            stored === "dark"
                ? true
                : stored === "light"
                    ? false
                    : root.classList.contains("dark") || prefersDark;

        if (root.classList.contains("dark") !== shouldBeDark) {
            root.classList.toggle("dark", shouldBeDark);
            root.style.colorScheme = shouldBeDark ? "dark" : "light";
            window.dispatchEvent(new Event("theme-change"));
        }
    }, []);

    const toggleTheme = useCallback(() => {
        const root = document.documentElement;
        const nextDark = !root.classList.contains("dark");
        const nextTheme = nextDark ? "dark" : "light";

        root.classList.toggle("dark", nextDark);
        root.style.colorScheme = nextTheme;

        try {
            window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
        } catch {
            // Ignore storage write errors
        }

        onThemeChange?.(nextTheme);
        window.dispatchEvent(new Event("theme-change"));

        // Playful perk + blink feedback on toggle
        perkRef.current = 1.2;
        if (blinkStateRef.current.phase === "open") {
            blinkStateRef.current.phase = "closing";
        }
    }, [onThemeChange]);

    const handleClick = (e: React.MouseEvent<SVGSVGElement>) => {
        if (toggleThemeOnClick) {
            toggleTheme();
        }
        onClick?.(e);
    };

    const handleKeyDown = (e: React.KeyboardEvent<SVGSVGElement>) => {
        if (toggleThemeOnClick && (e.key === "Enter" || e.key === " ")) {
            e.preventDefault();
            toggleTheme();
        }
        onKeyDown?.(e);
    };

    useEffect(() => {
        const prefersReducedMotion =
            typeof window !== "undefined" &&
            window.matchMedia("(prefers-reduced-motion: reduce)").matches;

        if (!interactive || prefersReducedMotion) {
            targetRef.current = { x: 0, y: 0, focus: 0 };
            applyTransformsRef.current = null;
            return;
        }

        const updateTargetFromPoint = (clientX: number, clientY: number) => {
            const svg = svgRef.current;
            if (!svg) return;

            const rect = svg.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;

            // Higher sensitivity curve so moderate pointer moves trigger bold head turns
            const divisor =
                trackingScope === "element"
                    ? Math.max(rect.width, rect.height) * 0.42 || 90
                    : Math.max(window.innerWidth, window.innerHeight) * 0.24 || 240;

            const rawX = (clientX - centerX) / divisor;
            const rawY = (clientY - centerY) / divisor;

            // Steep tanh response with smooth edge saturation
            targetRef.current.x = Math.tanh(rawX * 1.75);
            targetRef.current.y = Math.tanh(rawY * 1.75);

            // Proximity focus: 1 when cursor is close to the avatar, 0 when far away
            const dist = Math.hypot(clientX - centerX, clientY - centerY);
            const focusRadius =
                trackingScope === "element"
                    ? Math.max(rect.width, rect.height) * 0.9
                    : Math.min(window.innerWidth, window.innerHeight) * 0.45;
            targetRef.current.focus = Math.max(
                0,
                Math.min(1, 1 - dist / (focusRadius || 300))
            );
        };

        const resetTarget = () => {
            targetRef.current.x = 0;
            targetRef.current.y = 0;
            targetRef.current.focus = 0;
        };

        const handlePointerMove = (e: PointerEvent) => {
            updateTargetFromPoint(e.clientX, e.clientY);
        };

        const handlePointerDown = () => {
            // Tactile perk-up + quick blink when user clicks/taps
            perkRef.current = 1;
            if (blinkStateRef.current.phase === "open") {
                blinkStateRef.current.phase = "closing";
            }
        };

        const svgEl = svgRef.current;
        if (trackingScope === "window") {
            window.addEventListener("pointermove", handlePointerMove, {
                passive: true,
            });
            window.addEventListener("pointerdown", handlePointerDown, {
                passive: true,
            });
            document.addEventListener("mouseleave", resetTarget);
            window.addEventListener("blur", resetTarget);
        } else if (svgEl) {
            svgEl.addEventListener("pointermove", handlePointerMove, {
                passive: true,
            });
            svgEl.addEventListener("pointerdown", handlePointerDown, {
                passive: true,
            });
            svgEl.addEventListener("pointerleave", resetTarget);
        }

        let rafId = 0;
        let lastTime = performance.now();
        lastNowRef.current = lastTime;

        const clamp = (val: number, min: number, max: number) =>
            Math.max(min, Math.min(max, val));

        const applyTransforms = (now: number) => {
            const head = headStateRef.current;
            const eye = eyeStateRef.current;
            const focus = focusStateRef.current;
            const blink = blinkStateRef.current;

            // Subtle idle breathing wave so character never looks frozen
            const breath = Math.sin(now * 0.0024);

            const hx = head.x * intensity;
            const hy = head.y * intensity;

            // Clamp eye travel so eyes stay cleanly framed inside the round glasses
            const ex = clamp(eye.x * intensity, -1.35, 1.35);
            const ey = clamp(eye.y * intensity, -1.35, 1.35);

            const f = focus.val;
            const perk = perkRef.current;

            // Lean-in zoom when pointer approaches closely
            const leanScale = 1 + f * 0.032 * Math.min(intensity, 1.4);

            // 1. Torso & collar: leans into gaze with subtle breathing
            collarRef.current?.setAttribute(
                "transform",
                `translate(${(hx * 3.2).toFixed(2)}, ${(hy * 2.0 + breath * 0.7).toFixed(2)}) rotate(${(hx * 1.8).toFixed(2)} 276 465)`
            );

            // 2. Overall head tilt & 3D corner roll around neck pivot (276, 425)
            const headRoll = hx * 6.8 + hx * hy * 2.0;
            headTiltRef.current?.setAttribute(
                "transform",
                `translate(${(hx * 5.5).toFixed(2)}, ${(hy * 4.2 + breath * 1.1 - perk * 3.0).toFixed(2)}) rotate(${headRoll.toFixed(2)} 276 425) translate(276 340) scale(${leanScale.toFixed(4)}) translate(-276 -340)`
            );

            // 3. Hair silhouette: counter-lags behind skull to create deep 3D volume rotation
            hairRef.current?.setAttribute(
                "transform",
                `translate(${(hx * 1.2).toFixed(2)}, ${(hy * 1.4).toFixed(2)}) rotate(${(-hx * 1.4).toFixed(2)} 265 180)`
            );

            // 4. Left ear: strong counter-shift + foreshortening as head turns left/right
            const earScaleX = clamp(1 - hx * 0.14, 0.78, 1.18);
            earRef.current?.setAttribute(
                "transform",
                `translate(${(-hx * 7.2).toFixed(2)}, ${(hy * 3.0).toFixed(2)}) translate(150 355) scale(${earScaleX.toFixed(3)}, 1) translate(-150 -355)`
            );

            // 5. Cranium & jawline mass shift
            headShapeRef.current?.setAttribute(
                "transform",
                `translate(${(hx * 8.2).toFixed(2)}, ${(hy * 5.6).toFixed(2)})`
            );

            // 6. Facial plane (freckles, nose, smile) wraps across the 3D head contour
            featuresRef.current?.setAttribute(
                "transform",
                `translate(${(hx * 17.5).toFixed(2)}, ${(hy * 12.0).toFixed(2)})`
            );

            // 7. Expressive asymmetric eyebrows (inquisitive arch on side gaze + focus lift)
            const browLift = ey * 3.6 - f * 2.2 - perk * 4.5;
            leftBrowRef.current?.setAttribute(
                "transform",
                `translate(${(ex * 2.2).toFixed(2)}, ${(browLift - ex * 1.4).toFixed(2)}) rotate(${(-ex * 5.5 - f * 3.0).toFixed(2)} 233 279)`
            );
            rightBrowRef.current?.setAttribute(
                "transform",
                `translate(${(ex * 2.2).toFixed(2)}, ${(browLift + ex * 1.6).toFixed(2)}) rotate(${(-ex * 4.5 + f * 3.0).toFixed(2)} 360 274)`
            );

            // 8. Eyes dart rapidly to lock onto pointer
            eyesRef.current?.setAttribute(
                "transform",
                `translate(${(ex * 11.2).toFixed(2)}, ${(ey * 8.4).toFixed(2)})`
            );

            // 9. Natural eyelid blink around each eye's center
            const sy = blink.scaleY.toFixed(3);
            leftEyeLidRef.current?.setAttribute(
                "transform",
                `translate(240 322) scale(1 ${sy}) translate(-240 -322)`
            );
            rightEyeLidRef.current?.setAttribute(
                "transform",
                `translate(350 314) scale(1 ${sy}) translate(-350 -314)`
            );

            // 10. Specular catchlights glide across curved corneas
            catchlightsRef.current?.setAttribute(
                "transform",
                `translate(${(ex * 3.0).toFixed(2)}, ${(ey * 2.4).toFixed(2)})`
            );

            // 11. Round glasses sit forward off nose bridge with strong 3D depth parallax
            glassesRef.current?.setAttribute(
                "transform",
                `translate(${(hx * 23.0).toFixed(2)}, ${(hy * 15.0).toFixed(2)}) rotate(${(hx * 2.2).toFixed(2)} 300 314)`
            );
        };

        applyTransformsRef.current = applyTransforms;

        const animate = (now: number) => {
            // Clamp dt for refresh-rate independence (60Hz-144Hz+) and safe tab resume
            const dt = Math.min((now - lastTime) / 1000, 0.05) || 1 / 60;
            lastTime = now;
            lastNowRef.current = now;

            const tgt = targetRef.current;
            const head = headStateRef.current;
            const eye = eyeStateRef.current;
            const focus = focusStateRef.current;
            const blink = blinkStateRef.current;

            // 1. Damped harmonic spring for head (weighted momentum + subtle overshoot)
            const headStiffness = 120;
            const headDamping = 13.5;
            const hAx = (tgt.x - head.x) * headStiffness - head.vx * headDamping;
            const hAy = (tgt.y - head.y) * headStiffness - head.vy * headDamping;
            head.vx += hAx * dt;
            head.vy += hAy * dt;
            head.x += head.vx * dt;
            head.y += head.vy * dt;

            // 2. High-stiffness ocular spring for eyes (fast saccade lock-on before head arrives)
            const eyeStiffness = 280;
            const eyeDamping = 22;
            const eAx = (tgt.x - eye.x) * eyeStiffness - eye.vx * eyeDamping;
            const eAy = (tgt.y - eye.y) * eyeStiffness - eye.vy * eyeDamping;
            eye.vx += eAx * dt;
            eye.vy += eAy * dt;
            eye.x += eye.vx * dt;
            eye.y += eye.vy * dt;

            // 3. Smooth proximity focus lean-in
            const fAcc = (tgt.focus - focus.val) * 95 - focus.vel * 15;
            focus.vel += fAcc * dt;
            focus.val += focus.vel * dt;

            // Decay click perk impulse
            perkRef.current = Math.max(0, perkRef.current - dt * 4.5);

            // 4. Natural periodic eye blink state machine
            if (blink.phase === "open") {
                blink.timer -= dt;
                if (blink.timer <= 0) {
                    blink.phase = "closing";
                }
            } else if (blink.phase === "closing") {
                blink.scaleY -= dt * 15;
                if (blink.scaleY <= 0.06) {
                    blink.scaleY = 0.06;
                    blink.phase = "opening";
                }
            } else {
                blink.scaleY += dt * 10;
                if (blink.scaleY >= 1) {
                    blink.scaleY = 1;
                    blink.phase = "open";
                    blink.timer = 2.8 + Math.random() * 2.6;
                }
            }

            applyTransforms(now);
            rafId = requestAnimationFrame(animate);
        };

        rafId = requestAnimationFrame(animate);

        return () => {
            cancelAnimationFrame(rafId);
            applyTransformsRef.current = null;
            if (trackingScope === "window") {
                window.removeEventListener("pointermove", handlePointerMove);
                window.removeEventListener("pointerdown", handlePointerDown);
                document.removeEventListener("mouseleave", resetTarget);
                window.removeEventListener("blur", resetTarget);
            } else if (svgEl) {
                svgEl.removeEventListener("pointermove", handlePointerMove);
                svgEl.removeEventListener("pointerdown", handlePointerDown);
                svgEl.removeEventListener("pointerleave", resetTarget);
            }
        };
    }, [interactive, trackingScope, intensity]);

    // Synchronously re-apply active physics transforms before paint when switching themes
    useIsomorphicLayoutEffect(() => {
        if (applyTransformsRef.current) {
            applyTransformsRef.current(lastNowRef.current || performance.now());
        }
    }, [isDark]);

    return (
        <svg
            ref={svgRef}
            width={size}
            height={size}
            viewBox="0 0 512 512"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            {...props}
            role={toggleThemeOnClick ? "button" : props.role ?? "img"}
            tabIndex={toggleThemeOnClick ? 0 : props.tabIndex}
            aria-pressed={toggleThemeOnClick ? isDark : undefined}
            aria-label={
                toggleThemeOnClick
                    ? isDark
                        ? "Switch to light mode"
                        : "Switch to dark mode"
                    : props["aria-label"] ??
                    "Interactive character avatar wearing round glasses"
            }
            onClick={handleClick}
            onKeyDown={handleKeyDown}
            className={`text-[#141413] dark:text-[#EDEDEA] transition-colors duration-300 select-none ${toggleThemeOnClick
                    ? "cursor-pointer rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#141413]/25 dark:focus-visible:ring-[#EDEDEA]/25"
                    : ""
                } ${className}`}
        >
            {toggleThemeOnClick && (
                <title>{isDark ? "Switch to light mode" : "Switch to dark mode"}</title>
            )}

            {isDark ? (
                /* DARK MODE: Luminous light face with dark ink features + dark hair & robe with crisp light outlines */
                <>
                    {/* LAYER 1: Neck & Robe Collar */}
                    <g ref={collarRef}>
                        <path d={PATHS.neck} fill={darkSurfaceColor} />
                        <path
                            d={PATHS.collarUpper}
                            stroke={color}
                            strokeWidth="6.5"
                            strokeLinecap="round"
                        />
                        <path
                            d={PATHS.collarLower}
                            stroke={color}
                            strokeWidth="6.5"
                            strokeLinecap="round"
                        />

                        {/* Outer Robe Lapels (dark mass + light outline to echo hair) */}
                        <path
                            d={PATHS.leftLapel}
                            fill={darkSurfaceColor}
                            stroke={color}
                            strokeWidth="6"
                            strokeLinejoin="round"
                        />
                        <path
                            d={PATHS.leftLapelCrease}
                            stroke={color}
                            strokeWidth="4"
                            strokeLinecap="round"
                            strokeOpacity="0.85"
                        />
                        <path
                            d={PATHS.rightLapel}
                            fill={darkSurfaceColor}
                            stroke={color}
                            strokeWidth="6"
                            strokeLinejoin="round"
                        />
                        <path
                            d={PATHS.rightLapelCrease}
                            stroke={color}
                            strokeWidth="4"
                            strokeLinecap="round"
                            strokeOpacity="0.85"
                        />
                    </g>

                    {/* HEAD TILT GROUP */}
                    <g ref={headTiltRef}>
                        {/* LAYER 2: Left Ear (light skin + dark inner ear detail) */}
                        <g ref={earRef}>
                            <path d={PATHS.earFillDark} fill={color} />
                            <path
                                d={PATHS.earOuter}
                                stroke={color}
                                strokeWidth="4"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                            <path
                                d={PATHS.earInner1}
                                stroke={darkSurfaceColor}
                                strokeWidth="6.5"
                                strokeLinecap="round"
                            />
                            <path
                                d={PATHS.earInner2}
                                stroke={darkSurfaceColor}
                                strokeWidth="5.5"
                                strokeLinecap="round"
                            />
                        </g>

                        {/* LAYER 3: Head & Jawline (luminous light face) */}
                        <g ref={headShapeRef}>
                            <path
                                d={PATHS.headShape}
                                fill={color}
                                stroke={color}
                                strokeWidth="4"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                        </g>

                        {/* LAYER 4: Tousled Spiky Hair (dark fill + crisp outer light outline via paintOrder) */}
                        <g ref={hairRef}>
                            <path
                                d={PATHS.hair}
                                fill={darkSurfaceColor}
                                stroke={color}
                                strokeWidth="13"
                                paintOrder="stroke"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />

                            {/* Subtle light hair strand highlights */}
                            {PATHS.hairStrands.map((d) => (
                                <path
                                    key={d}
                                    d={d}
                                    stroke={color}
                                    strokeWidth="4.5"
                                    strokeLinecap="round"
                                    strokeOpacity="0.85"
                                />
                            ))}
                        </g>

                        {/* LAYER 5: Facial Features (dark ink on light face + light eye catchlights) */}
                        <g ref={featuresRef}>
                            <g ref={leftBrowRef}>
                                <path
                                    d={PATHS.leftBrow}
                                    stroke={darkSurfaceColor}
                                    strokeWidth="7.5"
                                    strokeLinecap="round"
                                />
                            </g>
                            <g ref={rightBrowRef}>
                                <path
                                    d={PATHS.rightBrow}
                                    stroke={darkSurfaceColor}
                                    strokeWidth="7.5"
                                    strokeLinecap="round"
                                />
                            </g>

                            <g ref={eyesRef}>
                                <g ref={leftEyeLidRef}>
                                    <ellipse
                                        cx="240"
                                        cy="322"
                                        rx="14.5"
                                        ry="19.5"
                                        fill={darkSurfaceColor}
                                    />
                                </g>
                                <g ref={rightEyeLidRef}>
                                    <ellipse
                                        cx="350"
                                        cy="314"
                                        rx="13.5"
                                        ry="18.5"
                                        fill={darkSurfaceColor}
                                    />
                                </g>

                                <g ref={catchlightsRef}>
                                    {CATCHLIGHTS.map((c, idx) => (
                                        <circle
                                            key={idx}
                                            cx={c.cx}
                                            cy={c.cy}
                                            r={c.r}
                                            fill={color}
                                        />
                                    ))}
                                </g>
                            </g>

                            {FRECKLES.map((f, idx) => (
                                <circle
                                    key={idx}
                                    cx={f.cx}
                                    cy={f.cy}
                                    r={f.r}
                                    fill={darkSurfaceColor}
                                />
                            ))}

                            <path
                                d={PATHS.nose}
                                stroke={darkSurfaceColor}
                                strokeWidth="5.5"
                                strokeLinecap="round"
                            />
                            <path
                                d={PATHS.smile}
                                stroke={darkSurfaceColor}
                                strokeWidth="5.5"
                                strokeLinecap="round"
                            />
                        </g>

                        {/* LAYER 6: Round Glasses (dark frames + invisible-on-face light rim where frames cross dark areas) */}
                        <g ref={glassesRef}>
                            <g fill="none" stroke={color} strokeLinecap="round">
                                <circle cx="236" cy="318" r="55" strokeWidth="14" />
                                <circle cx="364" cy="310" r="51" strokeWidth="14" />
                                <path d={PATHS.glassesBridge} strokeWidth="14" />
                                <path d={PATHS.glassesTemple} strokeWidth="13" />
                            </g>
                            <g fill="none" stroke={darkSurfaceColor} strokeLinecap="round">
                                <circle cx="236" cy="318" r="55" strokeWidth="8.5" />
                                <circle cx="364" cy="310" r="51" strokeWidth="8.5" />
                                <path d={PATHS.glassesBridge} strokeWidth="8.5" />
                                <path d={PATHS.glassesTemple} strokeWidth="7.5" />
                            </g>
                        </g>
                    </g>
                </>
            ) : (
                /* LIGHT MODE: Original single-color mask illustration (transparent face on light backgrounds) */
                <>
                    <defs>
                        <mask id={maskId}>
                            <rect width="512" height="512" fill="black" />

                            {/* LAYER 1: Neck & Robe Collar */}
                            <g ref={collarRef}>
                                <path d={PATHS.neck} fill="black" />
                                <path
                                    d={PATHS.collarUpper}
                                    stroke="white"
                                    strokeWidth="7"
                                    strokeLinecap="round"
                                />
                                <path
                                    d={PATHS.collarLower}
                                    stroke="white"
                                    strokeWidth="7"
                                    strokeLinecap="round"
                                />

                                <path
                                    d={PATHS.leftLapel}
                                    fill="white"
                                    stroke="white"
                                    strokeWidth="6"
                                    strokeLinejoin="round"
                                />
                                <path
                                    d={PATHS.leftLapelCrease}
                                    stroke="black"
                                    strokeWidth="4.5"
                                    strokeLinecap="round"
                                />
                                <path
                                    d={PATHS.rightLapel}
                                    fill="white"
                                    stroke="white"
                                    strokeWidth="6"
                                    strokeLinejoin="round"
                                />
                                <path
                                    d={PATHS.rightLapelCrease}
                                    stroke="black"
                                    strokeWidth="4.5"
                                    strokeLinecap="round"
                                />
                            </g>

                            {/* HEAD TILT GROUP */}
                            <g ref={headTiltRef}>
                                {/* LAYER 2: Left Ear */}
                                <g ref={earRef}>
                                    <path
                                        d={PATHS.earOuter}
                                        fill="black"
                                        stroke="white"
                                        strokeWidth="8"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    />
                                    <path
                                        d={PATHS.earInner1}
                                        stroke="white"
                                        strokeWidth="6.5"
                                        strokeLinecap="round"
                                    />
                                    <path
                                        d={PATHS.earInner2}
                                        stroke="white"
                                        strokeWidth="5.5"
                                        strokeLinecap="round"
                                    />
                                </g>

                                {/* LAYER 3: Head & Jawline */}
                                <g ref={headShapeRef}>
                                    <path
                                        d={PATHS.headShape}
                                        fill="black"
                                        stroke="white"
                                        strokeWidth="8"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    />
                                </g>

                                {/* LAYER 4: Tousled Spiky Hair Silhouette */}
                                <g ref={hairRef}>
                                    <path
                                        d={PATHS.hair}
                                        fill="white"
                                        stroke="white"
                                        strokeWidth="7"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    />

                                    {PATHS.hairStrands.map((d) => (
                                        <path
                                            key={d}
                                            d={d}
                                            stroke="black"
                                            strokeWidth="5"
                                            strokeLinecap="round"
                                        />
                                    ))}
                                </g>

                                {/* LAYER 5: Facial Features + Independent Tracking Eyes */}
                                <g ref={featuresRef}>
                                    <g ref={leftBrowRef}>
                                        <path
                                            d={PATHS.leftBrow}
                                            stroke="white"
                                            strokeWidth="7.5"
                                            strokeLinecap="round"
                                        />
                                    </g>
                                    <g ref={rightBrowRef}>
                                        <path
                                            d={PATHS.rightBrow}
                                            stroke="white"
                                            strokeWidth="7.5"
                                            strokeLinecap="round"
                                        />
                                    </g>

                                    <g ref={eyesRef}>
                                        <g ref={leftEyeLidRef}>
                                            <ellipse
                                                cx="240"
                                                cy="322"
                                                rx="14.5"
                                                ry="19.5"
                                                fill="white"
                                            />
                                        </g>
                                        <g ref={rightEyeLidRef}>
                                            <ellipse
                                                cx="350"
                                                cy="314"
                                                rx="13.5"
                                                ry="18.5"
                                                fill="white"
                                            />
                                        </g>

                                        <g ref={catchlightsRef}>
                                            {CATCHLIGHTS.map((c, idx) => (
                                                <circle
                                                    key={idx}
                                                    cx={c.cx}
                                                    cy={c.cy}
                                                    r={c.r}
                                                    fill="black"
                                                />
                                            ))}
                                        </g>
                                    </g>

                                    {FRECKLES.map((f, idx) => (
                                        <circle
                                            key={idx}
                                            cx={f.cx}
                                            cy={f.cy}
                                            r={f.r}
                                            fill="white"
                                        />
                                    ))}

                                    <path
                                        d={PATHS.nose}
                                        stroke="white"
                                        strokeWidth="5.5"
                                        strokeLinecap="round"
                                    />
                                    <path
                                        d={PATHS.smile}
                                        stroke="white"
                                        strokeWidth="5.5"
                                        strokeLinecap="round"
                                    />
                                </g>

                                {/* LAYER 6: Round Glasses / Specs */}
                                <g ref={glassesRef}>
                                    <circle
                                        cx="236"
                                        cy="318"
                                        r="55"
                                        fill="none"
                                        stroke="white"
                                        strokeWidth="8.5"
                                    />
                                    <circle
                                        cx="364"
                                        cy="310"
                                        r="51"
                                        fill="none"
                                        stroke="white"
                                        strokeWidth="8.5"
                                    />
                                    <path
                                        d={PATHS.glassesBridge}
                                        stroke="white"
                                        strokeWidth="8.5"
                                        strokeLinecap="round"
                                    />
                                    <path
                                        d={PATHS.glassesTemple}
                                        stroke="white"
                                        strokeWidth="7.5"
                                        strokeLinecap="round"
                                    />
                                </g>
                            </g>
                        </mask>
                    </defs>

                    <rect width="512" height="512" fill={color} mask={`url(#${maskId})`} />
                </>
            )}
        </svg>
    );
};

export default Avatar;
