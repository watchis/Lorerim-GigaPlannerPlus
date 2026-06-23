const MIRROR_PROPERTIES = [
  "direction",
  "boxSizing",
  "width",
  "height",
  "overflowX",
  "overflowY",
  "borderTopWidth",
  "borderRightWidth",
  "borderBottomWidth",
  "borderLeftWidth",
  "paddingTop",
  "paddingRight",
  "paddingBottom",
  "paddingLeft",
  "fontStyle",
  "fontVariant",
  "fontWeight",
  "fontStretch",
  "fontSize",
  "lineHeight",
  "fontFamily",
  "textAlign",
  "textTransform",
  "textIndent",
  "textDecoration",
  "letterSpacing",
  "wordSpacing",
  "tabSize",
] as const;

export function getTextareaCaretOffset(textarea: HTMLTextAreaElement, position: number) {
  const mirror = document.createElement("div");
  const style = mirror.style;
  const computed = getComputedStyle(textarea);

  mirror.setAttribute("aria-hidden", "true");
  style.position = "absolute";
  style.visibility = "hidden";
  style.whiteSpace = "pre-wrap";
  style.overflowWrap = "break-word";
  style.wordBreak = "normal";
  style.overflow = "hidden";

  for (const property of MIRROR_PROPERTIES) {
    style[property] = computed[property];
  }

  style.width = `${textarea.clientWidth}px`;

  const before = textarea.value.slice(0, position);
  const after = textarea.value.slice(position) || ".";

  mirror.textContent = before;
  const marker = document.createElement("span");
  marker.textContent = after[0] ?? ".";
  mirror.appendChild(marker);

  document.body.appendChild(mirror);

  const top = marker.offsetTop - textarea.scrollTop;
  const left = marker.offsetLeft - textarea.scrollLeft;

  document.body.removeChild(mirror);

  return { top, left };
}
