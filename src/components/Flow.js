import React, { useEffect, useState, useMemo } from 'react';
import ReactFlow, {
  useNodesState,
  useEdgesState,
  MiniMap,
  Controls,
  Background,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { EditorNode } from './EditorNode';
import { PreviewNode } from './PreviewNode';
import './updatenode.css';

const initialEdges = [{ id: 'e1-2', source: '1', target: '2' }];
const defaultViewport = { x: 0, y: 0, zoom: 1.5 };

const tempInput = `
export const myfunction = () => {
  return 'hello world';
}

export const myfunction2 = () => {
  return 'hello world';
}

`;

export const Flow = () => {
  const initialNodes = [
    {
      id: '1',
      data: { id: '1', label: '-', value: tempInput },
      type: 'editor',
      position: { x: 100, y: 100 },
    },
    // {
    //   id: '1',
    //   data: { id: '1', label: '-', value: 'test string' },
    //   type: 'preview',
    //   position: { x: 100, y: 100 },
    // },
  ];
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const [nodeName, setNodeName] = useState('Node 1');
  const [nodeBg, setNodeBg] = useState('#eee');
  const [nodeHidden, setNodeHidden] = useState(false);

  const nodeTypes = useMemo(
    () => ({
      editor: (props) => <EditorNode onTextChange={onTextChange} {...props} />,
      preview: PreviewNode,
    }),
    []
  );

  function onTextChange(id, value) {
    //console.log('=== onTextChange', id, value);
    setNodes((nodes) =>
      nodes.map((node) => {
        if (node.id === id) {
          node.data = { ...node.data, value };
        }

        return node;
      })
    );
  }
  const nodeClassName = (node) => node.type;

  useEffect(() => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === '1') {
          node.data = {
            ...node.data,
            label: nodeName,
          };
        }

        return node;
      })
    );
  }, [nodeName, setNodes]);

  useEffect(() => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === '1') {
          node.style = { ...node.style, backgroundColor: nodeBg };
        }

        return node;
      })
    );
  }, [nodeBg, setNodes]);

  useEffect(() => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === '1') {
          // when you update a simple type you can just update the value
          node.hidden = nodeHidden;
        }

        return node;
      })
    );
    setEdges((eds) =>
      eds.map((edge) => {
        if (edge.id === 'e1-2') {
          edge.hidden = nodeHidden;
        }

        return edge;
      })
    );
  }, [nodeHidden, setNodes, setEdges]);

  const createNode = () => {
    const newNode = {
      id: (nodes.length + 1).toString(),
      data: { label: 'Node ' + (nodes.length + 1), value: 'test string' },
      type: 'editor',
      position: {
        x: Math.random() * window.innerWidth - 200,
        y: Math.random() * window.innerHeight - 400,
      },
    };

    setNodes((nodes) => nodes.concat(newNode));
  };

  return (
    <>
      <ReactFlow
        nodeTypes={nodeTypes}
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        defaultViewport={defaultViewport}
        minZoom={0.2}
        maxZoom={4}
        attributionPosition="bottom-left"
      >
        <div className="updatenode__controls">
          <button onClick={createNode}> ➕ Add Node</button>
        </div>
        <MiniMap zoomable pannable nodeClassName={nodeClassName} />
        <Controls />
        <Background />
      </ReactFlow>
    </>
  );
};
