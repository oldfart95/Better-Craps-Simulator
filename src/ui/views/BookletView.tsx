import { useMemo, useState } from 'react';
import { strategyBook } from '../../training/booklet';

type FilterKey = 'all' | 'basics' | 'common' | 'uncommon' | 'discipline';

const filterLabels: Record<FilterKey, string> = {
  all: 'All Pages',
  basics: 'Basics',
  common: 'Common',
  uncommon: 'Uncommon',
  discipline: 'Discipline'
};

export function BookletView() {
  const [filter, setFilter] = useState<FilterKey>('all');
  const [pageIndex, setPageIndex] = useState(0);

  const pages = useMemo(
    () => strategyBook.filter((page) => filter === 'all' || page.category === filter),
    [filter]
  );

  const activeIndex = Math.min(pageIndex, Math.max(0, pages.length - 1));
  const page = pages[activeIndex] ?? strategyBook[0];

  return (
    <div className="single-view">
      <section className="panel panel--hero">
        <p className="eyebrow">Strategy Booklet</p>
        <h2>Leaf through the game while you learn it</h2>
        <p className="subtle">This is a living handbook: common systems, less common ones, and room to add more pages as your study gets deeper.</p>
      </section>

      <section className="panel booklet-toolbar">
        <div className="booklet-filters">
          {(Object.keys(filterLabels) as FilterKey[]).map((key) => (
            <button
              className={filter === key ? 'active' : ''}
              key={key}
              onClick={() => {
                setFilter(key);
                setPageIndex(0);
              }}
            >
              {filterLabels[key]}
            </button>
          ))}
        </div>
        <div className="booklet-nav">
          <button className="neutral" disabled={activeIndex === 0} onClick={() => setPageIndex((value) => Math.max(0, value - 1))}>
            Previous
          </button>
          <span>Page {Math.min(activeIndex + 1, pages.length)} / {pages.length}</span>
          <button
            className="neutral"
            disabled={activeIndex >= pages.length - 1}
            onClick={() => setPageIndex((value) => Math.min(pages.length - 1, value + 1))}
          >
            Next
          </button>
        </div>
      </section>

      <div className="booklet-layout">
        <aside className="panel booklet-index">
          <h3>Contents</h3>
          <div className="booklet-index__list">
            {pages.map((entry, index) => (
              <button
                className={`booklet-index__item ${entry.id === page.id ? 'active' : ''}`}
                key={entry.id}
                onClick={() => setPageIndex(index)}
              >
                <strong>{entry.title}</strong>
                <span>{entry.summary}</span>
              </button>
            ))}
          </div>
        </aside>

        <article className="panel booklet-page">
          <div className="booklet-page__header">
            <div>
              <p className="eyebrow">{filterLabels[page.category]}</p>
              <h3>{page.title}</h3>
            </div>
            <div className="booklet-page__summary">{page.summary}</div>
          </div>

          <div className="booklet-sections">
            {page.sections.map((section) => (
              <section className="booklet-section" key={section.heading}>
                <h4>{section.heading}</h4>
                {section.body.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </section>
            ))}
          </div>
        </article>
      </div>
    </div>
  );
}
