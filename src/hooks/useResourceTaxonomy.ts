import { useEffect, useState } from "react";
import { getSoftwareList, getTopicList } from "@/services/resourceService";
import type { Software, Topic } from "@/types/resource";

export function useResourceTaxonomy() {
  const [software, setSoftware] = useState<Software[] | null>(null);
  const [topics, setTopics] = useState<Topic[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    Promise.all([getSoftwareList(), getTopicList()])
      .then(([s, t]) => {
        setSoftware(s);
        setTopics(t);
      })
      .catch(() => setError(true));
  }, []);

  return { software, topics, error };
}
