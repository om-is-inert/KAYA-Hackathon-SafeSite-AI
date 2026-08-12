import { useEffect, useRef, useState, useMemo, useCallback } from 'react';

const dist = (a, b) => {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return Math.sqrt(dx * dx + dy * dy);
};

const getAttr = (distance, maxDist, minVal, maxVal) => {
  const val = maxVal - Math.abs((maxVal * distance) / maxDist);
  return Math.max(minVal, val + minVal);
};

const debounce = (func, delay) => {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      func.apply(this, args);
    }, delay);
  };
};

const TextPressure = ({
  text = 'Compressa',
  fontFamily = 'Roboto Flex',
  fontUrl = 'https://fonts.googleapis.com/css2?family=Roboto+Flex:opsz,wdth,wght@8..144,25..151,100..1000&display=swap',

  width = true,
  weight = true,
  italic = true,
  alpha = false,

  flex = true,
  stroke = false,
  scale = false,

  textColor = '#FFFFFF',
  strokeColor = '#FF0000',
  className = '',

  minFontSize = 24,
  sizeFactor = 2
}) => {
  const containerRef = useRef(null);
  const titleRef = useRef(null);
  const spansRef = useRef([]);
  const spanCentersRef = useRef([]);

  const mouseRef = useRef({ x: 0, y: 0 });
  const cursorRef = useRef({ x: 0, y: 0 });
  const isHoveredRef = useRef(false);
  const hoverAmountRef = useRef(0);
  const titleWidthRef = useRef(0);

  const [fontSize, setFontSize] = useState(minFontSize);
  const [scaleY, setScaleY] = useState(1);
  const [lineHeight, setLineHeight] = useState(1);

  const chars = text.split('');

  useEffect(() => {
    if (containerRef.current) {
      const { width, height } = containerRef.current.getBoundingClientRect();
      mouseRef.current.x = width / 2;
      mouseRef.current.y = height / 2;
      cursorRef.current.x = width / 2;
      cursorRef.current.y = height / 2;
    }
  }, []);

  const setSize = useCallback(() => {
    if (!containerRef.current || !titleRef.current) return;

    const { width: containerW, height: containerH } = containerRef.current.getBoundingClientRect();

    let newFontSize = containerW / (chars.length / sizeFactor);
    newFontSize = Math.max(newFontSize, minFontSize);

    setFontSize(newFontSize);
    setScaleY(1);
    setLineHeight(1);

    requestAnimationFrame(() => {
      if (!titleRef.current || !containerRef.current) return;
      const textRect = titleRef.current.getBoundingClientRect();
      const containerRect = containerRef.current.getBoundingClientRect();

      if (scale && textRect.height > 0) {
        const yRatio = containerH / textRect.height;
        setScaleY(yRatio);
        setLineHeight(yRatio);
      }

      titleWidthRef.current = textRect.width;

      // Cache span centers relative to the container to prevent layout thrashing on hover
      spanCentersRef.current = spansRef.current.map(span => {
        if (!span) return { x: 0, y: 0 };
        const rect = span.getBoundingClientRect();
        return {
          x: rect.x + rect.width / 2 - containerRect.x,
          y: rect.y + rect.height / 2 - containerRect.y
        };
      });
    });
  }, [chars.length, minFontSize, scale]);

  useEffect(() => {
    const debouncedSetSize = debounce(setSize, 100);
    debouncedSetSize();
    window.addEventListener('resize', debouncedSetSize);
    return () => window.removeEventListener('resize', debouncedSetSize);
  }, [setSize]);

  useEffect(() => {
    let rafId;
    const animate = () => {
      const targetHover = isHoveredRef.current ? 1 : 0;
      hoverAmountRef.current += (targetHover - hoverAmountRef.current) / 10;

      mouseRef.current.x += (cursorRef.current.x - mouseRef.current.x) / 15;
      mouseRef.current.y += (cursorRef.current.y - mouseRef.current.y) / 15;

      if (titleRef.current && containerRef.current) {
        const maxDist = titleWidthRef.current / 2;

        spansRef.current.forEach((span, i) => {
          if (!span) return;

          const charCenter = spanCentersRef.current[i];
          if (!charCenter) return;

          const d = dist(mouseRef.current, charCenter);

          const dynWdth = width ? Math.floor(getAttr(d, maxDist, 5, 200)) : 100;
          const dynWght = weight ? Math.floor(getAttr(d, maxDist, 100, 900)) : 400;
          const dynItalVal = italic ? parseFloat(getAttr(d, maxDist, 0, 1).toFixed(2)) : 0;
          const dynAlphaVal = alpha ? parseFloat(getAttr(d, maxDist, 0, 1).toFixed(2)) : 1;

          const normalWdth = 100;
          const normalWght = 400;
          const normalItal = 0;
          const normalAlpha = 1;

          const wdth = normalWdth + (dynWdth - normalWdth) * hoverAmountRef.current;
          const wght = normalWght + (dynWght - normalWght) * hoverAmountRef.current;
          const italVal = normalItal + (dynItalVal - normalItal) * hoverAmountRef.current;
          const alphaVal = normalAlpha + (dynAlphaVal - normalAlpha) * hoverAmountRef.current;

          const newFontVariationSettings = `'wght' ${Math.floor(wght)}, 'wdth' ${Math.floor(wdth)}, 'ital' ${italVal.toFixed(2)}`;

          if (span.style.fontVariationSettings !== newFontVariationSettings) {
            span.style.fontVariationSettings = newFontVariationSettings;
          }
          if (alpha && span.style.opacity !== alphaVal) {
            span.style.opacity = alphaVal;
          }
        });
      }

      rafId = requestAnimationFrame(animate);
    };

    animate();
    return () => cancelAnimationFrame(rafId);
  }, [width, weight, italic, alpha]);

  const styleElement = useMemo(() => {
    return (
      <style>{`
        @import url('${fontUrl}');

        .flex {
          display: flex;
          justify-content: space-between;
        }

        .stroke span {
          position: relative;
          color: ${textColor};
        }
        .stroke span::after {
          content: attr(data-char);
          position: absolute;
          left: 0;
          top: 0;
          color: transparent;
          z-index: -1;
          -webkit-text-stroke-width: 3px;
          -webkit-text-stroke-color: ${strokeColor};
        }

        .text-pressure-title {
          color: ${textColor};
        }
      `}</style>
    );
  }, [fontFamily, fontUrl, textColor, strokeColor]);

  const dynamicClassName = [className, flex ? 'flex' : '', stroke ? 'stroke' : ''].filter(Boolean).join(' ');

  const handleMouseMove = e => {
    isHoveredRef.current = true;
    const container = containerRef.current;
    if (!container) return;
    
    let target = e.nativeEvent.target;
    let x = e.nativeEvent.offsetX;
    let y = e.nativeEvent.offsetY;
    
    while (target && target !== container) {
      x += target.offsetLeft;
      y += target.offsetTop;
      target = target.offsetParent;
    }
    
    cursorRef.current.x = x;
    cursorRef.current.y = y;
  };

  const handleMouseEnter = () => {
    isHoveredRef.current = true;
  };

  const handleMouseLeave = () => {
    isHoveredRef.current = false;
  };

  const handleTouchMove = e => {
    isHoveredRef.current = true;
    const t = e.touches[0];
    if (containerRef.current) {
      // Touch events don't have offsetX/Y, but touch movement is less frequent and getBoundingClientRect is acceptable here if needed,
      // though ideally we'd just use a cached rect. For now, since hover lag is primarily mouse, this is fine.
      const rect = containerRef.current.getBoundingClientRect();
      cursorRef.current.x = t.clientX - rect.x;
      cursorRef.current.y = t.clientY - rect.y;
    }
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleMouseLeave}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        background: 'transparent'
      }}
    >
      {styleElement}
      <h1
        ref={titleRef}
        className={`text-pressure-title ${dynamicClassName}`}
        style={{
          fontFamily,
          textTransform: 'uppercase',
          fontSize: fontSize,
          lineHeight,
          transform: `scale(1, ${scaleY})`,
          transformOrigin: 'center top',
          margin: 0,
          textAlign: 'center',
          userSelect: 'none',
          whiteSpace: 'nowrap',
          fontWeight: 100,
          width: '100%'
        }}
      >
        {chars.map((char, i) => (
          <span
            key={i}
            ref={el => {
              spansRef.current[i] = el;
            }}
            data-char={char}
            style={{
              display: 'inline-block',
              color: stroke ? undefined : textColor,
              width: char === ' ' ? '0.5em' : 'auto'
            }}
          >
            {char === ' ' ? '\u00A0' : char}
          </span>
        ))}
      </h1>
    </div>
  );
};

export default TextPressure;
