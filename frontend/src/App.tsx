import React from 'react';
import { CodeInput } from './components/CodeInput';
import { AuditReport } from './components/AuditReport';
const App: React.FC = () => (<div style={{ display: 'flex', height: '100vh', fontFamily: 'sans-serif' }}>
  <CodeInput /><AuditReport /></div>);
export default App;
