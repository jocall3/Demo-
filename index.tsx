import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
// FIX: Import DataProvider to make the data context available to the App component.
import { DataProvider } from './context/DataContext';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    {/* FIX: The App component and its children consume data from DataContext, so it must be wrapped in DataProvider. */}
    <DataProvider>
      <App />
    </DataProvider>
  </React.StrictMode>
);