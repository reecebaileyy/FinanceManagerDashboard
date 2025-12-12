import patterns from "@/styles/patterns.module.css";

import { Card, CardBody, CardHeader } from "@components/dashboard/card";

export interface FeaturePlaceholderProps {
  id?: string;
  title: string;
  description: string;
  highlights: string[];
  nextSteps?: string;
  badge?: string;
}

export function FeaturePlaceholder({
  id,
  title,
  description,
  highlights,
  nextSteps,
  badge = "in progress",
}: FeaturePlaceholderProps) {
  return (
    <section id={id} className={patterns.section}>
      <Card>
        <CardHeader title={title} badge={badge} />
        <CardBody>
          <p>{description}</p>
          {highlights.length ? (
            <ul className={patterns.blockList}>
              {highlights.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          ) : null}
          {nextSteps ? <p className={patterns.calloutText}>{nextSteps}</p> : null}
        </CardBody>
      </Card>
    </section>
  );
}
