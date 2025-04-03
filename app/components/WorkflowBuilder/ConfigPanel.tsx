'use client';

import React from 'react';
import { Node } from 'reactflow';

interface ConfigPanelProps {
  selectedNode: Node | null;
  onUpdateNode: (nodeId: string, data: any) => void;
}

export function ConfigPanel({ selectedNode, onUpdateNode }: ConfigPanelProps) {
  if (!selectedNode) {
    return (
      <div className="w-64 border-l p-4 bg-background">
        <p className="text-sm text-muted-foreground">Select a node to configure</p>
      </div>
    );
  }

  const renderConfig = () => {
    switch (selectedNode.data.type) {
      case 'prompt':
        return (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Prompt Text</label>
              <textarea
                className="w-full mt-1 p-2 border rounded-md"
                value={selectedNode.data.promptText || ''}
                onChange={(e) =>
                  onUpdateNode(selectedNode.id, {
                    ...selectedNode.data,
                    promptText: e.target.value,
                  })
                }
                rows={4}
              />
            </div>
          </div>
        );

      case 'question':
        return (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Question</label>
              <input
                type="text"
                className="w-full mt-1 p-2 border rounded-md"
                value={selectedNode.data.question || ''}
                onChange={(e) =>
                  onUpdateNode(selectedNode.id, {
                    ...selectedNode.data,
                    question: e.target.value,
                  })
                }
              />
            </div>
            <div>
              <label className="text-sm font-medium">Options (one per line)</label>
              <textarea
                className="w-full mt-1 p-2 border rounded-md"
                value={selectedNode.data.options || ''}
                onChange={(e) =>
                  onUpdateNode(selectedNode.id, {
                    ...selectedNode.data,
                    options: e.target.value,
                  })
                }
                rows={4}
              />
            </div>
          </div>
        );

      case 'filter':
        return (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Condition</label>
              <input
                type="text"
                className="w-full mt-1 p-2 border rounded-md"
                value={selectedNode.data.condition || ''}
                onChange={(e) =>
                  onUpdateNode(selectedNode.id, {
                    ...selectedNode.data,
                    condition: e.target.value,
                  })
                }
              />
            </div>
          </div>
        );

      case 'sendSms':
        return (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Message Template</label>
              <textarea
                className="w-full mt-1 p-2 border rounded-md"
                value={selectedNode.data.messageTemplate || ''}
                onChange={(e) =>
                  onUpdateNode(selectedNode.id, {
                    ...selectedNode.data,
                    messageTemplate: e.target.value,
                  })
                }
                rows={4}
              />
            </div>
          </div>
        );

      case 'apiRequest':
        return (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Endpoint URL</label>
              <input
                type="text"
                className="w-full mt-1 p-2 border rounded-md"
                value={selectedNode.data.endpoint || ''}
                onChange={(e) =>
                  onUpdateNode(selectedNode.id, {
                    ...selectedNode.data,
                    endpoint: e.target.value,
                  })
                }
              />
            </div>
            <div>
              <label className="text-sm font-medium">Method</label>
              <select
                className="w-full mt-1 p-2 border rounded-md"
                value={selectedNode.data.method || 'GET'}
                onChange={(e) =>
                  onUpdateNode(selectedNode.id, {
                    ...selectedNode.data,
                    method: e.target.value,
                  })
                }
              >
                <option value="GET">GET</option>
                <option value="POST">POST</option>
                <option value="PUT">PUT</option>
                <option value="DELETE">DELETE</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Request Body</label>
              <textarea
                className="w-full mt-1 p-2 border rounded-md font-mono text-sm"
                value={selectedNode.data.body || ''}
                onChange={(e) =>
                  onUpdateNode(selectedNode.id, {
                    ...selectedNode.data,
                    body: e.target.value,
                  })
                }
                rows={4}
                placeholder="{}"
              />
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="w-64 border-l p-4 bg-background">
      <h3 className="text-lg font-semibold mb-4">Configure {selectedNode.data.label}</h3>
      {renderConfig()}
    </div>
  );
} 