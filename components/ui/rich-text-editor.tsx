"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import { cn } from "@/lib/utils";
import {
    IconBold,
    IconItalic,
    IconUnderline,
    IconList,
    IconListNumbers,
} from "@tabler/icons-react";
import { useEffect } from "react";

interface RichTextEditorProps {
    value: string;
    onChange: (html: string) => void;
    placeholder?: string;
    className?: string;
}

function ToolbarButton({
    active,
    onClick,
    children,
}: {
    active?: boolean;
    onClick: () => void;
    children: React.ReactNode;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={cn(
                "p-1.5 rounded-md transition-colors",
                active
                    ? "bg-secondary text-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
            )}
        >
            {children}
        </button>
    );
}

export function RichTextEditor({ value, onChange, placeholder, className }: RichTextEditorProps) {
    const editor = useEditor({
        immediatelyRender: false,
        extensions: [
            StarterKit.configure({
                heading: false,
                codeBlock: false,
                code: false,
                blockquote: false,
                horizontalRule: false,
            }),
            Underline,
            Placeholder.configure({ placeholder: placeholder || "Write something..." }),
        ],
        content: value,
        onUpdate: ({ editor: e }) => {
            onChange(e.getHTML());
        },
        editorProps: {
            attributes: {
                class: "prose prose-sm max-w-none focus:outline-none min-h-[180px] px-3 py-2 text-sm",
            },
        },
    });

    // Sync external value changes (e.g. when modal opens with defaults)
    useEffect(() => {
        if (editor && value !== editor.getHTML()) {
            editor.commands.setContent(value);
        }
        // Only sync on value change, not editor change
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [value]);

    if (!editor) return null;

    return (
        <div className={cn("rounded-xl border border-input bg-background overflow-hidden focus-within:ring-2 focus-within:ring-ring", className)}>
            {/* Toolbar */}
            <div className="flex items-center gap-0.5 px-2 py-1.5 border-b border-border/50">
                <ToolbarButton
                    active={editor.isActive("bold")}
                    onClick={() => editor.chain().focus().toggleBold().run()}
                >
                    <IconBold className="w-4 h-4" />
                </ToolbarButton>
                <ToolbarButton
                    active={editor.isActive("italic")}
                    onClick={() => editor.chain().focus().toggleItalic().run()}
                >
                    <IconItalic className="w-4 h-4" />
                </ToolbarButton>
                <ToolbarButton
                    active={editor.isActive("underline")}
                    onClick={() => editor.chain().focus().toggleUnderline().run()}
                >
                    <IconUnderline className="w-4 h-4" />
                </ToolbarButton>
                <div className="w-px h-4 bg-border/50 mx-1" />
                <ToolbarButton
                    active={editor.isActive("bulletList")}
                    onClick={() => editor.chain().focus().toggleBulletList().run()}
                >
                    <IconList className="w-4 h-4" />
                </ToolbarButton>
                <ToolbarButton
                    active={editor.isActive("orderedList")}
                    onClick={() => editor.chain().focus().toggleOrderedList().run()}
                >
                    <IconListNumbers className="w-4 h-4" />
                </ToolbarButton>
            </div>

            {/* Editor */}
            <EditorContent editor={editor} />
        </div>
    );
}
