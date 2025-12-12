import type { CSSProperties } from "react";

import patterns from "@/styles/patterns.module.css";

export interface SkeletonProps {
  className?: string;
  style?: CSSProperties;
}

export function Skeleton({ className, style }: SkeletonProps) {
  const combinedClassName = className ? `${patterns.skeleton} ${className}` : patterns.skeleton;
  return <div aria-hidden className={combinedClassName} style={style} />;
}
