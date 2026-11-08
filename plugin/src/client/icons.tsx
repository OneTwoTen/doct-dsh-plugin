/**
 * The panel's stroke icons, drawn with `currentColor` so they follow the theme.
 *
 * Every glyph is 16×16 and stroked, which keeps the toolbar visually quiet at
 * the sizes a right sidebar uses.
 */
import { h } from './runtime.ts'

/** The glyph names the panel uses. */
export type IconName =
  | 'git'
  | 'branch'
  | 'branchPlus'
  | 'file'
  | 'fileDiff'
  | 'folder'
  | 'refresh'
  | 'back'
  | 'external'
  | 'copy'
  | 'check'
  | 'cross'
  | 'dot'
  | 'clock'
  | 'alert'
  | 'comment'
  | 'merge'
  | 'issue'
  | 'commit'
  | 'chevron'
  | 'chevronDown'
  | 'upload'
  | 'download'
  | 'sparkles'
  | 'trash'
  | 'plus'
  | 'search'
  | 'columns'
  | 'rows'
  | 'wrap'
  | 'pilcrow'
  | 'tree'
  | 'lock'
  | 'globe'
  | 'info'

/** Props one icon accepts. */
export interface IconProps {
  name: IconName
  size?: number
  weight?: number
  className?: string
}

/** One icon. */
export function Icon(props: IconProps): ReturnType<typeof h> {
  const size = props.size ?? 16
  const common: Record<string, unknown> = {
    width: size,
    height: size,
    viewBox: '0 0 16 16',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: props.weight ?? 1.4,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    'aria-hidden': 'true',
    className: props.className,
    style: { display: 'block', flex: 'none' },
  }
  const children = glyph(props.name)
  return h('svg', common, ...children)
}

/** The shapes of one glyph. */
function glyph(name: IconName): Array<ReturnType<typeof h>> {
  switch (name) {
    case 'git':
      return [
        h('circle', { key: 'a', cx: 5, cy: 4, r: 1.6 }),
        h('circle', { key: 'b', cx: 5, cy: 12, r: 1.6 }),
        h('circle', { key: 'c', cx: 11, cy: 6.5, r: 1.6 }),
        h('path', { key: 'd', d: 'M5 5.6v4.8' }),
        h('path', { key: 'e', d: 'M11 8.1c0 1.9-1.7 2.8-3.6 3.1' }),
      ]
    case 'branch':
      return [
        h('circle', { key: 'a', cx: 4.5, cy: 3.5, r: 1.5 }),
        h('circle', { key: 'b', cx: 4.5, cy: 12.5, r: 1.5 }),
        h('circle', { key: 'c', cx: 11.5, cy: 5.5, r: 1.5 }),
        h('path', { key: 'd', d: 'M4.5 5v6' }),
        h('path', { key: 'e', d: 'M11.5 7c0 2.2-1.6 3.2-3.5 3.6' }),
      ]
    case 'branchPlus':
      return [
        h('circle', { key: 'a', cx: 4.5, cy: 3.5, r: 1.5 }),
        h('circle', { key: 'b', cx: 4.5, cy: 12.5, r: 1.5 }),
        h('path', { key: 'c', d: 'M4.5 5v6' }),
        h('path', { key: 'd', d: 'M9.5 4.5h4' }),
        h('path', { key: 'e', d: 'M11.5 2.5v4' }),
      ]
    case 'file':
      return [
        h('path', { key: 'a', d: 'M9 1.8H4.8A1.3 1.3 0 0 0 3.5 3.1v9.8a1.3 1.3 0 0 0 1.3 1.3h6.4a1.3 1.3 0 0 0 1.3-1.3V5.3z' }),
        h('path', { key: 'b', d: 'M9 1.8v3.5h3.5' }),
      ]
    case 'fileDiff':
      return [
        h('path', { key: 'a', d: 'M9 1.8H4.8A1.3 1.3 0 0 0 3.5 3.1v9.8a1.3 1.3 0 0 0 1.3 1.3h6.4a1.3 1.3 0 0 0 1.3-1.3V5.3z' }),
        h('path', { key: 'b', d: 'M9 1.8v3.5h3.5' }),
        h('path', { key: 'c', d: 'M5.6 9.2h4.8' }),
        h('path', { key: 'd', d: 'M8 6.8v4.8' }),
      ]
    case 'folder':
      return [h('path', { key: 'a', d: 'M2.5 5.2a1.2 1.2 0 0 1 1.2-1.2h2.4l1.4 1.6h4.8a1.2 1.2 0 0 1 1.2 1.2v5.1a1.2 1.2 0 0 1-1.2 1.2H3.7a1.2 1.2 0 0 1-1.2-1.2z' })]
    case 'refresh':
      return [
        h('path', { key: 'a', d: 'M13.2 7.2a5.2 5.2 0 1 0 .2 2' }),
        h('path', { key: 'b', d: 'M13.4 3.2v4h-4' }),
      ]
    case 'back':
      return [h('path', { key: 'a', d: 'M9.5 3.5 5 8l4.5 4.5' })]
    case 'external':
      return [
        h('path', { key: 'a', d: 'M9.5 2.5h4v4' }),
        h('path', { key: 'b', d: 'M13.5 2.5 7.8 8.2' }),
        h('path', { key: 'c', d: 'M12 9.6v3.2a1.2 1.2 0 0 1-1.2 1.2H3.7a1.2 1.2 0 0 1-1.2-1.2V5.7a1.2 1.2 0 0 1 1.2-1.2h3.2' }),
      ]
    case 'copy':
      return [
        h('rect', { key: 'a', x: 5.5, y: 5.5, width: 8, height: 8, rx: 1.5 }),
        h('path', { key: 'b', d: 'M10.5 5.5V3.9a1.4 1.4 0 0 0-1.4-1.4H3.9a1.4 1.4 0 0 0-1.4 1.4v5.2a1.4 1.4 0 0 0 1.4 1.4h1.6' }),
      ]
    case 'check':
      return [h('path', { key: 'a', d: 'M3 8.4 6.3 11.7 13 4.8' })]
    case 'cross':
      return [h('path', { key: 'a', d: 'M4 4l8 8M12 4l-8 8' })]
    case 'dot':
      return [h('circle', { key: 'a', cx: 8, cy: 8, r: 3.2, fill: 'currentColor', stroke: 'none' })]
    case 'clock':
      return [
        h('circle', { key: 'a', cx: 8, cy: 8, r: 5.6 }),
        h('path', { key: 'b', d: 'M8 4.9V8l2.2 1.5' }),
      ]
    case 'alert':
      return [
        h('path', { key: 'a', d: 'M8 2.4 14 13H2z' }),
        h('path', { key: 'b', d: 'M8 6.3v3.1' }),
        h('path', { key: 'c', d: 'M8 11.3v.1' }),
      ]
    case 'comment':
      return [h('path', { key: 'a', d: 'M13.5 8.6c0 2.4-2.5 4.3-5.5 4.3-.7 0-1.5-.1-2.2-.3L3 13.5l1-2.4c-.7-.7-1-1.6-1-2.5C3 6.2 5.5 4.3 8 4.3s5.5 1.9 5.5 4.3z' })]
    case 'merge':
      return [
        h('circle', { key: 'a', cx: 4.5, cy: 4, r: 1.5 }),
        h('circle', { key: 'b', cx: 4.5, cy: 12, r: 1.5 }),
        h('circle', { key: 'c', cx: 11.5, cy: 8, r: 1.5 }),
        h('path', { key: 'd', d: 'M4.5 5.5v5' }),
        h('path', { key: 'e', d: 'M10 8H7.2a2.7 2.7 0 0 1-2.7-2.7' }),
      ]
    case 'issue':
      return [
        h('circle', { key: 'a', cx: 8, cy: 8, r: 5.6 }),
        h('path', { key: 'b', d: 'M8 5.2v3.3' }),
        h('path', { key: 'c', d: 'M8 10.8v.1' }),
      ]
    case 'commit':
      return [
        h('circle', { key: 'a', cx: 8, cy: 8, r: 2.6 }),
        h('path', { key: 'b', d: 'M1.8 8h3.6M10.6 8h3.6' }),
      ]
    case 'chevron':
      return [h('path', { key: 'a', d: 'M6 4l4 4-4 4' })]
    case 'chevronDown':
      return [h('path', { key: 'a', d: 'M4 6l4 4 4-4' })]
    case 'upload':
      return [
        h('path', { key: 'a', d: 'M8 10.5V2.8' }),
        h('path', { key: 'b', d: 'M4.8 6l3.2-3.2L11.2 6' }),
        h('path', { key: 'c', d: 'M2.8 12.8h10.4' }),
      ]
    case 'download':
      return [
        h('path', { key: 'a', d: 'M8 2.8v7.7' }),
        h('path', { key: 'b', d: 'M4.8 7.3 8 10.5l3.2-3.2' }),
        h('path', { key: 'c', d: 'M2.8 12.8h10.4' }),
      ]
    case 'sparkles':
      return [
        h('path', { key: 'a', d: 'M6.5 2.5 7.4 5l2.5.9-2.5.9-.9 2.5-.9-2.5L3.1 5.9 5.6 5z' }),
        h('path', { key: 'b', d: 'M11.5 8.5l.6 1.6 1.6.6-1.6.6-.6 1.6-.6-1.6-1.6-.6 1.6-.6z' }),
      ]
    case 'trash':
      return [
        h('path', { key: 'a', d: 'M3.5 4.5h9' }),
        h('path', { key: 'b', d: 'M6.5 4.5V3h3v1.5' }),
        h('path', { key: 'c', d: 'M4.6 4.5l.5 8.2a1.2 1.2 0 0 0 1.2 1.1h3.4a1.2 1.2 0 0 0 1.2-1.1l.5-8.2' }),
      ]
    case 'plus':
      return [h('path', { key: 'a', d: 'M8 3.2v9.6M3.2 8h9.6' })]
    case 'search':
      return [
        h('circle', { key: 'a', cx: 7.2, cy: 7.2, r: 4.2 }),
        h('path', { key: 'b', d: 'M10.4 10.4 13.5 13.5' }),
      ]
    case 'columns':
      return [
        h('rect', { key: 'a', x: 2.5, y: 3, width: 11, height: 10, rx: 1.4 }),
        h('path', { key: 'b', d: 'M8 3v10' }),
      ]
    case 'rows':
      return [
        h('rect', { key: 'a', x: 2.5, y: 3, width: 11, height: 10, rx: 1.4 }),
        h('path', { key: 'b', d: 'M2.5 6.4h11M2.5 9.6h11' }),
      ]
    case 'wrap':
      return [
        h('path', { key: 'a', d: 'M2.5 4.5h11' }),
        h('path', { key: 'b', d: 'M2.5 8h8.2a2.3 2.3 0 0 1 0 4.6H7.4' }),
        h('path', { key: 'c', d: 'M8.6 11l-1.4 1.6 1.4 1.6' }),
        h('path', { key: 'd', d: 'M2.5 11.5h3' }),
      ]
    case 'pilcrow':
      return [
        h('path', { key: 'a', d: 'M9.4 2.5H6.6a2.6 2.6 0 0 0 0 5.2h2.8z' }),
        h('path', { key: 'b', d: 'M9.4 2.5v11' }),
        h('path', { key: 'c', d: 'M12.4 2.5v11' }),
      ]
    case 'tree':
      return [
        h('path', { key: 'a', d: 'M3 3.5h4v3H3zM3 9.5h4v3H3z' }),
        h('path', { key: 'b', d: 'M9 5h2v6.5H9' }),
        h('path', { key: 'c', d: 'M7 5h2M7 11h2' }),
      ]
    case 'lock':
      return [
        h('rect', { key: 'a', x: 3.4, y: 7, width: 9.2, height: 6.2, rx: 1.3 }),
        h('path', { key: 'b', d: 'M5.6 7V5.4a2.4 2.4 0 0 1 4.8 0V7' }),
      ]
    case 'globe':
      return [
        h('circle', { key: 'a', cx: 8, cy: 8, r: 5.6 }),
        h('path', { key: 'b', d: 'M2.6 8h10.8' }),
        h('path', { key: 'c', d: 'M8 2.4c1.7 1.6 2.6 3.5 2.6 5.6S9.7 12 8 13.6C6.3 12 5.4 10.1 5.4 8S6.3 4 8 2.4z' }),
      ]
    case 'info':
      return [
        h('circle', { key: 'a', cx: 8, cy: 8, r: 5.6 }),
        h('path', { key: 'b', d: 'M8 7.2v4' }),
        h('path', { key: 'c', d: 'M8 4.9v.1' }),
      ]
    default:
      return [h('circle', { key: 'a', cx: 8, cy: 8, r: 5.5 })]
  }
}
