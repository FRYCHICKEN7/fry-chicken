import { Order, OrderStatus } from '@/types';

const STATUS_PRIORITY: Record<OrderStatus, number> = {
  pending: 1,
  confirmed: 1,
  preparing: 2,
  ready: 3,
  dispatched: 4,
  delivered: 5,
  rejected: 6,
};

export function sortOrdersByPriorityAndTime(orders: Order[]): Order[] {
  return [...orders].sort((a, b) => {
    const priorityA = STATUS_PRIORITY[a.status] || 999;
    const priorityB = STATUS_PRIORITY[b.status] || 999;

    if (priorityA !== priorityB) {
      return priorityA - priorityB;
    }

    const dateA = new Date(a.createdAt).getTime();
    const dateB = new Date(b.createdAt).getTime();
    
    return dateA - dateB;
  });
}
