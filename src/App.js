import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { authService } from './services/auth';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import Draft from './components/Draft';
import './App.css';

const queryClient = new QueryClient();

function PrivateRoute({ children }) {
  return authService.isAuthenticated() ? children : <Navigate to="/login" />;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <div className="App">
          <header className="App-header">
            <h1>Spreadsheet Golf Tour</h1>
          </header>
          
          <main>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route 
                path="/" 
                element={
                  <PrivateRoute>
                    <Dashboard />
                  </PrivateRoute>
                } 
              />
              <Route 
                path="/draft" 
                element={
                  <PrivateRoute>
                    <Draft />
                  </PrivateRoute>
                } 
              />
              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          </main>
        </div>
      </Router>
    </QueryClientProvider>
  );
}

export default App;
