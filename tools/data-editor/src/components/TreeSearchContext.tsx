import { createContext, useContext, type ReactNode } from "react";

const TreeSearchContext = createContext("");

export function TreeSearchProvider({
  query,
  children,
}: {
  query: string;
  children: ReactNode;
}) {
  return <TreeSearchContext.Provider value={query}>{children}</TreeSearchContext.Provider>;
}

export function useTreeSearch(): string {
  return useContext(TreeSearchContext);
}
