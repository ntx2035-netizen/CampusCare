import { describe, expect, it } from 'vitest';
import { enqueue, readQueue, syncQueue, type QueueStorage } from '../offlineQueue';

function memoryStorage(): QueueStorage {
  const data = new Map<string, string>();
  return { async getItem(key) { return data.get(key) || null; }, async setItem(key, value) { data.set(key, value); } };
}
const report = { title: 'Đèn bị hỏng', description: 'Đèn hành lang tầng hai không sáng.', category_id: 'category', priority: 'HIGH', location_id: 'room', idempotency_key: 'offline-uuid-001' };

describe('Hàng đợi offline', () => {
  it('lưu payload và URI ảnh mà không tạo trùng idempotency key', async () => {
    const storage = memoryStorage(); await enqueue(storage, report, ['file://anh-1.jpg']); await enqueue(storage, report, ['file://anh-2.jpg']); const queue = await readQueue(storage);
    expect(queue).toHaveLength(1); expect(queue[0].imageUris).toEqual(['file://anh-2.jpg']);
  });

  it('xóa mục thành công và giữ mục lỗi để thử lại', async () => {
    const storage = memoryStorage(); await enqueue(storage, report, ['file://anh.jpg']); const result = await syncQueue(storage, async () => { throw new Error('Mất kết nối'); });
    expect(result).toEqual({ synced: 0, failed: 1 }); expect((await readQueue(storage))[0]).toMatchObject({ status: 'ERROR', error: 'Mất kết nối' });
    const retried = await syncQueue(storage, async () => undefined); expect(retried.synced).toBe(1); expect(await readQueue(storage)).toHaveLength(0);
  });
});

