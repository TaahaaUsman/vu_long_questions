import { InlineFormattedText } from '../utils/inlineFormat';

export function AnswerBlocks({ blocks }) {
  if (!blocks?.length) return null;

  return (
    <div className="answer-blocks">
      {blocks.map((block, idx) => (
        <AnswerBlock key={idx} block={block} />
      ))}
    </div>
  );
}

function AnswerBlock({ block }) {
  switch (block.type) {
    case 'paragraph':
      return (
        <div className="ab-block ab-block--paragraph">
          <p className="ab-paragraph">
            <InlineFormattedText text={block.text} />
          </p>
        </div>
      );
    case 'bulletList':
      return (
        <div className="ab-block ab-block--bullet">
          <ul className="ab-list ab-list--bullet">
            {(block.items || []).map((item, i) => (
              <li key={i}>
                <InlineFormattedText text={item} />
              </li>
            ))}
          </ul>
        </div>
      );
    case 'orderedList':
      return (
        <div className="ab-block ab-block--ordered">
          <ol className="ab-list ab-list--ordered">
            {(block.items || []).map((item, i) => (
              <li key={i}>
                <InlineFormattedText text={item} />
              </li>
            ))}
          </ol>
        </div>
      );
    case 'table':
      return (
        <div className="ab-block ab-block--table">
          <div className="ab-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  {(block.headers || []).map((h, i) => (
                    <th key={i}>
                      <InlineFormattedText text={h} />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(block.rows || []).map((row, ri) => (
                  <tr key={ri}>
                    {row.map((cell, ci) => (
                      <td key={ci}>
                        <InlineFormattedText text={String(cell)} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      );
    default:
      return null;
  }
}
