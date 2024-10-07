
const w3 = "http://www.w3.org/2000/svg";

export function makeTopSvg(width = 500, height = 500): SVGSVGElement {
  return makeSvg('svg', {
    width: width.toString(),
    height: height.toString(),
  }) as SVGSVGElement;
}

export function makeSvg(tag = 'svg', attrs = {}): SVGElement {
  const svg = document.createElementNS(w3, tag);
  for (const [key, value] of Object.entries(attrs)) {
    const valStr = typeof value === 'string' ? value : JSON.stringify(value);
    svg.setAttribute(key, valStr);
  }
  return svg;
}


