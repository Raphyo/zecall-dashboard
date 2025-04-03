import React from 'react';
import { Handle, Position } from 'reactflow';

interface BaseNodeProps {
  data: {
    label: string;
    type: string;
  };
  isConnectable: boolean;
}

export function BaseNode({ data, isConnectable }: BaseNodeProps) {
  return (
    <div className="px-4 py-2 shadow-lg rounded-md bg-background border">
      <Handle
        type="target"
        position={Position.Top}
        isConnectable={isConnectable}
      />
      <div className="flex items-center gap-2">
        <div className="text-sm font-medium">{data.label}</div>
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        isConnectable={isConnectable}
      />
    </div>
  );
} 