import { type RefObject, useEffect, useState } from "react";

export const useElementWidth = <T extends HTMLElement>(ref: RefObject<T | null>) => {
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const node = ref.current;
    if (!node) {
      return;
    }

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        setWidth(Math.round(entry.contentRect.width));
      }
    });

    observer.observe(node);
    setWidth(Math.round(node.getBoundingClientRect().width));
    return () => observer.disconnect();
  }, [ref]);

  return width;
};
