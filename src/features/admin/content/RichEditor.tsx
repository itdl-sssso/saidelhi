"use client";

import Image from "@tiptap/extension-image";
import { EditorContent, Node, mergeAttributes, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useTranslations } from "next-intl";
import { useEffect, useId, useRef, type ReactNode } from "react";
import { Icon } from "@/ui/Icon";
import { cx } from "@/ui/cx";
import { Bold, ChartColumn, ImagePlus, Italic, Link as LinkIcon, ListOrdered } from "../icons";
import c from "./Content.module.css";

/** `<div data-event-results="<eventId>"></div>`: the public page renders the event's approved results here (CONTRACT §6). */
const ResultsCard = Node.create({
  name: "eventResults",
  group: "block",
  atom: true,
  draggable: true,
  addAttributes: () => ({ eventId: { default: null, parseHTML: (el) => el.getAttribute("data-event-results"), renderHTML: (a) => ({ "data-event-results": a.eventId ?? "" }) } }),
  parseHTML: () => [{ tag: "div[data-event-results]" }],
  renderHTML: ({ HTMLAttributes }) => ["div", mergeAttributes(HTMLAttributes)],
});

/** Image attributes the server sanitiser keeps: src (must be /media/…), alt. */
const SafeImage = Image.configure({ inline: false });

export interface RichEditorApi {
  insertResults: () => void;
}

export function RichEditor({
  value,
  lang,
  label,
  eventId,
  onChange,
  onUpload,
  imageBusy,
  extra,
}: {
  value: string;
  lang: "en" | "hi";
  label: string;
  eventId: string | null;
  onChange: (html: string) => void;
  /** Uploads to the media library, resolves to the public url or null. */
  onUpload: (file: File, alt: string) => Promise<string | null>;
  imageBusy?: boolean;
  extra?: ReactNode;
}) {
  const t = useTranslations("admin.content");
  const last = useRef(value);
  const fileId = useId();
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [StarterKit.configure({ heading: { levels: [2, 3] }, link: { openOnClick: false, autolink: true } }), SafeImage, ResultsCard],
    content: value,
    editorProps: { attributes: { class: c.prose, "aria-label": label, "aria-multiline": "true", role: "textbox", ...(lang === "hi" ? { lang: "hi" } : {}) } },
    onUpdate: ({ editor: e }) => {
      last.current = e.getHTML();
      onChange(last.current);
    },
  });
  // External changes (language tab switch, image inserted by the page): replace content without echoing.
  useEffect(() => {
    if (editor && value !== last.current) {
      last.current = value;
      editor.commands.setContent(value, { emitUpdate: false });
    }
  }, [value, editor]);
  useEffect(() => {
    editor?.setOptions({ editorProps: { attributes: { class: c.prose, "aria-label": label, "aria-multiline": "true", role: "textbox", ...(lang === "hi" ? { lang: "hi" } : {}) } } });
  }, [editor, label, lang]);

  if (!editor) return <div className={c.editorSkel} aria-busy="true" />;
  const btn = (name: string, active: boolean, on: () => void, icon: ReactNode, disabled?: boolean) => (
    <button type="button" className={cx(c.tb, active && c.tbOn)} aria-pressed={active} aria-label={name} title={name} disabled={disabled} onClick={on}>
      {icon}
    </button>
  );
  const pickFile = () => document.getElementById(fileId)?.click();
  const link = () => {
    const prev = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt(t("linkPrompt"), prev ?? "https://");
    if (url === null) return;
    if (url === "") editor.chain().focus().unsetLink().run();
    else editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  };
  return (
    <div className={c.editor} style={{ ["--results-label" as string]: JSON.stringify(t("resultsCardLabel")) }}>
      <div className={c.toolbar} role="toolbar" aria-label={t("toolbar")}>
        {btn(t("tbH2"), editor.isActive("heading", { level: 2 }), () => editor.chain().focus().toggleHeading({ level: 2 }).run(), <b>H2</b>)}
        {btn(t("tbBold"), editor.isActive("bold"), () => editor.chain().focus().toggleBold().run(), <Icon icon={Bold} size={16} />)}
        {btn(t("tbItalic"), editor.isActive("italic"), () => editor.chain().focus().toggleItalic().run(), <Icon icon={Italic} size={16} />)}
        {btn(t("tbList"), editor.isActive("bulletList"), () => editor.chain().focus().toggleBulletList().run(), <Icon name="list" size={16} />)}
        {btn(t("tbOrdered"), editor.isActive("orderedList"), () => editor.chain().focus().toggleOrderedList().run(), <Icon icon={ListOrdered} size={16} />)}
        {btn(t("tbQuote"), editor.isActive("blockquote"), () => editor.chain().focus().toggleBlockquote().run(), <Icon name="quote" size={16} />)}
        {btn(t("tbLink"), editor.isActive("link"), link, <Icon icon={LinkIcon} size={16} />)}
        {btn(t("tbImage"), false, pickFile, <Icon icon={ImagePlus} size={16} />, imageBusy)}
        {btn(t("tbResults"), false, () => eventId && editor.chain().focus().insertContent({ type: "eventResults", attrs: { eventId } }).run(), <Icon icon={ChartColumn} size={16} />, !eventId)}
        {extra}
      </div>
      <input
        id={fileId}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        hidden
        tabIndex={-1}
        onChange={async (e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (!file) return;
          const alt = window.prompt(t("imageAlt"), "");
          if (!alt?.trim()) return;
          const url = await onUpload(file, alt.trim());
          if (url) editor.chain().focus().setImage({ src: url, alt: alt.trim() }).run();
        }}
      />
      <EditorContent editor={editor} />
    </div>
  );
}
