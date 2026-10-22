import { fireEvent, render, screen, within } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import Dialog from '../Dialog';

const NestedDialogs = () => {
  const [parent, setParent] = useState(false);
  const [child, setChild] = useState(false);
  return <>
    <button onClick={() => setParent(true)}>열기</button>
    <Dialog isOpen={parent} onClose={() => setParent(false)} label="부모">
      <button onClick={() => setChild(true)}>프로필 열기</button>
      <button onClick={() => setParent(false)}>부모 닫기</button>
    </Dialog>
    <Dialog isOpen={child} onClose={() => setChild(false)} label="프로필">
      <button>첫 항목</button><button onClick={() => setChild(false)}>프로필 닫기</button>
    </Dialog>
  </>;
};

describe('Dialog', () => {
  it('portals outside the app, contains focus, closes only the top dialog and restores focus', () => {
    const { container } = render(<NestedDialogs />);
    const opener = screen.getByRole('button', { name: '열기' });
    opener.focus();
    fireEvent.click(opener);
    const parent = screen.getByRole('dialog', { name: '부모' });
    expect(container).not.toContainElement(parent);
    expect(container).toHaveAttribute('aria-hidden', 'true');
    expect(document.body.style.overflow).toBe('hidden');
    const childOpener = within(parent).getByRole('button', { name: '프로필 열기' });
    expect(childOpener).toHaveFocus();
    fireEvent.click(childOpener);
    const child = screen.getByRole('dialog', { name: '프로필' });
    const first = within(child).getByRole('button', { name: '첫 항목' });
    const last = within(child).getByRole('button', { name: '프로필 닫기' });
    expect(first).toHaveFocus();
    fireEvent.keyDown(first, { key: 'Tab', shiftKey: true });
    expect(last).toHaveFocus();
    fireEvent.keyDown(last, { key: 'Tab' });
    expect(first).toHaveFocus();
    fireEvent.keyDown(first, { key: 'Escape' });
    expect(screen.queryByRole('dialog', { name: '프로필' })).not.toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: '부모' })).toBeInTheDocument();
    expect(childOpener).toHaveFocus();
    expect(document.body.style.overflow).toBe('hidden');
    fireEvent.keyDown(childOpener, { key: 'Escape' });
    expect(opener).toHaveFocus();
    expect(container).not.toHaveAttribute('aria-hidden');
    expect(document.body.style.overflow).toBe('');
  });
});
