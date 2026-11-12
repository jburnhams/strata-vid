import { fireEvent } from '@testing-library/react';

/**
 * Chooses files through a strata-react `FileButton` (or a `MissingFile`'s Relink button), as the
 * picker would: React Aria's `FileTrigger` renders a hidden file input beside the button.
 */
export const chooseFiles = (button: HTMLElement, files: File[]) => {
  let el: Element | null = button.nextElementSibling;
  while (el && !(el instanceof HTMLInputElement && el.type === 'file')) el = el.nextElementSibling;
  const input = (el ?? button.parentElement?.querySelector('input[type="file"]')) as HTMLInputElement | null;
  if (!input) throw new Error('No file input beside the button');
  fireEvent.change(input, { target: { files } });
};
