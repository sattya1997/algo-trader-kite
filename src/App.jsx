import React from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import Login from './components/Login';
import Dashboard from './components/Dashboard';

function App() {
  return (
    <Router basename='/algo-trader-kite'>
      <Routes>
        <Route 
          path="/"
          element={<Navigate to="/dashboard" replace />}
        />
        <Route 
          path="/login" 
          element={<Login />}
        />
        <Route 
          path="/dashboard"
          element={<Dashboard />}
        />
        <Route 
          path="*"
          element={<Navigate to="/index.html" replace />}
        />
      </Routes>
    </Router>
  );
}

export default App;