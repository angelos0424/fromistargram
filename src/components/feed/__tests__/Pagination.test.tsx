import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import Pagination from '../Pagination';

describe('Pagination', () => {
  it('renders the current page summary and disables previous on first page', () => {
    const handleChange = vi.fn();
    const { container } = render(
      <Pagination page={1} pageSize={12} total={120} onChange={handleChange} />
    );

    expect(screen.getByText('페이지 1 / 10 · 총 120개')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '이전' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '다음' })).toBeEnabled();
    expect(container.firstChild).toMatchSnapshot();
  });

  it('invokes onChange with the next page when clicking 다음', () => {
    const handleChange = vi.fn();
    render(<Pagination page={1} pageSize={12} total={24} onChange={handleChange} />);

    fireEvent.click(screen.getByRole('button', { name: '다음' }));

    expect(handleChange).toHaveBeenCalledWith(2);
  });

  it('disables the next button on the last page and keeps previous enabled', () => {
    const handleChange = vi.fn();
    render(<Pagination page={5} pageSize={10} total={50} onChange={handleChange} />);

    expect(screen.getByRole('button', { name: '다음' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '이전' })).toBeEnabled();
  });
});
