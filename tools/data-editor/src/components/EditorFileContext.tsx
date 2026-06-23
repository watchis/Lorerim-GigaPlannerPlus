import { createContext, useContext, type ReactNode } from "react";

const EditorFileContext = createContext<string | null>(null);

export function EditorFileProvider({
  path,
  children,
}: {
  path: string;
  children: ReactNode;
}) {
  return <EditorFileContext.Provider value={path}>{children}</EditorFileContext.Provider>;
}

export function useEditorFilePath(): string | null {
  return useContext(EditorFileContext);
}
