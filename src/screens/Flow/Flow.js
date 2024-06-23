import React, {
  useEffect,
  useState,
  useMemo,
  useCallback,
  useRef,
} from 'react';
import ReactFlow, {
  useNodesState,
  useEdgesState,
  MiniMap,
  Panel,
  Controls,
  Background,
  useReactFlow,
  useUpdateNodeInternals,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { EditorNode } from '../../components/nodes/EditorNode';
import { PreviewNode } from '../../components/nodes/PreviewNode';
import { GroupNode } from '../../components/nodes/GroupNode';
import { SettingsNode } from '../../components/nodes/SettingsNode/SettingsNode';

import FolderSelectButton from '../../components/FolderSelectButton';
import { BasicTree } from '../../components/FolderTree';
import './updatenode.css';

import {
  getHandles,
  removeTextChunk,
  insertTextChunk,
} from '../../components/editorUtils';

import {
  getInitialNodes,
  createEditorNode,
  createSelectionHandle,
  getNewEdges,
} from './utils';
import { initialSettingsState } from './mocks';

const initialEdges = [];
const defaultViewport = { x: 0, y: 0, zoom: 1.5 };

export const Flow = (project) => {
  const initialNodes = getInitialNodes(initialSettingsState);
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [settings, setSettings] = useState(initialSettingsState);
  const [handles, setHandles] = useState([]);

  const updateNodeInternals = useUpdateNodeInternals();
  const connectingNodeId = useRef(null);
  const connectingHandleId = useRef(null);
  const { screenToFlowPosition, getIntersectingNodes } = useReactFlow();

  const onFileNameChange = (nodeId, fileName) => {
    setNodes((nodes) =>
      nodes.map((node) => {
        if (node.id === nodeId) {
          node.data = { ...node.data, fileName };
        }
        return node;
      })
    );
  };

  const onSettingsChanged = (newSettings) => {
    setSettings(newSettings);
    // also update settings node
    setNodes((nodes) =>
      nodes.map((node) => {
        if (node.type === 'settings') {
          node.data = { ...node.data, settings: newSettings };
        }
        return node;
      })
    );
  };

  const onSelectionChange = (nodeId, selection) => {
    if (!selection) {
      setNodes((nodes) =>
        nodes.map((node) => {
          if (node.id === nodeId) {
            const newHandles = node.data.handles.filter(
              (handle) => handle.handleType !== 'selection'
            );
            node.data = { ...node.data, handles: newHandles };
          }
          return node;
        })
      );
      return;
    }

    setNodes((nodes) =>
      nodes.map((node) => {
        if (node.id === nodeId) {
          const newHandles = node.data.handles.filter(
            (handle) => handle.handleType !== 'selection'
          );
          newHandles.push(createSelectionHandle(nodeId, selection));
          node.data = { ...node.data, handles: newHandles };
        }
        return node;
      })
    );
  };

  const nodeTypes = useMemo(
    () => ({
      editor: (props) => (
        <EditorNode
          onTextChange={onTextChange}
          onFileNameChange={onFileNameChange}
          onSelectionChange={onSelectionChange}
          {...props}
        />
      ),
      preview: PreviewNode,
      group: GroupNode,
      settings: (props) => (
        <SettingsNode {...props} onSettingsChanged={onSettingsChanged} />
      ),
    }),
    []
  );

  const updateEdges = (nodeId, existingHandles, newHandles) => {
    const newEdges = getNewEdges(nodeId, existingHandles, newHandles);

    setEdges((edges) => {
      const existingEdges = edges.filter(
        (edge) => edge.source !== nodeId && edge.target !== nodeId
      );
      return existingEdges.concat(newEdges);
    });
  };

  function onTextChange(nodeId, value) {
    const node = nodes.find((node) => node.id === nodeId);
    console.log('found node', node);
    const newHandles = getHandles(nodeId, node.data.fileName, value);

    setNodes((nodes) =>
      nodes.map((node) => {
        if (node.id === nodeId) {
          node.data = {
            ...node.data,
            value,
            handles: newHandles,
          };
        }
        return node;
      })
    );
    updateNodeInternals(nodeId);

    setHandles((handles) => {
      const existingHandles = handles.filter(
        (handle) => handle.nodeId !== nodeId
      );
      const mergedHandles = existingHandles.concat(newHandles);
      updateEdges(nodeId, existingHandles, newHandles);
      return mergedHandles;
    });
  }
  const nodeClassName = (node) => node.type;

  const createNode = () => {
    const nextNodeId = (nodes.length + 1).toString();
    const newNode = createEditorNode(nextNodeId);
    setNodes((nodes) => nodes.concat(newNode));
  };

  const onConnectStart = useCallback((_, { nodeId, handleId }) => {
    connectingNodeId.current = nodeId;
    connectingHandleId.current = handleId;
  }, []);

  const handleSelectionDrag = (fromNode, fromHandle, event) => {};

  const handleFunctionDrag = (fromNode, fromHandle, event) => {
    //TODO:
    // create the new node with the removed text
    // update it to be exported
    // add an import to the existing node
    // if the function was exported, update the reference to the new node

    const targetIsPane = event.target.classList.contains('react-flow__pane');
    const groupNodeElement = event.target.closest('.react-flow__node-group');

    const currentText = fromNode.data.value;
    const startLine = fromHandle.loc.start.line;
    const endLine = fromHandle.loc.end.line;
    const { updatedText, extractedChunk } = removeTextChunk(
      currentText,
      startLine,
      endLine
    );

    if (targetIsPane) {
      const newNode = {
        id: (nodes.length + 1).toString(),
        data: {
          fileName: `./${fromHandle.name}.js`,
          value: 'export ' + extractedChunk,
          handles: [],
        },
        type: 'editor',
        position: screenToFlowPosition({
          x: event.clientX,
          y: event.clientY,
        }),
      };
      setNodes((nodes) => nodes.concat(newNode));
    } else if (!groupNodeElement && !targetIsPane) {
      //it landed on a real node
      const editorNodeElement = event.target.closest(
        '.react-flow__node-editor'
      );
      const targetNodeId = editorNodeElement.getAttribute('data-id');
      const targetNode = nodes.find((node) => node.id === targetNodeId);
      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });
      const line = Math.floor((position.y - targetNode.position.y) / 16);

      const newText = insertTextChunk(
        targetNode.data.value,
        extractedChunk,
        line
      );
      onTextChange(targetNode.id, newText);
    }

    onTextChange(fromNode.id, updatedText);
  };
  const onConnectEnd = useCallback(
    (event) => {
      const targetIsPane = event.target.classList.contains('react-flow__pane');
      const groupNodeElement = event.target.closest('.react-flow__node-group');

      let parentId = null;
      if (groupNodeElement) {
        parentId = groupNodeElement.getAttribute('data-id');
      }
      const fromNode = nodes.find(
        (node) => node.id === connectingNodeId.current
      );
      const fromHandle = fromNode?.data?.handles.find(
        (handle) => handle.id === connectingHandleId.current
      );
      if (fromHandle?.handleType === 'function') {
        return handleFunctionDrag(fromNode, fromHandle, event);
      }
      if (fromHandle?.handleType === 'selection') {
        return handleSelectionDrag(fromNode, fromHandle, event);
      }
      if (!targetIsPane && !groupNodeElement) {
        return;
      }

      const fileName = fromNode.data.fileName;

      const content = `import { ${fromHandle.name} } from '${fileName}';`;

      const id = (nodes.length + 1).toString();

      const handles = [];
      const newNode = {
        id,
        position: screenToFlowPosition({
          x: event.clientX,
          y: event.clientY,
        }),

        data: { fileName: `newFile-${id}.js`, value: content, handles },
        type: 'editor',
        origin: [0.5, 0.0],
        parentId: parentId || fromNode.parentId,
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [screenToFlowPosition, nodes, edges]
  );

  const onConnect = (connection) => {};

  const onNodeDragStop = (event, node) => {
    const intersections = getIntersectingNodes(node, false);
    const groupNode = intersections.find((n) => n.type === 'group');

    //if it landed on a group it isnt a child of
    if (groupNode && node.parentId !== groupNode.id) {
      setNodes((nodes) => {
        const newNodes = nodes
          .map((search) => {
            if (search.id === node.id) {
              search.parentId = groupNode.id;
              search.position.x = node.position.x - groupNode.position.x;
              search.position.y = node.position.y - groupNode.position.y;
            }
            return search;
          })
          // sort nodes by if they have a parentId or not
          .sort((a, b) => {
            if (a.parentId && !b.parentId) {
              return 1;
            }
            if (!a.parentId && b.parentId) {
              return -1;
            }
            return 0;
          });

        return newNodes;
      });
      // if it moved out of a group onto the canvas
    } else if (!groupNode && node.parentId) {
      const oldGroupNode = nodes.find(
        (searchNode) => searchNode.id === node.parentId
      );

      setNodes((nodes) => {
        const newNodes = nodes.map((search) => {
          if (search.id === node.id) {
            search.parentId = null;
            search.position.x = node.position.x + oldGroupNode.position.x;
            search.position.y = node.position.y + oldGroupNode.position.y;
          }
          return search;
        });
        return newNodes;
      });
    }
  };

  const [folderData, setFolderData] = useState([]);
  const onFolderSelected = (folderData) => {
    setFolderData(folderData);
  };

  const onoFileSelected = (fileId) => {
    window.electronAPI.invokeMain('load-file', fileId).then((response) => {
      console.log('Response from main:', response);
      // create a new node with the file contents
      const nextNodeId = (nodes.length + 1).toString();
      setNodes((nodes) => {
        const newNode = {
          id: nextNodeId,
          data: {
            fileName: fileId,
            value: response,
            handles: [],
          },
          type: 'editor',
          position: {
            x: 500,
            y: 500,
          },
        };
        console.log('New node:', newNode);

        //
        return nodes.concat(newNode);
      });
      updateNodeInternals(nextNodeId);
    });
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
        onConnectEnd={onConnectEnd}
        onConnectStart={onConnectStart}
        onConnect={onConnect}
        connectionMode="loose"
        onNodeDragStop={onNodeDragStop}
      >
        {/* <div className="updatenode__controls">
          <button onClick={createNode}> ➕ Add Node</button>
        </div> */}

        <Background />
        <Panel position="top-left">
          <FolderSelectButton onFolderSelected={onFolderSelected} />
          <BasicTree folderData={folderData} onFileSelected={onoFileSelected} />
        </Panel>

        <MiniMap zoomable pannable nodeClassName={nodeClassName} />
        <Controls />
      </ReactFlow>
    </>
  );
};
