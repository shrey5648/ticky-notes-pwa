"use client";

import { useState, type ReactNode } from "react";
import { FileStack, Sparkles } from "lucide-react";
import {
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  DialogTrigger,
} from "@/components/ui";
import { useTemplates } from "@/lib/firestore-hooks";
import { useAuth } from "@/lib/auth-context";
import { BUILTIN_TEMPLATES, renderTemplate } from "./templateDefaults";
import { cn } from "@/lib/utils";

interface Props {
  /** Receives the title and token-substituted body of the chosen template. */
  onPick: (input: { title: string; content: string }) => void;
  trigger?: ReactNode;
}

/**
 * Offers the built-in templates alongside any the user has saved. Tokens are
 * substituted at pick time, so `{{date}}` captures when the note was created,
 * not when the template was written.
 */
export function TemplatePickerModal({ onPick, trigger }: Props) {
  const { templates } = useTemplates();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");

  const author = user?.displayName || user?.email || "";

  function pick(name: string, content: string) {
    const finalTitle = title.trim() || name;
    onPick({
      title: finalTitle,
      content: renderTemplate(content, { author, title: finalTitle }),
    });
    setTitle("");
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="sm">
            <FileStack className="h-3.5 w-3.5" /> From template
          </Button>
        )}
      </DialogTrigger>

      <DialogContent
        title="New note from template"
        description="Tokens like {{date}}, {{time}}, {{author}} and {{title}} are filled in automatically."
        className="max-w-2xl"
      >
        <label className="block text-xs font-medium text-muted">
          Note title
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Defaults to the template name"
            className="mt-1 h-9 w-full rounded-md border border-border bg-surface px-3 text-sm text-fg placeholder:text-muted focus:border-accent focus:outline-none"
          />
        </label>

        <div className="mt-4 max-h-[50vh] space-y-4 overflow-y-auto pr-1">
          <Section label="Built-in">
            {BUILTIN_TEMPLATES.map((template) => (
              <TemplateCard
                key={template.key}
                name={template.name}
                description={template.description}
                onClick={() => pick(template.name, template.content)}
              />
            ))}
          </Section>

          {templates.length > 0 ? (
            <Section label="Your templates">
              {templates.map((template) => (
                <TemplateCard
                  key={template.id}
                  name={template.name}
                  description={`${template.category} · saved template`}
                  onClick={() => pick(template.name, template.content)}
                />
              ))}
            </Section>
          ) : null}
        </div>

        <div className="mt-4 flex justify-end">
          <DialogClose asChild>
            <Button size="sm">Cancel</Button>
          </DialogClose>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Section({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted">
        {label}
      </h3>
      <div className="grid gap-2 sm:grid-cols-2">{children}</div>
    </div>
  );
}

function TemplateCard({
  name,
  description,
  onClick,
}: {
  name: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex flex-col gap-1 rounded-lg border border-border bg-surface p-3 text-left transition",
        "hover:border-accent/50 hover:bg-elevated"
      )}
    >
      <span className="flex items-center gap-1.5 text-sm font-medium text-fg">
        <Sparkles className="h-3.5 w-3.5 text-accent" />
        {name}
      </span>
      <span className="text-xs text-muted">{description}</span>
    </button>
  );
}
