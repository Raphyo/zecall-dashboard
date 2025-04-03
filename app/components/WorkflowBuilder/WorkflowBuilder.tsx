'use client';

import React, { useState, DragEvent } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  Node,
  Edge,
  NodeChange,
  EdgeChange,
  Connection,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  NodeTypes,
  OnSelectionChangeParams
} from 'reactflow';
import 'reactflow/dist/style.css';
import { BaseNode } from './nodes/BaseNode';
import { ConfigPanel } from './ConfigPanel';

interface BlockType {
  id: string;
  label: string;
  category: 'Flow' | 'Actions';
}

const blockTypes: BlockType[] = [
  { id: 'prompt', label: 'Prompt', category: 'Flow' },
  { id: 'question', label: 'Question', category: 'Flow' },
  { id: 'filter', label: 'Filter', category: 'Flow' },
  { id: 'timeFilter', label: 'Time Filter', category: 'Flow' },
  { id: 'endCall', label: 'End Call', category: 'Flow' },
  { id: 'sendSms', label: 'Send SMS', category: 'Actions' },
  { id: 'transferCall', label: 'Transfer Call', category: 'Actions' },
  { id: 'apiRequest', label: 'API Request', category: 'Actions' },
];

const nodeTypes: NodeTypes = {
  base: BaseNode,
};

let id = 0;
const getId = () => `node_${id++}`;

export function WorkflowBuilder() {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);

  const onDragStart = (event: DragEvent<HTMLDivElement>, block: BlockType) => {
    event.dataTransfer.setData('application/reactflow', JSON.stringify(block));
    event.dataTransfer.effectAllowed = 'move';
  };

  const onDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  };

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();

    const reactFlowBounds = event.currentTarget.getBoundingClientRect();
    const block = JSON.parse(event.dataTransfer.getData('application/reactflow')) as BlockType;

    const position = {
      x: event.clientX - reactFlowBounds.left,
      y: event.clientY - reactFlowBounds.top,
    };

    const newNode: Node = {
      id: getId(),
      type: 'base',
      position,
      data: { label: block.label, type: block.id },
    };

    setNodes((nds) => nds.concat(newNode));
  };

  const onSelectionChange = ({ nodes }: OnSelectionChangeParams) => {
    setSelectedNode(nodes?.[0] || null);
  };

  const onUpdateNode = (nodeId: string, data: any) => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === nodeId) {
          return {
            ...node,
            data,
          };
        }
        return node;
      })
    );
  };

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <div className="w-64 border-r p-4 bg-background">
        <h2 className="text-lg font-semibold mb-4">Blocks</h2>
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-medium mb-2">Flow</h3>
            <div className="space-y-2">
              {blockTypes
                .filter((block) => block.category === 'Flow')
                .map((block) => (
                  <div
                    key={block.id}
                    className="p-2 border rounded-md cursor-move hover:bg-accent"
                    draggable
                    onDragStart={(e) => onDragStart(e, block)}
                  >
                    {block.label}
                  </div>
                ))}
            </div>
          </div>
          <div>
            <h3 className="text-sm font-medium mb-2">Actions</h3>
            <div className="space-y-2">
              {blockTypes
                .filter((block) => block.category === 'Actions')
                .map((block) => (
                  <div
                    key={block.id}
                    className="p-2 border rounded-md cursor-move hover:bg-accent"
                    draggable
                    onDragStart={(e) => onDragStart(e, block)}
                  >
                    {block.label}
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 h-full" onDragOver={onDragOver} onDrop={onDrop}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={(changes: NodeChange[]) => setNodes((nds) => applyNodeChanges(changes, nds))}
          onEdgesChange={(changes: EdgeChange[]) => setEdges((eds) => applyEdgeChanges(changes, eds))}
          onConnect={(params: Connection) => setEdges((eds) => addEdge(params, eds))}
          onSelectionChange={onSelectionChange}
          nodeTypes={nodeTypes}
          fitView
        >
          <Background />
          <Controls />
          <MiniMap />
        </ReactFlow>
      </div>

      {/* Configuration Panel */}
      <ConfigPanel selectedNode={selectedNode} onUpdateNode={onUpdateNode} />
    </div>
  );
} 