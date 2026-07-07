import ReactMarkdown from "react-markdown";
import remarkBreaks from "remark-breaks";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

interface VariantNotesMarkdownProps {
  content: string;
  className?: string;
}

const headingClassName = "mb-2 font-semibold leading-snug last:mb-0";

export function VariantNotesMarkdown({ content, className }: VariantNotesMarkdownProps) {
  return (
    <div className={cn("text-sm text-[var(--color-foreground)]", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkBreaks]}
        components={{
          p: ({ children }) => (
            <p className="mb-2 leading-relaxed whitespace-pre-wrap last:mb-0">{children}</p>
          ),
          strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
          em: ({ children }) => <em className="italic">{children}</em>,
          del: ({ children }) => <del className="text-[var(--color-muted)]">{children}</del>,
          ul: ({ children }) => <ul className="mb-2 list-disc space-y-1 pl-5 last:mb-0">{children}</ul>,
          ol: ({ children }) => (
            <ol className="mb-2 list-decimal space-y-1 pl-5 last:mb-0">{children}</ol>
          ),
          li: ({ children }) => <li className="leading-relaxed">{children}</li>,
          a: ({ href, children, title }) => (
            <a
              href={href}
              title={title}
              className="text-[var(--color-accent)] underline underline-offset-2 hover:text-[var(--color-accent-muted)]"
              target="_blank"
              rel="noopener noreferrer"
            >
              {children}
            </a>
          ),
          img: ({ src, alt, title }) => (
            <img
              src={src}
              alt={alt ?? ""}
              title={title}
              className="my-2 max-h-64 max-w-full rounded-[var(--radius-md)] border border-[var(--color-border)] object-contain"
            />
          ),
          h1: ({ children }) => <h1 className={cn(headingClassName, "text-lg")}>{children}</h1>,
          h2: ({ children }) => <h2 className={cn(headingClassName, "text-base")}>{children}</h2>,
          h3: ({ children }) => <h3 className={cn(headingClassName, "text-sm")}>{children}</h3>,
          h4: ({ children }) => (
            <h4 className={cn(headingClassName, "text-sm font-medium")}>{children}</h4>
          ),
          h5: ({ children }) => (
            <h5 className={cn(headingClassName, "text-xs font-medium uppercase tracking-wide")}>
              {children}
            </h5>
          ),
          h6: ({ children }) => (
            <h6 className={cn(headingClassName, "text-xs font-medium text-[var(--color-muted)]")}>
              {children}
            </h6>
          ),
          code: ({ className: codeClassName, children }) => {
            const isBlock = codeClassName?.includes("language-");
            if (isBlock) {
              return (
                <code className={cn("font-mono text-xs text-[var(--color-foreground)]", codeClassName)}>
                  {children}
                </code>
              );
            }
            return (
              <code className="rounded-[var(--radius-sm)] bg-[var(--color-surface-elevated)] px-1 py-0.5 font-mono text-xs">
                {children}
              </code>
            );
          },
          pre: ({ children }) => (
            <pre className="mb-2 overflow-x-auto rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)]/60 p-3 font-mono text-xs last:mb-0">
              {children}
            </pre>
          ),
          blockquote: ({ children }) => (
            <blockquote className="mb-2 border-l-2 border-[var(--color-accent-muted)] pl-3 text-[var(--color-muted)] last:mb-0">
              {children}
            </blockquote>
          ),
          hr: () => <hr className="my-3 border-[var(--color-border)]" />,
          table: ({ children }) => (
            <div className="mb-2 overflow-x-auto last:mb-0">
              <table className="w-full border-collapse text-left text-sm">{children}</table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="border-b border-[var(--color-border)] bg-[var(--color-surface-elevated)]/60">
              {children}
            </thead>
          ),
          tbody: ({ children }) => <tbody>{children}</tbody>,
          tr: ({ children }) => <tr className="border-b border-[var(--color-border)]/60">{children}</tr>,
          th: ({ children }) => <th className="px-2 py-1.5 font-semibold">{children}</th>,
          td: ({ children }) => <td className="px-2 py-1.5 align-top">{children}</td>,
          input: ({ checked, disabled }) => (
            <input
              type="checkbox"
              checked={checked}
              disabled={disabled}
              readOnly
              className="mr-2 align-middle accent-[var(--color-accent)]"
            />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
