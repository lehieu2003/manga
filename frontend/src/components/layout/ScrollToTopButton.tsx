import { ArrowUp } from "lucide-react";
import { useEffect, useState } from "react";

const SCROLL_VISIBILITY_THRESHOLD = 360;

export function ScrollToTopButton() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const updateVisibility = () => {
      setIsVisible(window.scrollY > SCROLL_VISIBILITY_THRESHOLD);
    };

    updateVisibility();
    window.addEventListener("scroll", updateVisibility, { passive: true });
    return () => window.removeEventListener("scroll", updateVisibility);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <button className={`scroll-to-top ${isVisible ? "scroll-to-top-visible" : ""}`} onClick={scrollToTop} type="button" aria-label="Scroll to top" title="Scroll to top">
      <ArrowUp size={19} />
    </button>
  );
}
