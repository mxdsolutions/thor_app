"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import { cn } from "@/lib/utils";
import {
    IconBold,
    IconItalic,
    IconUnderline,
    IconList,
    IconListNumbers,
    IconLink,
    IconPhoto,
} from "@tabler/icons-react";
import { useEffect, useRef } from "react";

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
    title,
}: {
    active?: boolean;
    onClick: () => void;
    children: React.ReactNode;
    title?: string;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            title={title}
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
    const fileInputRef = useRef<HTMLInputElement>(null);

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
            Image.configure({
                inline: true,
                allowBase64: true,
                HTMLAttributes: {
                    style: "max-width: 100%; height: auto;",
                },
            }),
            Link.configure({
                openOnClick: false,
                HTMLAttributes: {
                    class: "text-blue-600 underline cursor-pointer",
                },
            }),
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

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !editor) return;

        const reader = new FileReader();
        reader.onload = () => {
            const base64 = reader.result as string;
            editor.chain().focus().setImage({ src: base64 }).run();
        };
        reader.readAsDataURL(file);
        e.target.value = "";
    };

    const handleLink = () => {
        if (!editor) return;

        if (editor.isActive("link")) {
            editor.chain().focus().unsetLink().run();
            return;
        }

        const url = window.prompt("Enter URL:");
        if (url) {
            editor.chain().focus().setLink({ href: url }).run();
        }
    };

    if (!editor) return null;

    return (
        <div className={cn("rounded-xl border border-input bg-background overflow-hidden focus-within:ring-2 focus-within:ring-ring", className)}>
            {/* Toolbar */}
            <div className="flex items-center gap-0.5 px-2 py-1.5 border-b border-border/50">
                <ToolbarButton
                    active={editor.isActive("bold")}
                    onClick={() => editor.chain().focus().toggleBold().run()}
                    title="Bold"
                >
                    <IconBold className="w-4 h-4" />
                </ToolbarButton>
                <ToolbarButton
                    active={editor.isActive("italic")}
                    onClick={() => editor.chain().focus().toggleItalic().run()}
                    title="Italic"
                >
                    <IconItalic className="w-4 h-4" />
                </ToolbarButton>
                <ToolbarButton
                    active={editor.isActive("underline")}
                    onClick={() => editor.chain().focus().toggleUnderline().run()}
                    title="Underline"
                >
                    <IconUnderline className="w-4 h-4" />
                </ToolbarButton>
                <div className="w-px h-4 bg-border/50 mx-1" />
                <ToolbarButton
                    active={editor.isActive("bulletList")}
                    onClick={() => editor.chain().focus().toggleBulletList().run()}
                    title="Bullet list"
                >
                    <IconList className="w-4 h-4" />
                </ToolbarButton>
                <ToolbarButton
                    active={editor.isActive("orderedList")}
                    onClick={() => editor.chain().focus().toggleOrderedList().run()}
                    title="Numbered list"
                >
                    <IconListNumbers className="w-4 h-4" />
                </ToolbarButton>
                <div className="w-px h-4 bg-border/50 mx-1" />
                <ToolbarButton
                    active={editor.isActive("link")}
                    onClick={handleLink}
                    title="Insert link"
                >
                    <IconLink className="w-4 h-4" />
                </ToolbarButton>
                <ToolbarButton
                    onClick={() => fileInputRef.current?.click()}
                    title="Insert image"
                >
                    <IconPhoto className="w-4 h-4" />
                </ToolbarButton>
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageUpload}
                />
            </div>

            {/* Editor */}
            <EditorContent editor={editor} />
        </div>
    );
}
