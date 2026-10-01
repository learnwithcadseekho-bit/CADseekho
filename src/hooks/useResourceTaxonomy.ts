import { getSoftwareList, getTopicList } from "@/services/resourceService";
import { useCachedData } from "@/hooks/useCachedData";

export function useResourceTaxonomy() {
  const software = useCachedData("resources:software", getSoftwareList);
  const topics = useCachedData("resources:topics", getTopicList);

  return {
    software: software.data ?? null,
    topics: topics.data ?? null,
    error: Boolean(software.error || topics.error),
  };
}
