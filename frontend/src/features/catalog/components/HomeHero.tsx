import { createTimeline } from 'animejs/timeline';
import { animate } from 'animejs/animation';
import { stagger } from 'animejs/utils';
import { Compass, Flame, Play, Sparkles } from 'lucide-react';
import { type CSSProperties, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { assetUrl } from '@/api';
import type { LibraryItem, MangaSummary } from '@/types';

type HomeHeroProps = {
  isSignedIn: boolean;
  manga: MangaSummary[];
  continueItem?: LibraryItem;
};

type HeroStyle = CSSProperties & {
  '--hero-bg'?: string;
};

export function HomeHero({ isSignedIn, manga, continueItem }: HomeHeroProps) {
  const rootRef = useRef<HTMLElement | null>(null);
  const hoverBgRef = useRef<HTMLDivElement | null>(null);
  const hoverAnimRef = useRef<ReturnType<typeof animate> | null>(null);
  const coverAnimsRef = useRef<Map<Element, ReturnType<typeof animate>>>(
    new Map(),
  );
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const heroManga = manga.slice(0, 5);
  const featured = heroManga.find((item) => item.coverUrl) ?? heroManga[0];
  const primaryHref = getPrimaryHref(continueItem);
  const primaryLabel = primaryHref.startsWith('/read/')
    ? 'Continue Reading'
    : 'Start Reading';
  const motionKey = heroManga.map((item) => item.id).join('|');
  const heroStyle: HeroStyle = featured?.coverUrl
    ? { '--hero-bg': `url("${assetUrl(featured.coverUrl)}")` }
    : {};

  useEffect(() => {
    const root = rootRef.current;
    if (!root || shouldReduceMotion()) return;

    const background = root.querySelector('[data-hero-bg]');
    const copyItems = root.querySelectorAll('[data-hero-copy]');
    const actionItems = root.querySelectorAll('[data-hero-action]');
    const coverItems = root.querySelectorAll('[data-hero-cover]');
    if (!background) return;

    const timeline = createTimeline({
      defaults: {
        ease: 'outCubic',
      },
    });

    timeline
      .add(background, {
        opacity: [0.55, 1],
        scale: [1.03, 1.08],
        duration: 1600,
      })
      .add(
        copyItems,
        {
          opacity: [0, 1],
          y: [24, 0],
          duration: 620,
          delay: stagger(95),
        },
        '-=1220',
      )
      .add(
        actionItems,
        {
          opacity: [0, 1],
          x: [-18, 0],
          duration: 460,
          delay: stagger(70),
        },
        '-=320',
      )
      .add(
        coverItems,
        {
          opacity: [0, 1],
          y: [34, 0],
          rotate: [-4, 0],
          duration: 580,
          delay: stagger(85),
        },
        '-=360',
      );

    return () => {
      timeline.revert();
    };
  }, [motionKey]);

  // Clean up any in-flight hover animations if the component unmounts mid-hover.
  useEffect(() => {
    return () => {
      hoverAnimRef.current?.revert();
      coverAnimsRef.current.forEach((anim) => anim.revert());
      coverAnimsRef.current.clear();
    };
  }, []);

  function handleCoverEnter(item: MangaSummary, coverEl: HTMLElement) {
    if (!item.coverUrl) return;

    setHoveredId(item.id);

    const reduceMotion = shouldReduceMotion();
    const hoverBg = hoverBgRef.current;

    if (hoverBg) {
      hoverBg.style.backgroundImage = `url("${assetUrl(item.coverUrl)}")`;
      hoverAnimRef.current?.revert();
      hoverAnimRef.current = animate(hoverBg, {
        opacity: [Number.parseFloat(getComputedStyle(hoverBg).opacity) || 0, 1],
        scale: [1.1, 1.02],
        duration: reduceMotion ? 0 : 620,
        ease: 'outCubic',
      });
    }

    animateCoverFocus(coverEl, true, reduceMotion);
  }

  function handleCoverLeave(coverEl: HTMLElement) {
    setHoveredId(null);

    const reduceMotion = shouldReduceMotion();
    const hoverBg = hoverBgRef.current;

    if (hoverBg) {
      hoverAnimRef.current?.revert();
      hoverAnimRef.current = animate(hoverBg, {
        opacity: 0,
        scale: 1.1,
        duration: reduceMotion ? 0 : 420,
        ease: 'outCubic',
      });
    }

    animateCoverFocus(coverEl, false, reduceMotion);
  }

  function animateCoverFocus(
    coverEl: HTMLElement,
    focused: boolean,
    reduceMotion: boolean,
  ) {
    const root = rootRef.current;
    if (!root) return;

    const allCovers = Array.from(
      root.querySelectorAll<HTMLElement>('[data-hero-cover]'),
    );

    allCovers.forEach((cover) => {
      coverAnimsRef.current.get(cover)?.revert();

      const isHovered = cover === coverEl;
      const target = focused
        ? {
            scale: isHovered ? 1.08 : 0.96,
            opacity: isHovered ? 1 : 0.45,
          }
        : { scale: 1, opacity: 1 };

      const anim = animate(cover, {
        ...target,
        duration: reduceMotion ? 0 : 380,
        ease: 'outCubic',
      });

      coverAnimsRef.current.set(cover, anim);
    });
  }

  return (
    <section ref={rootRef} className='home-hero' style={heroStyle}>
      <div className='home-hero-bg' data-hero-bg />
      <div
        className='home-hero-bg home-hero-bg-hover'
        data-hero-bg-hover
        ref={hoverBgRef}
        aria-hidden
      />
      <div className='home-hero-shade' />
      <div className='home-hero-inner'>
        <div className='home-hero-copy'>
          <p className='home-hero-kicker' data-hero-copy>
            <Sparkles size={16} />
            Premium manga reader
          </p>
          <h1 data-hero-copy>Find your next obsession.</h1>
          <p className='home-hero-lede' data-hero-copy>
            Track chapters, jump back into your shelf, and discover popular
            series without breaking the reading flow.
          </p>
          <div className='home-hero-actions'>
            <Link className='btn btn-primary' to={primaryHref} data-hero-action>
              <Play size={18} />
              {primaryLabel}
            </Link>
            <Link
              className='btn home-hero-secondary'
              to='/discover/popular'
              data-hero-action
            >
              <Flame size={18} />
              View Popular
            </Link>
          </div>
        </div>

        <div className='home-hero-covers' aria-label='Popular manga'>
          {heroManga.length ? (
            heroManga.map((item, index) => (
              <Link
                key={item.id}
                to={`/manga/${item.id}`}
                className={`home-hero-cover${hoveredId === item.id ? ' is-active' : ''}`}
                data-hero-cover
                style={{ '--cover-index': index } as CSSProperties}
                onMouseEnter={(event) =>
                  handleCoverEnter(item, event.currentTarget)
                }
                onMouseLeave={(event) => handleCoverLeave(event.currentTarget)}
                onFocus={(event) => handleCoverEnter(item, event.currentTarget)}
                onBlur={(event) => handleCoverLeave(event.currentTarget)}
              >
                <div className='manga-cover-frame rounded-lg'>
                  {item.coverUrl ? (
                    <img
                      src={assetUrl(item.coverUrl)}
                      alt={item.title}
                      loading={index === 0 ? 'eager' : 'lazy'}
                    />
                  ) : (
                    <Compass size={28} />
                  )}
                </div>
                <span>{item.title}</span>
              </Link>
            ))
          ) : (
            <div
              className='home-hero-cover home-hero-cover-empty'
              data-hero-cover
            >
              <Compass size={30} />
              <span>Explore the catalog</span>
            </div>
          )}
        </div>
      </div>
      {isSignedIn ? <div className='home-hero-status'>Shelf synced</div> : null}
    </section>
  );
}

function getPrimaryHref(item?: LibraryItem) {
  const chapterId = item?.readingProgress?.chapterId ?? item?.lastChapterId;

  return chapterId && item
    ? `/read/${chapterId}?mangaId=${item.mangaId}`
    : '/search';
}

function shouldReduceMotion() {
  if (typeof window.matchMedia !== 'function') return false;

  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
