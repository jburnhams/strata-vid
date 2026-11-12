import { fireEvent, screen } from '@testing-library/react';

/** A clip on strata-react's Timeline, by the start of its accessible name ("run.mp4, 0:10 to 0:15, Footage"). */
export const timelineItem = (name: string) => screen.getByRole('button', { name: new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')},`) });

/** Drags an element sideways by `dx` pixels with the primary pointer, as a person would. */
export const dragBy = (el: Element, dx: number) => {
  const at = { button: 0, pointerId: 1, clientX: 500, clientY: 10 };
  fireEvent.pointerDown(el, at);
  fireEvent.pointerMove(el, { ...at, clientX: 500 + dx / 2 });
  fireEvent.pointerMove(el, { ...at, clientX: 500 + dx });
  fireEvent.pointerUp(el, { ...at, clientX: 500 + dx });
};
