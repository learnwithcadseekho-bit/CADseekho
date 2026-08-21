import { TextStyle } from "@tiptap/extension-text-style";

// Adds a `fontSize` attribute to the existing textStyle mark rather than
// defining a new mark — set it via editor.chain().setMark("textStyle", {
// fontSize: "20px" }).run(), clear via { fontSize: null }.
export const FontSize = TextStyle.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      fontSize: {
        default: null,
        parseHTML: (element: HTMLElement) => element.style.fontSize || null,
        renderHTML: (attributes: { fontSize?: string | null }) => {
          if (!attributes.fontSize) return {};
          return { style: `font-size: ${attributes.fontSize}` };
        },
      },
    };
  },
});
