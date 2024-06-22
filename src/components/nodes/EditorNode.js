import React from 'react';
import { useCallback, useRef, useState, useEffect } from 'react';
import { Handle, Position, NodeToolbar } from 'reactflow';
import { loader } from '@monaco-editor/react';
import Editor from '@monaco-editor/react';
import * as monaco from 'monaco-editor';
import TextField from '@mui/material/TextField';

import { getDecorators } from '../editorUtils';

import { ThemeProvider, createTheme } from '@mui/material/styles';
loader.config({ monaco });

const darkTheme = createTheme({
  palette: {
    mode: 'dark',
  },
});

export const EditorNode = ({
  id,
  data,
  onTextChange,
  onFileNameChange,
  onSelectionChange,
}) => {
  const editorRef = useRef(null);
  const [decorations, setDecorations] = useState([]);

  const onChange = (value) => {
    onTextChange(id, value);
    addDecorators();
  };

  useEffect(() => {
    onTextChange(id, data.value);
  }, []);

  const checkIfTextIsSelected = () => {
    const editor = editorRef.current;
    const selection = editor.getSelection();
    if (selection.isEmpty()) {
      onSelectionChange(id, null);
    } else {
      onSelectionChange(id, selection);
    }
  };

  const addListeners = () => {
    const editor = editorRef.current;
    editor.onDidChangeCursorSelection((e) => {
      checkIfTextIsSelected();
    });
  };

  const addDecorators = () => {
    const editor = editorRef.current;
    const model = editor.getModel();
    const text = model.getValue();

    const newDecorations = getDecorators(text);

    const newDecorationIds = editor.deltaDecorations(
      decorations,
      newDecorations
    );
    setDecorations(newDecorationIds);
  };

  const renderedHandles = data?.handles?.map((handle) => (
    <Handle
      key={handle.id}
      type={handle.type}
      position={handle.position}
      id={handle.id}
      style={handle.style}
    />
  ));

  return (
    <>
      {renderedHandles}
      <div className="text-updater-node">
        <ThemeProvider theme={darkTheme}>
          <TextField
            size="small"
            variant="outlined"
            value={data.fileName}
            onChange={(event) => onFileNameChange(id, event.target.value)}
          />
        </ThemeProvider>
        <Editor
          className="nodrag"
          onChange={onChange}
          height="100%"
          width="100%"
          defaultLanguage="javascript"
          automaticLayout="true"
          value={data.value}
          options={{
            fontSize: 12,
            lineNumbersMinChars: 2,
            minimap: {
              enabled: false,
            },
          }}
          theme="vs-dark"
          onMount={(editor) => {
            editorRef.current = editor;
            addDecorators();
            addListeners();
          }}
        />
      </div>
    </>
  );
};