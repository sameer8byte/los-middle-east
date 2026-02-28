import React from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import { cn } from '../../../../lib/utils';
import { getBorderRadius } from '../../../../lib/theme';
import {
  FaBold,
  FaItalic,
  FaUnderline,
  FaStrikethrough,
  FaListUl,
  FaListOl,
  FaQuoteLeft,
  FaCode,
  FaAlignLeft,
  FaAlignCenter,
  FaAlignRight,
  FaAlignJustify,
  FaLink,
  FaImage,
  FaUndo,
  FaRedo,
} from 'react-icons/fa';
import './BlogEditor.css';

interface BlogEditorProps {
  content?: string;
  onChange?: (html: string) => void;
  placeholder?: string;
  editable?: boolean;
  className?: string;
}

const MenuButton: React.FC<{
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
  title?: string;
}> = ({ onClick, active, disabled, children, title }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    title={title}
    className={cn(
      'p-2 hover:bg-[var(--secondary-bg)] transition-colors duration-200 disabled:opacity-30 disabled:cursor-not-allowed',
      active && 'bg-[var(--secondary-bg)] text-[var(--primary)]'
    )}
    style={{ borderRadius: getBorderRadius('sm') }}
  >
    {children}
  </button>
);

export const BlogEditor: React.FC<BlogEditorProps> = ({
  content = '',
  onChange,
  placeholder = 'Start writing your blog post...',
  editable = true,
  className,
}) => {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3, 4],
        },
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-[var(--primary)] underline cursor-pointer hover:text-[var(--primary-hover)]',
        },
      }),
      Image.configure({
        HTMLAttributes: {
          class: 'max-w-full h-auto rounded',
        },
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Placeholder.configure({
        placeholder,
      }),
    ],
    content,
    editable,
    onUpdate: ({ editor }) => {
      if (onChange) {
        onChange(editor.getHTML());
      }
    },
    editorProps: {
      attributes: {
        class: cn(
          'prose prose-sm max-w-none focus:outline-none min-h-[300px] p-4',
          'text-[var(--foreground)]',
          '[&_h1]:text-[var(--foreground)] [&_h1]:font-bold [&_h1]:text-3xl [&_h1]:mt-6 [&_h1]:mb-4',
          '[&_h2]:text-[var(--foreground)] [&_h2]:font-bold [&_h2]:text-2xl [&_h2]:mt-5 [&_h2]:mb-3',
          '[&_h3]:text-[var(--foreground)] [&_h3]:font-bold [&_h3]:text-xl [&_h3]:mt-4 [&_h3]:mb-2',
          '[&_h4]:text-[var(--foreground)] [&_h4]:font-bold [&_h4]:text-lg [&_h4]:mt-3 [&_h4]:mb-2',
          '[&_p]:text-[var(--foreground)] [&_p]:my-2 [&_p]:leading-relaxed',
          '[&_strong]:font-bold [&_strong]:text-[var(--foreground)]',
          '[&_em]:italic',
          '[&_ul]:list-disc [&_ul]:ml-6 [&_ul]:my-2',
          '[&_ol]:list-decimal [&_ol]:ml-6 [&_ol]:my-2',
          '[&_li]:text-[var(--foreground)] [&_li]:my-1',
          '[&_blockquote]:border-l-4 [&_blockquote]:border-[var(--primary)] [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:my-4',
          '[&_code]:bg-[var(--secondary-bg)] [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-sm [&_code]:font-mono',
          '[&_pre]:bg-[var(--secondary-bg)] [&_pre]:p-4 [&_pre]:rounded [&_pre]:overflow-x-auto [&_pre]:my-4',
          '[&_pre_code]:bg-transparent [&_pre_code]:p-0',
          '[&_a]:text-[var(--primary)] [&_a]:underline [&_a]:cursor-pointer',
          '[&_img]:rounded [&_img]:my-4'
        ),
      },
    },
  });

  const addLink = React.useCallback(() => {
    if (!editor) return;

    const url = globalThis.prompt('Enter the URL:');
    if (url) {
      editor
        .chain()
        .focus()
        .extendMarkRange('link')
        .setLink({ href: url })
        .run();
    }
  }, [editor]);

  const addImage = React.useCallback(() => {
    if (!editor) return;

    const url = globalThis.prompt('Enter the image URL:');
    if (url) {
      editor.chain().focus().setImage({ src: url }).run();
    }
  }, [editor]);

  if (!editor) {
    return null;
  }

  return (
    <div className={cn('w-full', className)}>
      {editable && (
        <div
          className="border border-[var(--border)] border-b-0 p-2 flex flex-wrap gap-1 bg-[var(--background)] sticky top-0 z-10"
          style={{ borderRadius: `${getBorderRadius('md')} ${getBorderRadius('md')} 0 0` }}
        >
          {/* Text Formatting */}
          <div className="flex gap-1 border-r border-[var(--border)] pr-2">
            <MenuButton
              onClick={() => editor.chain().focus().toggleBold().run()}
              active={editor.isActive('bold')}
              title="Bold (Ctrl+B)"
            >
              <FaBold className="w-4 h-4" />
            </MenuButton>
            <MenuButton
              onClick={() => editor.chain().focus().toggleItalic().run()}
              active={editor.isActive('italic')}
              title="Italic (Ctrl+I)"
            >
              <FaItalic className="w-4 h-4" />
            </MenuButton>
            <MenuButton
              onClick={() => editor.chain().focus().toggleUnderline().run()}
              active={editor.isActive('underline')}
              title="Underline (Ctrl+U)"
            >
              <FaUnderline className="w-4 h-4" />
            </MenuButton>
            <MenuButton
              onClick={() => editor.chain().focus().toggleStrike().run()}
              active={editor.isActive('strike')}
              title="Strikethrough"
            >
              <FaStrikethrough className="w-4 h-4" />
            </MenuButton>
          </div>

          {/* Headings */}
          <div className="flex gap-1 border-r border-[var(--border)] pr-2">
            <MenuButton
              onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
              active={editor.isActive('heading', { level: 1 })}
              title="Heading 1"
            >
              <span className="text-sm font-bold">H1</span>
            </MenuButton>
            <MenuButton
              onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
              active={editor.isActive('heading', { level: 2 })}
              title="Heading 2"
            >
              <span className="text-sm font-bold">H2</span>
            </MenuButton>
            <MenuButton
              onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
              active={editor.isActive('heading', { level: 3 })}
              title="Heading 3"
            >
              <span className="text-sm font-bold">H3</span>
            </MenuButton>
            <MenuButton
              onClick={() => editor.chain().focus().toggleHeading({ level: 4 }).run()}
              active={editor.isActive('heading', { level: 4 })}
              title="Heading 4"
            >
              <span className="text-sm font-bold">H4</span>
            </MenuButton>
          </div>

          {/* Lists */}
          <div className="flex gap-1 border-r border-[var(--border)] pr-2">
            <MenuButton
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              active={editor.isActive('bulletList')}
              title="Bullet List"
            >
              <FaListUl className="w-4 h-4" />
            </MenuButton>
            <MenuButton
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
              active={editor.isActive('orderedList')}
              title="Numbered List"
            >
              <FaListOl className="w-4 h-4" />
            </MenuButton>
          </div>

          {/* Alignment */}
          <div className="flex gap-1 border-r border-[var(--border)] pr-2">
            <MenuButton
              onClick={() => editor.chain().focus().setTextAlign('left').run()}
              active={editor.isActive({ textAlign: 'left' })}
              title="Align Left"
            >
              <FaAlignLeft className="w-4 h-4" />
            </MenuButton>
            <MenuButton
              onClick={() => editor.chain().focus().setTextAlign('center').run()}
              active={editor.isActive({ textAlign: 'center' })}
              title="Align Center"
            >
              <FaAlignCenter className="w-4 h-4" />
            </MenuButton>
            <MenuButton
              onClick={() => editor.chain().focus().setTextAlign('right').run()}
              active={editor.isActive({ textAlign: 'right' })}
              title="Align Right"
            >
              <FaAlignRight className="w-4 h-4" />
            </MenuButton>
            <MenuButton
              onClick={() => editor.chain().focus().setTextAlign('justify').run()}
              active={editor.isActive({ textAlign: 'justify' })}
              title="Justify"
            >
              <FaAlignJustify className="w-4 h-4" />
            </MenuButton>
          </div>

          {/* Other Formats */}
          <div className="flex gap-1 border-r border-[var(--border)] pr-2">
            <MenuButton
              onClick={() => editor.chain().focus().toggleBlockquote().run()}
              active={editor.isActive('blockquote')}
              title="Quote"
            >
              <FaQuoteLeft className="w-4 h-4" />
            </MenuButton>
            <MenuButton
              onClick={() => editor.chain().focus().toggleCodeBlock().run()}
              active={editor.isActive('codeBlock')}
              title="Code Block"
            >
              <FaCode className="w-4 h-4" />
            </MenuButton>
          </div>

          {/* Link & Image */}
          <div className="flex gap-1 border-r border-[var(--border)] pr-2">
            <MenuButton
              onClick={addLink}
              active={editor.isActive('link')}
              title="Add Link"
            >
              <FaLink className="w-4 h-4" />
            </MenuButton>
            <MenuButton onClick={addImage} title="Add Image">
              <FaImage className="w-4 h-4" />
            </MenuButton>
          </div>

          {/* Undo/Redo */}
          <div className="flex gap-1">
            <MenuButton
              onClick={() => editor.chain().focus().undo().run()}
              disabled={!editor.can().undo()}
              title="Undo (Ctrl+Z)"
            >
              <FaUndo className="w-4 h-4" />
            </MenuButton>
            <MenuButton
              onClick={() => editor.chain().focus().redo().run()}
              disabled={!editor.can().redo()}
              title="Redo (Ctrl+Y)"
            >
              <FaRedo className="w-4 h-4" />
            </MenuButton>
          </div>
        </div>
      )}

      <div
        className={cn(
          'border border-[var(--border)] bg-[var(--background)]',
          editable ? 'border-t-0' : ''
        )}
        style={{
          borderRadius: editable
            ? `0 0 ${getBorderRadius('md')} ${getBorderRadius('md')}`
            : getBorderRadius('md'),
        }}
      >
        <EditorContent editor={editor} />
      </div>
    </div>
  );
};

export default BlogEditor;

