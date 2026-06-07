import {
  floatLoop,
  GSAP_EASE_SMOOTH,
  GSAP_EASE_SPRING,
  splitTextToSpans,
} from './gsapMotion'
import { PAGE_ENTER_START_DELAY, PAGE_ENTER_TIME_SCALE } from './gsapTokens'
import { gsap } from './registerGsap'

export type PageEnterPreset =
  | 'home'
  | 'timeline'
  | 'friends'
  | 'message'
  | 'xiqi'
  | 'post'
  | 'compose'
  | 'notes'
  | 'placeholder'

const floatCleanups: Array<() => void> = []

/** 拆字动画前：父级须可见，字符单独隐藏 */
function primeSplitHeading(
  el: HTMLElement | null,
  charClass: string,
  initial: gsap.TweenVars,
): HTMLElement[] {
  if (!el) return []
  gsap.set(el, { autoAlpha: 1 })
  const chars = splitTextToSpans(el, charClass)
  if (chars.length) gsap.set(chars, initial)
  return chars
}

/** 拆字显现：须用 to/fromTo，勿用 from({ autoAlpha: 1 }) 否则会淡出 */
function revealSplitChars(
  tl: gsap.core.Timeline,
  chars: HTMLElement[],
  vars: gsap.TweenVars,
  position?: gsap.Position,
) {
  if (!chars.length) return
  tl.to(chars, vars, position)
}

export function detectPageEnterPreset(root: HTMLElement): PageEnterPreset | null {
  if (root.classList.contains('home-layout')) return 'home'
  if (root.classList.contains('projects-page') || root.classList.contains('blog-page')) {
    return 'timeline'
  }
  if (root.classList.contains('friends-page') || root.classList.contains('friends-apply-page')) {
    return 'friends'
  }
  if (root.classList.contains('message-page')) return 'message'
  if (root.classList.contains('xiqi-page')) return 'xiqi'
  if (root.classList.contains('post-detail-article') || root.classList.contains('project-detail')) {
    return 'post'
  }
  if (root.classList.contains('compose-page')) return 'compose'
  if (root.classList.contains('project-notes-page')) return 'notes'
  if (root.classList.contains('nav-placeholder-page')) return 'placeholder'
  return null
}

export function killPageEnterAmbient() {
  while (floatCleanups.length) floatCleanups.pop()?.()
}

/** 入场前瞬间隐藏，避免 GSAP 启动前 FOUC */
export function primePageEnterHidden(root: HTMLElement, preset: PageEnterPreset) {
  killPageEnterAmbient()
  const hide = (sel: string, vars: gsap.TweenVars) => {
    const els = root.querySelectorAll(sel)
    if (els.length) gsap.set(els, vars)
  }

  switch (preset) {
    case 'home':
      hide(':scope > aside.left-ellipse', { autoAlpha: 0, x: '-28vw', rotation: -2 })
      hide(':scope > aside.right-panel', { autoAlpha: 0, x: '28vw', rotation: 2 })
      hide('.center > .avatar', { autoAlpha: 0, y: -28, scale: 0.88 })
      hide('.center > .greeting-art, .center > .internship-note, .center > .self-intro-box', {
        autoAlpha: 0,
        y: 22,
        filter: 'blur(5px)',
      })
      hide(
        '.self-intro-box .cursor-placeholder-tech, .self-intro-box .cursor-placeholder > p:not(.cursor-placeholder-tech)',
        { autoAlpha: 0, y: 14 },
      )
      hide('.latest-post-card', { autoAlpha: 0, y: 20, scale: 0.96 })
      break
    case 'timeline':
      hide(':scope > .toolbar', { autoAlpha: 0, y: -18, filter: 'blur(4px)' })
      hide('.timeline-year-head', { autoAlpha: 0, x: -22, scale: 0.98 })
      hide('.timeline-item .timeline-date', { autoAlpha: 0, x: -14 })
      hide('.timeline-item .timeline-dot', { autoAlpha: 0, scale: 0 })
      hide('.timeline-item .timeline-card', {
        autoAlpha: 0,
        scaleX: 0.9,
        transformOrigin: 'left center',
        filter: 'blur(5px)',
      })
      break
    case 'friends':
      hide(':scope > *', { autoAlpha: 0, y: 22, filter: 'blur(4px)' })
      hide('.friend-card, .friends-special-card', { autoAlpha: 0, y: 16, scale: 0.94 })
      break
    case 'message':
      hide(':scope > *', { autoAlpha: 0, y: 20 })
      hide('.message-item', { autoAlpha: 0, y: 16, scale: 0.97 })
      break
    case 'xiqi':
      hide('.xiqi-hero', { autoAlpha: 0, x: '-34vw', scale: 0.94, rotation: -1.5 })
      hide('.xiqi-hero-chips > *', { autoAlpha: 0, y: 14, scale: 0.96 })
      hide('.xiqi-split-main-inner > *:not(.xiqi-hero), .about-page-inner > *:not(.xiqi-hero)', {
        autoAlpha: 0,
        y: 22,
      })
      hide('.xiqi-card', { autoAlpha: 0, y: 20, rotation: () => gsap.utils.random(-2, 2) })
      break
    case 'post':
      hide(':scope > *', { autoAlpha: 0, y: -18, filter: 'blur(8px)' })
      hide('.project-block, .blocks > *', { autoAlpha: 0, y: 24, filter: 'blur(6px)' })
      break
    case 'compose':
      hide('.compose-head', { autoAlpha: 0, y: -20, filter: 'blur(6px)' })
      hide('.compose-main > .card, .compose-preview', { autoAlpha: 0, y: 22, scale: 0.98 })
      break
    case 'notes':
      hide('.back, :scope > .h', { autoAlpha: 0, y: -14, filter: 'blur(4px)' })
      hide('.post-card, article.post-card', { autoAlpha: 0, y: 18, scale: 0.97 })
      break
    case 'placeholder':
      hide(':scope > .muted', { autoAlpha: 0, y: 20 })
      break
  }
}

/** preset 动画失败时兜底显现，避免 prime 后一直透明 */
export function revealPageEnterFallback(root: HTMLElement) {
  gsap.to(root.querySelectorAll(':scope > *, :scope .center > *, :scope .timeline-item, :scope .xiqi-card, :scope .message-item, :scope .friend-card, :scope .post-card, :scope .project-block'), {
    autoAlpha: 1,
    y: 0,
    x: 0,
    scale: 1,
    rotation: 0,
    filter: 'blur(0px)',
    duration: 1.1,
    stagger: 0.12,
    ease: GSAP_EASE_SPRING,
    overwrite: 'auto',
  })
}

export function buildPageEnterTimeline(root: HTMLElement, preset: PageEnterPreset): gsap.core.Timeline {
  const tl = gsap.timeline({
    delay: PAGE_ENTER_START_DELAY,
    defaults: { ease: GSAP_EASE_SMOOTH },
  })

  switch (preset) {
    case 'home': {
      const narrow = window.matchMedia('(max-width: 1100px)').matches
      const sideDur = narrow ? 0.62 : 0.58
      if (narrow) {
        tl.fromTo(
          root.querySelector(':scope > aside.left-ellipse'),
          { autoAlpha: 0, y: 24, rotation: -2, filter: 'blur(6px)' },
          {
            autoAlpha: 1,
            y: 0,
            rotation: 0,
            filter: 'blur(0px)',
            duration: sideDur,
            ease: GSAP_EASE_SPRING,
          },
        ).fromTo(
          root.querySelector(':scope > aside.right-panel'),
          { autoAlpha: 0, y: 24, rotation: 2, filter: 'blur(6px)' },
          {
            autoAlpha: 1,
            y: 0,
            rotation: 0,
            filter: 'blur(0px)',
            duration: sideDur,
            ease: GSAP_EASE_SPRING,
          },
          '<0.06',
        )
      } else {
        tl.fromTo(
          root.querySelector(':scope > aside.left-ellipse'),
          { autoAlpha: 0, x: '-28vw', rotation: -2, filter: 'blur(8px)' },
          {
            autoAlpha: 1,
            x: 0,
            rotation: 0,
            filter: 'blur(0px)',
            duration: sideDur,
            ease: GSAP_EASE_SPRING,
          },
        ).fromTo(
          root.querySelector(':scope > aside.right-panel'),
          { autoAlpha: 0, x: '28vw', rotation: 2, filter: 'blur(8px)' },
          {
            autoAlpha: 1,
            x: 0,
            rotation: 0,
            filter: 'blur(0px)',
            duration: sideDur,
            ease: GSAP_EASE_SPRING,
          },
          '<',
        )
      }

      const avatar = root.querySelector('.center > .avatar')
      tl.fromTo(
        avatar,
        { autoAlpha: 0, y: -22, scale: 0.9 },
        { autoAlpha: 1, y: 0, scale: 1, duration: 0.52, ease: GSAP_EASE_SPRING },
        narrow ? 0 : '<0.06',
      )

      const greetingCard = root.querySelector('.center > .greeting-art')
      tl.fromTo(
        greetingCard,
        { autoAlpha: 0, y: 20, filter: 'blur(5px)' },
        { autoAlpha: 1, y: 0, filter: 'blur(0px)', duration: 0.48, ease: GSAP_EASE_SPRING },
        '<0.04',
      )

      const greeting = root.querySelector<HTMLElement>('.greeting-art-line')
      const greetingChars = primeSplitHeading(greeting, 'home-greeting-char', {
        autoAlpha: 0,
        y: 12,
        rotationX: -35,
        transformOrigin: '50% 100%',
      })
      revealSplitChars(
        tl,
        greetingChars,
        {
          autoAlpha: 1,
          y: 0,
          rotationX: 0,
          stagger: { each: 0.018, from: 'start' },
          duration: 0.38,
          ease: GSAP_EASE_SPRING,
        },
        '-=0.2',
      )

      tl.fromTo(
        root.querySelector('.center > .internship-note'),
        { autoAlpha: 0, y: 18, filter: 'blur(4px)' },
        { autoAlpha: 1, y: 0, filter: 'blur(0px)', duration: 0.44, ease: GSAP_EASE_SMOOTH },
        '-=0.12',
      )

      const introBox = root.querySelector('.center > .self-intro-box')
      tl.fromTo(
        introBox,
        { autoAlpha: 0, y: 22, scale: 0.98, filter: 'blur(5px)' },
        {
          autoAlpha: 1,
          y: 0,
          scale: 1,
          filter: 'blur(0px)',
          duration: 0.5,
          ease: GSAP_EASE_SPRING,
        },
        '-=0.08',
      )

      const introParts = root.querySelectorAll(
        '.self-intro-box .cursor-placeholder-tech, .self-intro-box .cursor-placeholder > p:not(.cursor-placeholder-tech)',
      )
      if (introParts.length) {
        tl.to(
          introParts,
          {
            autoAlpha: 1,
            y: 0,
            stagger: 0.05,
            duration: 0.4,
            ease: GSAP_EASE_SMOOTH,
          },
          '-=0.28',
        )
      }

      tl.fromTo(
        root.querySelectorAll('.latest-post-card'),
        { autoAlpha: 0, y: 16, scale: 0.97 },
        {
          autoAlpha: 1,
          y: 0,
          scale: 1,
          duration: 0.48,
          stagger: 0.05,
          ease: GSAP_EASE_SPRING,
        },
        '-=0.06',
      )

      if (avatar instanceof HTMLElement) {
        floatCleanups.push(floatLoop(avatar, 5, 3.6))
      }
      break
    }

    case 'timeline': {
      const heading = root.querySelector<HTMLElement>(':scope > h1.h')
      const chars = primeSplitHeading(heading, 'timeline-title-char', {
        autoAlpha: 0,
        y: 28,
        rotationX: -55,
        transformOrigin: '50% 100%',
      })
      if (chars.length) {
        revealSplitChars(
          tl,
          chars,
          {
            autoAlpha: 1,
            y: 0,
            rotationX: 0,
            stagger: { each: 0.022, from: 'start' },
            duration: 0.48,
            ease: GSAP_EASE_SPRING,
          },
          0,
        )
      }
      tl.fromTo(
        root.querySelector(':scope > .toolbar'),
        { autoAlpha: 0, y: -14, filter: 'blur(4px)' },
        { autoAlpha: 1, y: 0, filter: 'blur(0px)', duration: 0.68, delay: 0.18 },
        heading ? '<0.04' : 0,
      )
      root.querySelectorAll('.timeline-year-head').forEach((el, gi) => {
        tl.fromTo(
          el,
          { autoAlpha: 0, x: -22, scale: 0.98 },
          { autoAlpha: 1, x: 0, scale: 1, duration: 0.65, delay: 0.26 + gi * 0.12 },
          gi === 0 ? '<0.08' : '<',
        )
      })
      root.querySelectorAll('.timeline-item').forEach((item, ti) => {
        const d = 0.36 + ti * 0.09
        const fromX = ti % 2 === 0 ? -14 : -8
        tl.fromTo(
          item.querySelector('.timeline-date'),
          { autoAlpha: 0, x: fromX },
          { autoAlpha: 1, x: 0, duration: 0.58, delay: d },
          '<',
        )
          .fromTo(
            item.querySelector('.timeline-dot'),
            { autoAlpha: 0, scale: 0 },
            {
              autoAlpha: 1,
              scale: 1,
              duration: 0.55,
              ease: GSAP_EASE_SPRING,
              delay: d + 0.1,
            },
            '<',
          )
          .fromTo(
            item.querySelector('.timeline-card'),
            { autoAlpha: 0, scaleX: 0.9, filter: 'blur(5px)' },
            {
              autoAlpha: 1,
              scaleX: 1,
              filter: 'blur(0px)',
              duration: 0.75,
              ease: GSAP_EASE_SMOOTH,
              delay: d + 0.18,
            },
            '<',
          )
      })
      break
    }

    case 'friends': {
      tl.fromTo(
        root.querySelectorAll(':scope > *'),
        { autoAlpha: 0, y: 22, filter: 'blur(4px)' },
        { autoAlpha: 1, y: 0, filter: 'blur(0px)', duration: 0.7, stagger: 0.07, delay: 0.04 },
      ).fromTo(
        root.querySelectorAll('.friend-card, .friends-special-card'),
        { autoAlpha: 0, y: 16, scale: 0.94, rotation: () => gsap.utils.random(-2.5, 2.5) },
        {
          autoAlpha: 1,
          y: 0,
          scale: 1,
          rotation: 0,
          duration: 0.65,
          stagger: { each: 0.055, from: 'random' },
          ease: GSAP_EASE_SPRING,
          delay: 0.28,
        },
        '<0.06',
      )
      break
    }

    case 'message': {
      const feedTitle = root.querySelector<HTMLElement>('.message-feed-title')
      const feedChars = primeSplitHeading(feedTitle, 'message-title-char', {
        autoAlpha: 0,
        y: 18,
      })
      if (feedChars.length) {
        revealSplitChars(
          tl,
          feedChars,
          {
            autoAlpha: 1,
            y: 0,
            stagger: 0.018,
            duration: 0.4,
            ease: GSAP_EASE_SPRING,
          },
          0,
        )
      }
      tl.fromTo(
        root.querySelectorAll(':scope > .message-compose, :scope > .message-feed'),
        { autoAlpha: 0, y: 20, filter: 'blur(4px)' },
        { autoAlpha: 1, y: 0, filter: 'blur(0px)', duration: 0.68, stagger: 0.08, delay: 0.12 },
        feedTitle ? '<0.04' : 0,
      )
      root.querySelectorAll('.message-item').forEach((item, i) => {
        const fromX = i % 2 === 0 ? -18 : 18
        tl.fromTo(
          item,
          { autoAlpha: 0, x: fromX, y: 14, scale: 0.97 },
          {
            autoAlpha: 1,
            x: 0,
            y: 0,
            scale: 1,
            duration: 0.62,
            ease: GSAP_EASE_SPRING,
            delay: 0.26 + i * 0.065,
          },
          '<',
        )
      })
      break
    }

    case 'xiqi': {
      tl.fromTo(
        root.querySelector('.xiqi-hero'),
        { autoAlpha: 0, x: '-34vw', scale: 0.92, rotation: -2, filter: 'blur(8px)' },
        {
          autoAlpha: 1,
          x: 0,
          scale: 1,
          rotation: 0,
          filter: 'blur(0px)',
          duration: 0.98,
          ease: GSAP_EASE_SPRING,
          delay: 0.04,
        },
      )
        .fromTo(
          root.querySelectorAll('.xiqi-hero-chips > *'),
          { autoAlpha: 0, y: 14, scale: 0.96 },
          { autoAlpha: 1, y: 0, scale: 1, duration: 0.62, stagger: 0.09, delay: 0.4 },
          '<0.18',
        )
        .fromTo(
          root.querySelectorAll(
            '.xiqi-split-main-inner > *:not(.xiqi-hero), .about-page-inner > *:not(.xiqi-hero)',
          ),
          { autoAlpha: 0, y: 22 },
          { autoAlpha: 1, y: 0, duration: 0.72, stagger: 0.065, delay: 0.3 },
          '<0.04',
        )
        .fromTo(
          root.querySelectorAll('.xiqi-card'),
          { autoAlpha: 0, y: 20, rotation: () => gsap.utils.random(-3, 3) },
          {
            autoAlpha: 1,
            y: 0,
            rotation: 0,
            duration: 0.64,
            stagger: { each: 0.065, from: 'random' },
            ease: GSAP_EASE_SPRING,
            delay: 0.5,
          },
          '<0.04',
        )
      break
    }

    case 'post': {
      tl.fromTo(
        root.querySelectorAll(':scope > *:not(.main-content):not(.blocks)'),
        { autoAlpha: 0, y: -18, filter: 'blur(8px)' },
        {
          autoAlpha: 1,
          y: 0,
          filter: 'blur(0px)',
          duration: 0.68,
          stagger: 0.09,
          delay: 0.04,
        },
      )
      const title = root.querySelector<HTMLElement>('h1, .post-title, .h')
      const titleChars = primeSplitHeading(title, 'post-title-char', {
        autoAlpha: 0,
        y: 12,
        rotationX: -40,
        transformOrigin: '50% 100%',
      })
      if (titleChars.length > 3 && titleChars.length < 80) {
        revealSplitChars(
          tl,
          titleChars,
          {
            autoAlpha: 1,
            y: 0,
            rotationX: 0,
            stagger: 0.012,
            duration: 0.4,
            ease: GSAP_EASE_SPRING,
          },
          '<0.1',
        )
      }
      tl.fromTo(
        root.querySelectorAll('.project-block, .blocks > *'),
        { autoAlpha: 0, y: 28, filter: 'blur(6px)' },
        {
          autoAlpha: 1,
          y: 0,
          filter: 'blur(0px)',
          duration: 0.72,
          stagger: 0.1,
          ease: GSAP_EASE_SPRING,
          delay: 0.22,
        },
        '<0.08',
      )
      break
    }

    case 'compose': {
      tl.fromTo(
        root.querySelector('.compose-head'),
        { autoAlpha: 0, y: -22, filter: 'blur(8px)' },
        { autoAlpha: 1, y: 0, filter: 'blur(0px)', duration: 0.72, ease: GSAP_EASE_SPRING, delay: 0.04 },
      )
      const title = root.querySelector<HTMLElement>('.compose-title')
      const titleChars = primeSplitHeading(title, 'compose-title-char', {
        autoAlpha: 0,
        y: 14,
      })
      if (titleChars.length) {
        revealSplitChars(
          tl,
          titleChars,
          { autoAlpha: 1, y: 0, stagger: 0.016, duration: 0.38, ease: GSAP_EASE_SPRING },
          '<0.08',
        )
      }
      tl.fromTo(
        root.querySelectorAll('.compose-main > .card'),
        { autoAlpha: 0, y: 24, scale: 0.98 },
        {
          autoAlpha: 1,
          y: 0,
          scale: 1,
          duration: 0.68,
          stagger: 0.08,
          ease: GSAP_EASE_SPRING,
          delay: 0.2,
        },
        '<0.06',
      ).fromTo(
        root.querySelector('.compose-preview'),
        { autoAlpha: 0, x: 24, filter: 'blur(6px)' },
        { autoAlpha: 1, x: 0, filter: 'blur(0px)', duration: 0.75, ease: GSAP_EASE_SMOOTH },
        '<0.12',
      )
      break
    }

    case 'notes': {
      tl.fromTo(
        root.querySelectorAll('.back, :scope > .h'),
        { autoAlpha: 0, y: -16, filter: 'blur(5px)' },
        { autoAlpha: 1, y: 0, filter: 'blur(0px)', duration: 0.65, stagger: 0.1, delay: 0.04 },
      )
      tl.fromTo(
        root.querySelectorAll('.post-card, article.post-card'),
        { autoAlpha: 0, y: 20, scale: 0.97 },
        {
          autoAlpha: 1,
          y: 0,
          scale: 1,
          duration: 0.62,
          stagger: 0.07,
          ease: GSAP_EASE_SPRING,
          delay: 0.2,
        },
        '<0.04',
      )
      break
    }

    case 'placeholder': {
      const heading = root.querySelector<HTMLElement>(':scope > h1')
      const headChars = primeSplitHeading(heading, 'placeholder-char', {
        autoAlpha: 0,
        y: 22,
        rotationX: -50,
        transformOrigin: '50% 100%',
      })
      if (headChars.length) {
        revealSplitChars(
          tl,
          headChars,
          {
            autoAlpha: 1,
            y: 0,
            rotationX: 0,
            stagger: { each: 0.024, from: 'center' },
            duration: 0.45,
            ease: GSAP_EASE_SPRING,
          },
          0,
        )
      }
      tl.fromTo(
        root.querySelector(':scope > .muted'),
        { autoAlpha: 0, y: 16 },
        { autoAlpha: 1, y: 0, duration: 0.55, ease: GSAP_EASE_SMOOTH },
        '<0.2',
      )
      break
    }
  }

  tl.timeScale(PAGE_ENTER_TIME_SCALE)
  return tl
}
