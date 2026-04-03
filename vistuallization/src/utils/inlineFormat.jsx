/**
 * Renders plain text with **bold** then *italic* (process bold segments first).
 */
export function InlineFormattedText({ text }) {
  if (!text) return null;
  const nodes = [];
  let key = 0;
  const boldParts = text.split(/\*\*([^*]+)\*\*/g);
  for (let j = 0; j < boldParts.length; j++) {
    if (j % 2 === 1) {
      nodes.push(<strong key={key++}>{boldParts[j]}</strong>);
    } else {
      const sub = boldParts[j];
      const italicParts = sub.split(/\*([^*]+)\*/g);
      for (let k = 0; k < italicParts.length; k++) {
        if (k % 2 === 1) {
          nodes.push(<em key={key++}>{italicParts[k]}</em>);
        } else if (italicParts[k]) {
          nodes.push(italicParts[k]);
        }
      }
    }
  }
  return <>{nodes}</>;
}
