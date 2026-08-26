import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Empty, StatusBadge } from './States';

describe('Trạng thái giao diện', () => {
  it('dịch trạng thái sự cố sang tiếng Việt', () => {
    render(<StatusBadge status="IN_PROGRESS" />);
    expect(screen.getByText('Đang xử lý')).toBeInTheDocument();
  });

  it('hiển thị empty state', () => {
    render(<Empty label="Chưa có báo cáo" />);
    expect(screen.getByText('Chưa có báo cáo')).toBeInTheDocument();
  });
});

