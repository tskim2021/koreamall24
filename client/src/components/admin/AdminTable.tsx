import React from 'react';

export interface AdminTableColumn<T> {
  key: keyof T | string;
  header: string;
  width?: string;
  render?: (value: any, row: T) => React.ReactNode;
  align?: 'left' | 'center' | 'right';
}

interface AdminTableProps<T> {
  columns: AdminTableColumn<T>[];
  data: T[];
  isLoading?: boolean;
  isEmpty?: boolean;
  emptyMessage?: string;
  loadingMessage?: string;
  rowKey: keyof T | ((row: T, index: number) => string | number);
  onRowClick?: (row: T) => void;
  className?: string;
}

export default function AdminTable<T extends Record<string, any>>({
  columns,
  data,
  isLoading = false,
  isEmpty = false,
  emptyMessage = '데이터가 없습니다',
  loadingMessage = '로딩 중...',
  rowKey,
  onRowClick,
  className = '',
}: AdminTableProps<T>) {
  const getRowKey = (row: T, index: number): string | number => {
    if (typeof rowKey === 'function') {
      return rowKey(row, index);
    }
    return row[rowKey];
  };

  const getAlignClass = (align?: 'left' | 'center' | 'right'): string => {
    switch (align) {
      case 'center':
        return 'text-center';
      case 'right':
        return 'text-right';
      default:
        return 'text-left';
    }
  };

  const getCellValue = (row: T, column: AdminTableColumn<T>): any => {
    if (typeof column.key === 'string') {
      return row[column.key];
    }
    return row[column.key];
  };

  return (
    <div className={`bg-white rounded-lg shadow overflow-hidden ${className}`}>
      <table className="w-full">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            {columns.map((column, index) => (
              <th
                key={index}
                className={`px-3 py-2 text-left text-xs font-medium text-gray-700 ${
                  column.width ? `w-${column.width}` : ''
                } ${getAlignClass(column.align)}`}
                style={column.width ? { width: column.width } : {}}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {isLoading ? (
            <tr>
              <td colSpan={columns.length} className="px-3 py-4 text-center text-xs text-gray-500">
                {loadingMessage}
              </td>
            </tr>
          ) : isEmpty || data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-3 py-4 text-center text-xs text-gray-500">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row, rowIndex) => (
              <tr
                key={getRowKey(row, rowIndex)}
                className={`hover:bg-gray-50 ${onRowClick ? 'cursor-pointer' : ''}`}
                onClick={() => onRowClick?.(row)}
              >
                {columns.map((column, colIndex) => {
                  const value = getCellValue(row, column);
                  const renderedValue = column.render ? column.render(value, row) : value;

                  return (
                    <td
                      key={colIndex}
                      className={`px-3 py-2 text-xs text-gray-600 ${getAlignClass(column.align)}`}
                    >
                      {renderedValue || '-'}
                    </td>
                  );
                })}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
