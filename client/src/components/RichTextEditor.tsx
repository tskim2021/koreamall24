import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import TextAlign from '@tiptap/extension-text-align';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Link as LinkIcon,
  Image as ImageIcon,
  Undo,
  Redo,
  Heading1,
  Heading2,
  Heading3,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Upload,
} from 'lucide-react';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  folder?: string;
}

// ─── Image resize overlay ────────────────────────────────────────────────────
interface ResizeState {
  img: HTMLImageElement;
  x: number;
  y: number;
  w: number;
  h: number;
  dir: string;
}

function useImageResize(editorWrapperRef: React.RefObject<HTMLDivElement | null>, onContentChange: () => void) {
  const [selectedImg, setSelectedImg] = useState<HTMLImageElement | null>(null);
  const resizeRef = useRef<ResizeState | null>(null);

  // Click on image → select it
  useEffect(() => {
    const wrapper = editorWrapperRef.current;
    if (!wrapper) return;

    const onClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'IMG') {
        e.preventDefault();
        setSelectedImg(target as HTMLImageElement);
      } else {
        // Deselect if clicking outside image
        if (!(target as HTMLElement).closest?.('.img-resize-handle')) {
          setSelectedImg(null);
        }
      }
    };

    wrapper.addEventListener('click', onClick);
    return () => wrapper.removeEventListener('click', onClick);
  }, [editorWrapperRef]);

  // Mouse down on a resize handle
  const startResize = useCallback(
    (e: React.MouseEvent, dir: string) => {
      e.preventDefault();
      e.stopPropagation();
      if (!selectedImg) return;

      resizeRef.current = {
        img: selectedImg,
        x: e.clientX,
        y: e.clientY,
        w: selectedImg.offsetWidth,
        h: selectedImg.offsetHeight,
        dir,
      };

      const onMove = (me: MouseEvent) => {
        const r = resizeRef.current;
        if (!r) return;
        const dx = me.clientX - r.x;
        const dy = me.clientY - r.y;
        const ratio = r.w / r.h;

        let nw = r.w;
        let nh = r.h;

        if (r.dir.includes('e')) nw = Math.max(60, r.w + dx);
        if (r.dir.includes('w')) nw = Math.max(60, r.w - dx);
        if (r.dir.includes('s')) nh = Math.max(40, r.h + dy);
        if (r.dir.includes('n')) nh = Math.max(40, r.h - dy);

        // Maintain aspect ratio for corner handles
        if ((r.dir === 'se' || r.dir === 'sw' || r.dir === 'ne' || r.dir === 'nw')) {
          nh = Math.round(nw / ratio);
        }

        r.img.style.width = `${Math.round(nw)}px`;
        r.img.style.height = `${Math.round(nh)}px`;
        // Force re-render of handles by toggling to null then back to the same DOM element
        // IMPORTANT: Do NOT spread-copy (e.g. {...r.img}) - that creates a plain object without getBoundingClientRect
        setSelectedImg(null);
        requestAnimationFrame(() => setSelectedImg(r.img));
      };

      const onUp = () => {
        if (resizeRef.current) {
          // Persist size into the editor HTML
          onContentChange();
        }
        resizeRef.current = null;
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
      };

      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    },
    [selectedImg, onContentChange]
  );

  return { selectedImg, startResize };
}

// ─── Resize handles overlay ──────────────────────────────────────────────────
function ResizeHandles({
  img,
  wrapperRef,
  startResize,
}: {
  img: HTMLImageElement;
  wrapperRef: React.RefObject<HTMLDivElement | null>;
  startResize: (e: React.MouseEvent, dir: string) => void;
}) {
  const [rect, setRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    const update = () => {
      if (!wrapperRef.current) return;
      // img가 실제 DOM HTMLElement이고 getBoundingClientRect를 지원하는지 확인
      if (!img || !(img instanceof Element) || typeof img.getBoundingClientRect !== 'function') return;
      // img가 실제 DOM에 마운트되어 있는지 확인
      if (!document.contains(img)) return;
      const wRect = wrapperRef.current.getBoundingClientRect();
      const iRect = img.getBoundingClientRect();
      setRect({
        top: iRect.top - wRect.top + (wrapperRef.current.scrollTop || 0),
        left: iRect.left - wRect.left + (wrapperRef.current.scrollLeft || 0),
        width: iRect.width,
        height: iRect.height,
        right: 0, bottom: 0, x: 0, y: 0,
        toJSON: () => {},
      } as DOMRect);
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [img, wrapperRef]);

  if (!rect) return null;

  const hs: React.CSSProperties = {
    position: 'absolute',
    width: 10,
    height: 10,
    background: '#3b82f6',
    border: '2px solid white',
    borderRadius: 2,
    zIndex: 50,
    boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
  };

  const handles = [
    { dir: 'n',  top: rect.top - 5,                    left: rect.left + rect.width / 2 - 5, cursor: 'ns-resize' },
    { dir: 's',  top: rect.top + rect.height - 5,       left: rect.left + rect.width / 2 - 5, cursor: 'ns-resize' },
    { dir: 'e',  top: rect.top + rect.height / 2 - 5,  left: rect.left + rect.width - 5,     cursor: 'ew-resize' },
    { dir: 'w',  top: rect.top + rect.height / 2 - 5,  left: rect.left - 5,                  cursor: 'ew-resize' },
    { dir: 'se', top: rect.top + rect.height - 5,       left: rect.left + rect.width - 5,     cursor: 'nwse-resize' },
    { dir: 'sw', top: rect.top + rect.height - 5,       left: rect.left - 5,                  cursor: 'nesw-resize' },
    { dir: 'ne', top: rect.top - 5,                    left: rect.left + rect.width - 5,     cursor: 'nesw-resize' },
    { dir: 'nw', top: rect.top - 5,                    left: rect.left - 5,                  cursor: 'nwse-resize' },
  ];

  return (
    <>
      {/* Selection border */}
      <div
        style={{
          position: 'absolute',
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height,
          border: '2px solid #3b82f6',
          pointerEvents: 'none',
          zIndex: 49,
          borderRadius: 4,
        }}
      />
      {/* Size label */}
      <div
        style={{
          position: 'absolute',
          top: rect.top + rect.height + 4,
          left: rect.left,
          background: 'rgba(59,130,246,0.9)',
          color: '#fff',
          fontSize: 11,
          padding: '1px 6px',
          borderRadius: 3,
          pointerEvents: 'none',
          zIndex: 50,
          whiteSpace: 'nowrap',
        }}
      >
        {Math.round(rect.width)} × {Math.round(rect.height)} px
      </div>
      {/* Handles */}
      {handles.map(({ dir, top, left, cursor }) => (
        <span
          key={dir}
          className="img-resize-handle"
          onMouseDown={(e) => startResize(e, dir)}
          style={{ ...hs, top, left, cursor }}
        />
      ))}
    </>
  );
}

// ─── Main Editor Component ───────────────────────────────────────────────────
export function RichTextEditor({ value, onChange, placeholder, folder = 'announcements' }: RichTextEditorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [uploading, setUploading] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Image.configure({
        inline: true,
        allowBase64: false,
        HTMLAttributes: {
          class: 'max-w-full rounded-lg my-2',
        },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { class: 'text-blue-500 underline' },
      }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      TextStyle,
      Color,
    ],
    content: value,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none min-h-[250px] p-4 focus:outline-none',
      },
      handlePaste: (view, event) => {
        const items = event.clipboardData?.items;
        if (!items) return false;
        for (const item of Array.from(items)) {
          if (item.type.indexOf('image') === 0) {
            event.preventDefault();
            const file = item.getAsFile();
            if (file) uploadImageFile(file);
            return true;
          }
        }
        return false;
      },
      handleDrop: (view, event) => {
        const files = event.dataTransfer?.files;
        if (!files || files.length === 0) return false;
        const file = files[0];
        if (file.type.startsWith('image/')) {
          event.preventDefault();
          uploadImageFile(file);
          return true;
        }
        return false;
      },
    },
  });

  // Sync external value changes
  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value || '');
    }
  }, [value, editor]);

  // Callback to flush DOM size changes back into editor HTML
  const flushImageSizes = useCallback(() => {
    if (!editor || !wrapperRef.current) return;
    const imgs = wrapperRef.current.querySelectorAll<HTMLImageElement>('.ProseMirror img');
    imgs.forEach((img) => {
      if (img.style.width || img.style.height) {
        img.setAttribute('width', img.style.width.replace('px', '') || '');
        img.setAttribute('height', img.style.height.replace('px', '') || '');
      }
    });
    // Re-read the current DOM HTML and push it to the editor state
    const html = editor.view.dom.innerHTML;
    onChange(html);
  }, [editor, onChange]);

  const { selectedImg, startResize } = useImageResize(wrapperRef, flushImageSizes);

  const uploadImageFile = useCallback(async (file: File) => {
    if (!editor) return;
    if (!file.type.startsWith('image/')) {
      alert('画像ファイルのみアップロードできます。');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert('ファイルサイズは5MB以下にしてください。');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', folder);

      const response = await fetch('/api/upload', { method: 'POST', body: formData });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Upload failed');
      }
      const { url } = await response.json();
      editor.chain().focus().setImage({ src: url }).run();
    } catch (error: any) {
      console.error('Image upload failed:', error);
      alert(`画像のアップロードに失敗しました: ${error.message}`);
    } finally {
      setUploading(false);
    }
  }, [editor, folder]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadImageFile(file);
    e.target.value = '';
  }, [uploadImageFile]);

  const addImageByUrl = useCallback(() => {
    const url = window.prompt('画像URLを入力してください:');
    if (url && editor) editor.chain().focus().setImage({ src: url }).run();
  }, [editor]);

  const addLink = useCallback(() => {
    const url = window.prompt('リンクURLを入力してください:');
    if (url && editor) editor.chain().focus().setLink({ href: url }).run();
  }, [editor]);

  if (!editor) return null;

  return (
    <div className="border border-border rounded-lg overflow-hidden bg-white">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-0.5 p-2 border-b bg-gray-50">
        <Button type="button" variant="ghost" size="sm"
          onClick={() => (editor.chain().focus() as any).toggleBold().run()}
          className={`h-8 w-8 p-0 ${editor.isActive('bold') ? 'bg-gray-200' : ''}`}
          title="太字">
          <Bold className="h-3.5 w-3.5" />
        </Button>
        <Button type="button" variant="ghost" size="sm"
          onClick={() => (editor.chain().focus() as any).toggleItalic().run()}
          className={`h-8 w-8 p-0 ${editor.isActive('italic') ? 'bg-gray-200' : ''}`}
          title="斜体">
          <Italic className="h-3.5 w-3.5" />
        </Button>

        <div className="w-px h-5 bg-gray-300 mx-1" />

        <Button type="button" variant="ghost" size="sm"
          onClick={() => (editor.chain().focus() as any).toggleHeading({ level: 1 }).run()}
          className={`h-8 w-8 p-0 ${editor.isActive('heading', { level: 1 }) ? 'bg-gray-200' : ''}`}
          title="見出し1">
          <Heading1 className="h-3.5 w-3.5" />
        </Button>
        <Button type="button" variant="ghost" size="sm"
          onClick={() => (editor.chain().focus() as any).toggleHeading({ level: 2 }).run()}
          className={`h-8 w-8 p-0 ${editor.isActive('heading', { level: 2 }) ? 'bg-gray-200' : ''}`}
          title="見出し2">
          <Heading2 className="h-3.5 w-3.5" />
        </Button>
        <Button type="button" variant="ghost" size="sm"
          onClick={() => (editor.chain().focus() as any).toggleHeading({ level: 3 }).run()}
          className={`h-8 w-8 p-0 ${editor.isActive('heading', { level: 3 }) ? 'bg-gray-200' : ''}`}
          title="見出し3">
          <Heading3 className="h-3.5 w-3.5" />
        </Button>

        <div className="w-px h-5 bg-gray-300 mx-1" />

        <Button type="button" variant="ghost" size="sm"
          onClick={() => (editor.chain().focus() as any).toggleBulletList().run()}
          className={`h-8 w-8 p-0 ${editor.isActive('bulletList') ? 'bg-gray-200' : ''}`}
          title="箇条書き">
          <List className="h-3.5 w-3.5" />
        </Button>
        <Button type="button" variant="ghost" size="sm"
          onClick={() => (editor.chain().focus() as any).toggleOrderedList().run()}
          className={`h-8 w-8 p-0 ${editor.isActive('orderedList') ? 'bg-gray-200' : ''}`}
          title="番号リスト">
          <ListOrdered className="h-3.5 w-3.5" />
        </Button>

        <div className="w-px h-5 bg-gray-300 mx-1" />

        <Button type="button" variant="ghost" size="sm"
          onClick={() => editor.chain().focus().setTextAlign('left').run()}
          className={`h-8 w-8 p-0 ${editor.isActive({ textAlign: 'left' }) ? 'bg-gray-200' : ''}`}
          title="左揃え">
          <AlignLeft className="h-3.5 w-3.5" />
        </Button>
        <Button type="button" variant="ghost" size="sm"
          onClick={() => editor.chain().focus().setTextAlign('center').run()}
          className={`h-8 w-8 p-0 ${editor.isActive({ textAlign: 'center' }) ? 'bg-gray-200' : ''}`}
          title="中央揃え">
          <AlignCenter className="h-3.5 w-3.5" />
        </Button>
        <Button type="button" variant="ghost" size="sm"
          onClick={() => editor.chain().focus().setTextAlign('right').run()}
          className={`h-8 w-8 p-0 ${editor.isActive({ textAlign: 'right' }) ? 'bg-gray-200' : ''}`}
          title="右揃え">
          <AlignRight className="h-3.5 w-3.5" />
        </Button>

        <div className="w-px h-5 bg-gray-300 mx-1" />

        <Button type="button" variant="ghost" size="sm"
          onClick={addLink}
          className="h-8 w-8 p-0"
          title="リンク挿入">
          <LinkIcon className="h-3.5 w-3.5" />
        </Button>

        <Button type="button" variant="ghost" size="sm"
          onClick={() => fileInputRef.current?.click()}
          className="h-8 px-2 gap-1 text-xs"
          disabled={uploading}
          title="画像をアップロード">
          {uploading ? (
            <span className="flex items-center gap-1">
              <div className="w-3 h-3 border border-gray-400 border-t-transparent rounded-full animate-spin" />
              アップロード中...
            </span>
          ) : (
            <>
              <Upload className="h-3.5 w-3.5" />
              画像
            </>
          )}
        </Button>
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />

        <Button type="button" variant="ghost" size="sm"
          onClick={addImageByUrl}
          className="h-8 w-8 p-0"
          title="画像URLで挿入">
          <ImageIcon className="h-3.5 w-3.5" />
        </Button>

        <div className="w-px h-5 bg-gray-300 mx-1" />

        <Button type="button" variant="ghost" size="sm"
          onClick={() => (editor.commands as any).undo()}
          disabled={!(editor.can() as any).undo()}
          className="h-8 w-8 p-0"
          title="元に戻す">
          <Undo className="h-3.5 w-3.5" />
        </Button>
        <Button type="button" variant="ghost" size="sm"
          onClick={() => (editor.commands as any).redo()}
          disabled={!(editor.can() as any).redo()}
          className="h-8 w-8 p-0"
          title="やり直す">
          <Redo className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Editor Content with resize overlay */}
      <div ref={wrapperRef} className="relative min-h-[250px]">
        <EditorContent editor={editor} />
        {placeholder && editor.isEmpty && (
          <div className="absolute top-4 left-4 text-gray-400 pointer-events-none text-sm">
            {placeholder}
          </div>
        )}
        {/* Resize handles overlay */}
        {selectedImg && (
          <ResizeHandles img={selectedImg} wrapperRef={wrapperRef} startResize={startResize} />
        )}
      </div>

      <div className="px-4 py-2 border-t bg-gray-50 text-xs text-gray-400">
        画像をクリックするとリサイズハンドルが表示されます。ドラッグして画像サイズを変更できます。
      </div>
    </div>
  );
}
